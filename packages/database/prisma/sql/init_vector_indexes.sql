-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Production HNSW Approximate Nearest Neighbors index for Google Gemini 768d embeddings
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for high-performance PostgreSQL full-text search (tsvector)
CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv 
ON document_chunks 
USING gin (tsv);

-- Multi-tenant B-Tree composite indexes for fast tenant-scoped retrieval
CREATE INDEX IF NOT EXISTS idx_chunks_org_doc 
ON document_chunks ("organizationId", "documentId");

CREATE INDEX IF NOT EXISTS idx_query_logs_org_created 
ON query_logs ("organizationId", "createdAt" DESC);
