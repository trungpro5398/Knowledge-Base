-- Auth hook: chỉ cho phép đăng ký với email @tet-edu.com
-- Cấu hình trong Supabase Dashboard: Authentication → Hooks → Before user created
-- Chọn "Call a Postgres function" → hook_restrict_signup_tet_edu

CREATE OR REPLACE FUNCTION public.hook_restrict_signup_tet_edu(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  allowed_domain text := 'tet-edu.com';
BEGIN
  user_email := event->'user'->>'email';
  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email is required',
        'http_code', 400
      )
    );
  END IF;

  IF lower(split_part(user_email, '@', 2)) != lower(allowed_domain) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Chỉ cho phép đăng ký bằng email @tet-edu.com',
        'http_code', 403
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hook_restrict_signup_tet_edu TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup_tet_edu FROM authenticated, anon, public;
