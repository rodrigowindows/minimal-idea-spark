-- Migration: Create RPC functions
-- Description: Database functions for semantic search and analytics

-- Function: Search opportunities by semantic similarity
CREATE OR REPLACE FUNCTION search_opportunities(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  status text,
  priority int,
  strategic_value int,
  similarity float
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.description,
    o.type,
    o.status,
    o.priority,
    o.strategic_value,
    1 - (o.embedding <=> query_embedding) AS similarity
  FROM opportunities o
  WHERE o.user_id = p_user_id
    AND o.embedding IS NOT NULL
    AND 1 - (o.embedding <=> query_embedding) > match_threshold
  ORDER BY o.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Search daily logs by semantic similarity
CREATE OR REPLACE FUNCTION search_daily_logs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  content text,
  mood text,
  energy_level int,
  log_date date,
  similarity float
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.mood,
    d.energy_level,
    d.log_date,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM daily_logs d
  WHERE d.user_id = p_user_id
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Search knowledge base by semantic similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  source_title text,
  content_chunk text,
  similarity float
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.source_title,
    k.content_chunk,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_base k
  WHERE k.user_id = p_user_id
    AND k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Get domain energy distribution
CREATE OR REPLACE FUNCTION get_domain_energy_distribution(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  domain_id uuid,
  domain_name text,
  domain_color text,
  opportunity_count bigint,
  total_strategic_value bigint
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS domain_id,
    d.name AS domain_name,
    d.color_theme AS domain_color,
    COUNT(o.id) AS opportunity_count,
    COALESCE(SUM(o.strategic_value), 0) AS total_strategic_value
  FROM life_domains d
  LEFT JOIN opportunities o ON o.domain_id = d.id AND o.status != 'done'
  WHERE d.user_id = p_user_id
  GROUP BY d.id, d.name, d.color_theme
  ORDER BY opportunity_count DESC;
END;
$$;

-- Function: Get top priority opportunity (The One Thing)
CREATE OR REPLACE FUNCTION get_top_priority_opportunity(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  status text,
  priority int,
  strategic_value int,
  domain_id uuid,
  domain_name text,
  domain_color text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.description,
    o.type,
    o.status,
    o.priority,
    o.strategic_value,
    d.id AS domain_id,
    d.name AS domain_name,
    d.color_theme AS domain_color
  FROM opportunities o
  LEFT JOIN life_domains d ON o.domain_id = d.id
  WHERE o.user_id = p_user_id
    AND o.status IN ('backlog', 'doing')
  ORDER BY o.strategic_value DESC NULLS LAST, o.priority DESC
  LIMIT 1;
END;
$$;

-- Function: Get radar opportunities (high priority, not recently touched)
CREATE OR REPLACE FUNCTION get_radar_opportunities(
  p_user_id uuid DEFAULT auth.uid(),
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  status text,
  priority int,
  strategic_value int,
  domain_id uuid,
  domain_name text,
  domain_color text,
  days_stale int
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.description,
    o.type,
    o.status,
    o.priority,
    o.strategic_value,
    d.id AS domain_id,
    d.name AS domain_name,
    d.color_theme AS domain_color,
    EXTRACT(DAY FROM NOW() - o.updated_at)::int AS days_stale
  FROM opportunities o
  LEFT JOIN life_domains d ON o.domain_id = d.id
  WHERE o.user_id = p_user_id
    AND o.status = 'backlog'
    AND o.priority >= 6
  ORDER BY o.updated_at ASC
  LIMIT p_limit;
END;
$$;
