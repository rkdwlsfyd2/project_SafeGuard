'''
    rag/ingest.py
    : 법령 PDF를 임베딩하여 Milvus(Vector DB)에 저장하는 스크립트
    ※ 이 파일은 최초 1회(또는 데이터 갱신 시)에만 실행

    [처리 대상]
    - rag_data/*.pdf (법령·시행령·시행규칙 PDF)

    [동작 요약]
    - ../rag_data/*.pdf 읽기
    - 텍스트 분할 (청킹)
    - 임베딩 생성
    - Milvus insert (저장)

    *** 청킹은 get_collection 함수 밖에서 PDF를 읽은 직후 Milvus에 저장하기 직전에 수행
'''
import os
import pdfplumber
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from pymilvus import (
    connections,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
    utility
)

# Configuration
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = "19530"
COLLECTION_NAME = "law_rag"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2" 
DIMENSION = 384 

def get_collection(drop_if_exists=False):
    """
    Milvus 컬렉션을 가져오거나 새로 생성합니다.

    Args:
        drop_if_exists (bool): True일 경우 기존 컬렉션을 삭제하고 새로 생성합니다.

    Returns:
        Collection: Milvus 컬렉션 객체
    """
    connections.connect(host=MILVUS_HOST, port=MILVUS_PORT)

    if utility.has_collection(COLLECTION_NAME):
        if drop_if_exists:
            print(f"Collection {COLLECTION_NAME} exists. Dropping for fresh ingestion...")
            utility.drop_collection(COLLECTION_NAME)
        else:
            return Collection(COLLECTION_NAME)

    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=DIMENSION),
        FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="source", dtype=DataType.VARCHAR, max_length=512),
    ]

    schema = CollectionSchema(fields, description="Law RAG Collection")
    collection = Collection(name=COLLECTION_NAME, schema=schema)

    collection.create_index(
        field_name="embedding",
        index_params={
            "index_type": "IVF_FLAT",
            "metric_type": "COSINE",
            "params": {"nlist": 128}
        }
    )
    return collection

def ingest_pdfs():
    """
    PDF 문서를 읽어 텍스트를 추출하고, 임베딩 및 BM25 인덱스를 생성하여 저장합니다.
    1. PDF 텍스트 추출 및 청킹
    2. SentenceTransformer를 이용한 벡터 임베딩 생성
    3. Kiwi 형태소 분석기를 이용한 BM25 인덱스 생성 및 저장
    4. Milvus DB에 벡터 및 메타데이터 적재
    """
    # Paths
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
            
            # Chunking
            for i in range(0, len(text_content), chunk_size - overlap):
                chunk = text_content[i:i+chunk_size]
                if len(chunk) > 50:
                    data_texts.append(chunk)
                    data_sources.append(filename)
                    
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if not data_texts:
        print("No text data found.")
        return

    print(f"Total chunks: {len(data_texts)}")

    # 2. BM25 인덱스 생성 및 저장 (메모리 최적화를 위해 먼저 수행 후 객체 해제)
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

        bm25 = BM25Okapi(tokenized_corpus)
        
        data_to_save = {
            "bm25": bm25,
            "texts": data_texts,
            "sources": data_sources
        }
        
        bm25_path = os.path.join(rag_data_dir, "bm25_index.pkl")
        with open(bm25_path, "wb") as f:
            pickle.dump(data_to_save, f)
        print(f"BM25 index saved to {bm25_path}")
        
        # 메모리 해제
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
    collection = get_collection(drop_if_exists=True)
    
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
