-- Migration: Create unified match_documents function for RAG
-- Description: A single function that searches across opportunities, daily_logs,
--              and knowledge_base using cosine similarity on embeddings.

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Unified RAG search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_type text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    -- Search opportunities
    SELECT
      o.id,
      o.title,
      COALESCE(o.description, '') AS content,
      'opportunity'::text AS source_type,
      jsonb_build_object(
        'type', o.type,
        'status', o.status,
        'priority', o.priority,
        'strategic_value', o.strategic_value
      ) AS metadata,
      1 - (o.embedding <=> query_embedding) AS similarity
    FROM opportunities o
    WHERE o.user_id = p_user_id
      AND o.embedding IS NOT NULL
      AND 1 - (o.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Search daily logs
    SELECT
      d.id,
      ('Journal: ' || d.log_date::text)::text AS title,
      d.content,
      'journal'::text AS source_type,
      jsonb_build_object(
        'mood', d.mood,
        'energy_level', d.energy_level,
        'log_date', d.log_date
      ) AS metadata,
      1 - (d.embedding <=> query_embedding) AS similarity
    FROM daily_logs d
    WHERE d.user_id = p_user_id
      AND d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold

    UNION ALL

    -- Search knowledge base
    SELECT
      k.id,
      COALESCE(k.source_title, 'Knowledge Note')::text AS title,
      COALESCE(k.content_chunk, '')::text AS content,
      'knowledge'::text AS source_type,
      jsonb_build_object(
        'source_title', k.source_title
      ) AS metadata,
      1 - (k.embedding <=> query_embedding) AS similarity
    FROM knowledge_base k
    WHERE k.user_id = p_user_id
      AND k.embedding IS NOT NULL
      AND 1 - (k.embedding <=> query_embedding) > match_threshold
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
