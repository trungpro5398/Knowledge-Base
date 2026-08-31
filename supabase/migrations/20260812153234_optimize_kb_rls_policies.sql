-- Supabase/Postgres can evaluate auth.uid() once per statement when it is
-- wrapped in a scalar subquery, instead of re-running it for every candidate
-- row in every RLS policy.
DO $$
DECLARE
  policy_row record;
  optimized_using text;
  optimized_check text;
  alter_sql text;
BEGIN
  FOR policy_row IN
    SELECT
      policy.policyname,
      policy.schemaname,
      policy.tablename,
      policy.qual,
      policy.with_check
    FROM pg_policies AS policy
    WHERE policy.schemaname = 'tet_kb'
      AND (
        COALESCE(policy.qual, '') LIKE '%auth.uid()%'
        OR COALESCE(policy.with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    optimized_using := replace(
      policy_row.qual,
      'auth.uid()',
      '(SELECT auth.uid())'
    );
    optimized_check := replace(
      policy_row.with_check,
      'auth.uid()',
      '(SELECT auth.uid())'
    );

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

    IF optimized_using IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', optimized_using);
    END IF;
    IF optimized_check IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', optimized_check);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END;
$$;

-- Each ALL policy already has the same SELECT condition as the corresponding
-- SELECT-only policy. Keeping both makes PostgreSQL evaluate both permissive
-- policies on every read without changing the result.
DROP POLICY IF EXISTS spaces_select ON tet_kb.spaces;
DROP POLICY IF EXISTS page_labels_select ON tet_kb.page_labels;
DROP POLICY IF EXISTS page_label_mappings_select ON tet_kb.page_label_mappings;
DROP POLICY IF EXISTS page_templates_select ON tet_kb.page_templates;
