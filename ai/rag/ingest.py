"""
rag/ingest.py
: 법령 데이터 임베딩 및 적재 스크립트

[역할]
- PDF 형태의 법령 데이터를 추출하여 처리 가능한 텍스트로 변환
- 벡터 임베딩(SentenceTransformer) 및 키워드 인덱스(BM25) 생성
- Milvus(Vector DB) 및 로컬 스토리지에 데이터 저장

[주요 기능]
- ingest_pdfs: 전체 파이프라인(PDF 읽기 -> 청킹 -> 임베딩 -> 저장) 실행
- PDF 텍스트 추출 및 청킹 (500자 단위, overlap 100자)
- BM25 역색인 파일 생성 (bm25_index.pkl)
- Milvus 컬렉션 초기화 및 벡터 데이터 삽입

[시스템 흐름]
1. `rag_data` 폴더에서 PDF 파일 목록 로드
2. 텍스트 추출 및 Chunking (분할)
3. BM25 인덱스 빌드 및 pickle 로컬 저장 (키워드 검색용)
4. 임베딩 모델 로드 및 벡터 생성 (의미 기반 검색용)
5. Milvus DB 접속 -> 기존 데이터 삭제(초기화) -> 새 데이터 적재

[파일의 핵심목적]
- RAG 시스템 구동의 핵심 데이터(Knowledge Base)를 구축하는 '초기화(Initialization) 스크립트'
- ※ 서버 실행 전 반드시 1회 실행되어야 함
"""

import os
import pdfplumber
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from milvus_client import get_collection

# 사용할 임베딩 모델 (다국어 지원 MiniLM)
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2" 

def ingest_pdfs():
    """
    PDF 문서를 처리하여 검색 가능한 형태로 변환 및 저장합니다. (동기화 로직 없음, 전체 재구축)
    """
    # 데이터 디렉토리 경로 설정
    base_dir = os.path.dirname(os.path.abspath(__file__))
    rag_data_dir = os.path.join(base_dir, 'rag_data')
    
    print(f"Loading PDFs from {rag_data_dir}...")
    if not os.path.exists(rag_data_dir):
        print(f"Directory {rag_data_dir} not found.")
        return

    # 1. PDF 텍스트 로드 및 청킹
    chunk_size = 500
    overlap = 100
    
    data_texts = []
    data_sources = []
    
    files = [f for f in os.listdir(rag_data_dir) if f.endswith(".pdf")]
    
    for filename in tqdm(files, desc="Reading PDFs"):
        file_path = os.path.join(rag_data_dir, filename)
        text_content = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text_content += extracted + "\n"
            
            # Chunking (텍스트 분할)
            for i in range(0, len(text_content), chunk_size - overlap):
                chunk = text_content[i:i+chunk_size]
                if len(chunk) > 50: # 너무 짧은 청크는 제외
                    data_texts.append(chunk)
                    data_sources.append(filename)
                    
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if not data_texts:
        print("No text data found.")
        return

    print(f"Total chunks: {len(data_texts)}")

    # 2. BM25 인덱스 생성 및 저장 (메모리 최적화를 위해 먼저 수행 후 객체 해제)
    # RAG 검색 시 키워드 매칭(BM25)을 위해 별도 인덱스 파일 생성
    print("Building BM25 index...")
    try:
        from kiwipiepy import Kiwi
        from rank_bm25 import BM25Okapi
        import pickle
        import gc

        kiwi = Kiwi()
        tokenized_corpus = []
        for text in tqdm(data_texts, desc="Tokenizing for BM25"):
            tokens = [token.form for token in kiwi.tokenize(text)]
            tokenized_corpus.append(tokens)

        # BM25 인덱스 생성
        bm25 = BM25Okapi(tokenized_corpus)
        
        data_to_save = {
            "bm25": bm25,
            "texts": data_texts,
            "sources": data_sources
        }
        
        # 파일로 저장 (서버 런타임에서 로드하여 사용)
        bm25_path = os.path.join(rag_data_dir, "bm25_index.pkl")
        with open(bm25_path, "wb") as f:
            pickle.dump(data_to_save, f)
        print(f"BM25 index saved to {bm25_path}")
        
        # 메모리 정리
        del kiwi
        del bm25
        del tokenized_corpus
        del data_to_save
        gc.collect()
            
    except ImportError:
        print("Warning: kiwipiepy or rank_bm25 not installed. Skipping BM25 indexing.")
    except Exception as e:
        print(f"Error building BM25 index: {e}")

    # 3. 임베딩 생성 및 Milvus 적재
    print(f"Loading model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    
    print(f"Generating embeddings for {len(data_texts)} chunks...")
    embeddings = model.encode(data_texts, batch_size=32, show_progress_bar=True)

    # Insert into Milvus
    collection = get_collection(drop_old=True) # 기존 데이터 삭제 후 재생성
    
    print("Inserting data into Milvus...")
    insert_data = [
        embeddings,
        data_texts,
        data_sources
    ]
    collection.insert(insert_data)
    
    collection.flush()
    print(f"Successfully inserted {collection.num_entities} entities.")
    collection.load()

if __name__ == "__main__":
    ingest_pdfs()