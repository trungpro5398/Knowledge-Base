-- Tạm thời: tự động xác nhận email khi user mới đăng ký để đăng nhập được ngay (không cần bấm link trong email).
-- Cần quyền trên auth schema. Nếu migration báo lỗi, tắt "Confirm email" trong Supabase Dashboard → Auth → Providers → Email.

CREATE OR REPLACE FUNCTION public.trigger_auto_confirm_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger trên auth.users (chạy với quyền owner của DB)
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_confirm_email();
