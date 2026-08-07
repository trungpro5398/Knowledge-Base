-- The KB API runs on Vercel serverless functions, where outbound IPv6/TCP
-- connections to Supabase are not available on the free project setup.
-- Keep the API server-side and expose only the small, service-role-only bridge
-- it needs. The API itself still supplies the SQL and always uses tet_kb.

CREATE OR REPLACE FUNCTION tet_kb.api_param(p_params jsonb, p_index integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, tet_kb, pg_temp
AS $$
DECLARE
  value jsonb := p_params -> p_index;
BEGIN
  IF value IS NULL OR value = 'null'::jsonb THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(value) = 'array' THEN
    RETURN COALESCE(
      (SELECT array_agg(item ORDER BY ordinal)::text
       FROM jsonb_array_elements_text(value) WITH ORDINALITY AS elements(item, ordinal)),
      '{}'
    );
  END IF;

  RETURN value #>> '{}';
END;
$$;

CREATE OR REPLACE FUNCTION tet_kb.api_exec(p_sql text, p_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  normalized text := btrim(p_sql);
  result_rows jsonb := '[]'::jsonb;
  affected_rows bigint := 0;
  returned_row record;
  p0 text := tet_kb.api_param(p_params, 0);
  p1 text := tet_kb.api_param(p_params, 1);
  p2 text := tet_kb.api_param(p_params, 2);
  p3 text := tet_kb.api_param(p_params, 3);
  p4 text := tet_kb.api_param(p_params, 4);
  p5 text := tet_kb.api_param(p_params, 5);
  p6 text := tet_kb.api_param(p_params, 6);
  p7 text := tet_kb.api_param(p_params, 7);
  p8 text := tet_kb.api_param(p_params, 8);
  p9 text := tet_kb.api_param(p_params, 9);
  p10 text := tet_kb.api_param(p_params, 10);
  p11 text := tet_kb.api_param(p_params, 11);
BEGIN
  IF normalized = ''
     OR length(normalized) > 20000
     OR normalized ~ ';'
     OR normalized ~* '^(drop|alter|create|grant|revoke|truncate|vacuum|analyze|copy|do|call|set|reset|listen|notify)([[:space:]]|$)'
     OR jsonb_typeof(p_params) <> 'array'
     OR jsonb_array_length(p_params) > 12 THEN
    RAISE EXCEPTION 'Query is not allowed';
  END IF;

  IF normalized ~* '^select([[:space:]]|$)'
     OR (normalized ~* '^with([[:space:]]|$)'
         AND normalized !~* '(^|[[:space:]])(insert|update|delete)([[:space:]]|$)')
     OR normalized ~* '(^|[[:space:]])returning([[:space:]]|$)' THEN
    FOR returned_row IN EXECUTE normalized USING p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11 LOOP
      result_rows := result_rows || jsonb_build_array(to_jsonb(returned_row));
    END LOOP;
    affected_rows := jsonb_array_length(result_rows);
  ELSIF normalized ~* '^(insert|update|delete)([[:space:]]|$)'
     OR (normalized ~* '^with([[:space:]]|$)'
         AND normalized ~* '(^|[[:space:]])(insert|update|delete)([[:space:]]|$)') THEN
    EXECUTE normalized USING p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Only SELECT, INSERT, UPDATE, and DELETE are allowed';
  END IF;

  RETURN jsonb_build_object('rows', result_rows, 'rowCount', affected_rows);
END;
$$;

CREATE OR REPLACE FUNCTION tet_kb.api_exec_batch(p_queries jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tet_kb, auth, pg_catalog, pg_temp
AS $$
DECLARE
  query_item jsonb;
  results jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_queries) <> 'array' OR jsonb_array_length(p_queries) > 100 THEN
    RAISE EXCEPTION 'Invalid query batch';
  END IF;

  FOR query_item IN SELECT value FROM jsonb_array_elements(p_queries) LOOP
    results := results || jsonb_build_array(
      tet_kb.api_exec(query_item ->> 'sql', COALESCE(query_item -> 'params', '[]'::jsonb))
    );
  END LOOP;

  RETURN results;
END;
$$;

REVOKE ALL ON FUNCTION tet_kb.api_param(jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION tet_kb.api_exec(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tet_kb.api_exec_batch(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tet_kb.api_exec(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION tet_kb.api_exec_batch(jsonb) TO service_role;
