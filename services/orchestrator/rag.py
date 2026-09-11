import logging
from typing import List, Dict, Any
from config import settings
from llm_factory import get_embeddings

logger = logging.getLogger("rag")

COLLECTION_NAME = "syslog_embeddings"

DEFAULT_MOCK_LOGS = [
    {"id": 1, "log": "2026-09-11 10:12:01 [CRITICAL] Redis container stopped unexpectedly or connection refused on localhost:6379. Pulse metrics missing."},
    {"id": 2, "log": "2026-09-11 10:12:15 [WARN] VRAM utilization spiked above 92.4% threshold. GPU core throttling active on CUDA unit 0."},
    {"id": 3, "log": "2026-09-11 10:13:00 [ERROR] Kafka consumer group aethernet-consumer-group rebalance failed. Broker localhost:9092 lag accumulating."},
    {"id": 4, "log": "2026-09-11 10:14:22 [INFO] Ollama worker process memory leak detected in llama3.1:8b context buffer. Flush VRAM cache recommended."},
    {"id": 5, "log": "2026-09-11 10:15:10 [CRITICAL] Postgres batch insert timeout on table system_metrics. Connection pool exhausted."},
]

class RAGEngine:
    def __init__(self):
        self.embeddings = get_embeddings()
        self.qdrant_client = None
        self.connected = False
        self._init_qdrant()

    def _init_qdrant(self):
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.models import Distance, VectorParams
            
            self.qdrant_client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=3.0)
            
            # Test connection
            collections = [c.name for c in self.qdrant_client.get_collections().collections]
            if COLLECTION_NAME not in collections:
                self.qdrant_client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
                )
                logger.info(f"Created Qdrant collection '{COLLECTION_NAME}'")
                self._seed_default_logs()
            
            self.connected = True
            logger.info("Connected to Qdrant vector database.")
        except Exception as e:
            logger.warning(f"Qdrant vector database not available at {settings.qdrant_host}:{settings.qdrant_port}: {e}. Using in-memory log RAG fallback.")
            self.connected = False

    def _seed_default_logs(self):
        if not self.connected or not self.qdrant_client:
            return
        
        from qdrant_client.http.models import PointStruct
        points = []
        for item in DEFAULT_MOCK_LOGS:
            vector = self.embeddings.embed_query(item["log"])
            # Ensure 384 dim size
            if len(vector) != 384:
                vector = (vector + [0.0]*384)[:384]
            points.append(PointStruct(id=item["id"], vector=vector, payload={"log": item["log"]}))
        
        self.qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        logger.info(f"Seeded {len(points)} logs into Qdrant vector index.")

    def search_logs(self, query: str, limit: int = 3) -> List[str]:
        """Queries Qdrant for matching error log context."""
        if self.connected and self.qdrant_client:
            try:
                query_vector = self.embeddings.embed_query(query)
                if len(query_vector) != 384:
                    query_vector = (query_vector + [0.0]*384)[:384]
                
                results = self.qdrant_client.search(
                    collection_name=COLLECTION_NAME,
                    query_vector=query_vector,
                    limit=limit
                )
                matched = [hit.payload["log"] for hit in results if hit.payload and "log" in hit.payload]
                if matched:
                    return matched
            except Exception as e:
                logger.error(f"Error searching Qdrant: {e}")
        
        # In-memory fallback keyword match
        query_lower = query.lower()
        results = []
        for item in DEFAULT_MOCK_LOGS:
            if any(term in item["log"].lower() for term in query_lower.split()):
                results.append(item["log"])
        
        if not results:
            results = [item["log"] for item in DEFAULT_MOCK_LOGS[:limit]]
        
        return results[:limit]

rag_engine = RAGEngine()
