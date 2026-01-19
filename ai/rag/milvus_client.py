"""
rag/milvus_client.py
: Milvus(Vector DB) 연결 및 컬렉션 관리 전용 모듈

※ 본 파일은 데이터 적재(ingest)나 질의(query)를 수행하지 않는다.
※ Milvus 연결 및 law_rag 컬렉션 생성/로드 역할만 담당한다.

[역할]
- Milvus 서버 연결 관리
- 'law_rag' 컬렉션의 스키마 정의 및 생성
- 인덱스(Vector Index) 생성 및 로드(Load)

[주요 기능]
- connect_milvus: Milvus 서버(19530 포트) 연결
- create_collection: 스키마 정의(ID, Embedding, Text, Source) 및 컬렉션 생성
- get_collection: 컬렉션 객체 반환 (없으면 생성, drop_old=True 시 재생성)

[시스템 흐름]
1. Milvus 서버 연결 시도 (pymilvus)
2. 컬렉션 존재 여부 확인
3. (필요 시) 컬렉션 생성 -> 스키마 정의 -> 벡터 인덱스(IVF_FLAT) 빌드
4. 메모리 로드 (검색 준비)

[파일의 핵심목적]
- DB 연결 및 스키마 관리 로직을 분리하여 `ingest.py`와 `query.py`에서 중복 코드 제거
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

# 반드시 임베딩 모델 차원과 일치해야 함 (MiniLM-L12-v2: 384)
EMBEDDING_DIM = 384


def connect_milvus():
    """
    Milvus 벡터 데이터베이스 서버에 연결합니다.
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
    """

    # 스키마 필드 정의
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


def get_collection(load: bool = True, drop_old: bool = False) -> Collection:
    """
    'law_rag' 컬렉션 객체를 가져옵니다.
    없으면 생성하고, drop_old=True일 경우 삭제 후 재생성합니다.
    """
    connect_milvus()

    if utility.has_collection(COLLECTION_NAME):
        if drop_old:
            print(f"Collection {COLLECTION_NAME} exists. Dropping for fresh ingestion...")
            utility.drop_collection(COLLECTION_NAME)
            collection = create_collection()
        else:
            collection = Collection(COLLECTION_NAME)
    else:
        collection = create_collection()

    if load:
        collection.load()

    return collection