"""
rag/milvus_client.py
: Milvus(Vector DB) 연결 및 컬렉션 관리 전용 모듈

※ 본 파일은 데이터 적재(ingest)나 질의(query)를 수행하지 않는다.
※ Milvus 연결 및 law_rag 컬렉션 생성/로드 역할만 담당한다.

[역할]
- Milvus 서버 연결
- law_rag 컬렉션 존재 여부 확인
- 컬렉션 생성 및 인덱스 설정
- 다른 모듈(ingest.py, query.py)에서 재사용

[사용 위치]
- rag/ingest.py  → 데이터 적재 시 컬렉션 획득
- rag/query.py   → 검색 시 컬렉션 획득

[비고]
- Python 실행 환경은 WSL
- Milvus 서버는 Docker 컨테이너(localhost:19530)
"""

from pymilvus import (
    connections,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
    utility
)

import os

# ==============================
# Milvus 기본 설정
# ==============================
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = "19530"

COLLECTION_NAME = "law_rag"

# 반드시 임베딩 모델 차원과 일치해야 함
EMBEDDING_DIM = 768


def connect_milvus():
    """
    Milvus 벡터 데이터베이스 서버에 연결합니다.
    이미 연결되어 있는 경우 별도의 동작을 수행하지 않습니다.
    """
    connections.connect(
        alias="default",
        host=MILVUS_HOST,
        port=MILVUS_PORT
    )


def create_collection():
    """
    'law_rag' 컬렉션을 새로 생성합니다.
    기존 스키마(ID, 임베딩, 텍스트, 출처)를 정의하고 인덱스를 생성합니다.
    
    Returns:
        Collection: 생성된 Milvus 컬렉션 객체
    """

    fields = [
        FieldSchema(
            name="id",
            dtype=DataType.INT64,
            is_primary=True,
            auto_id=True
        ),
        FieldSchema(
            name="embedding",
            dtype=DataType.FLOAT_VECTOR,
            dim=EMBEDDING_DIM
        ),
        FieldSchema(
            name="text",
            dtype=DataType.VARCHAR,
            max_length=65535
        ),
        FieldSchema(
            name="source",
            dtype=DataType.VARCHAR,
            max_length=512
        ),
    ]

    schema = CollectionSchema(
        fields=fields,
        description="Law RAG Collection"
    )

    collection = Collection(
        name=COLLECTION_NAME,
        schema=schema
    )

    # 벡터 검색용 인덱스 생성
    collection.create_index(
        field_name="embedding",
        index_params={
            "index_type": "IVF_FLAT",
            "metric_type": "COSINE",
            "params": {"nlist": 128}
        }
    )

    return collection


def get_collection(load: bool = True) -> Collection:
    """
    'law_rag' 컬렉션 객체를 가져옵니다.
    컬렉션이 없으면 새로 생성하고, 있으면 로드합니다.

    Args:
        load (bool): 검색을 위해 컬렉션을 메모리에 로드할지 여부 (기본값: True)

    Returns:
        Collection: Milvus 컬렉션 객체
    """
    connect_milvus()

    if utility.has_collection(COLLECTION_NAME):
        collection = Collection(COLLECTION_NAME)
    else:
        collection = create_collection()

    if load:
        collection.load()

    return collection
