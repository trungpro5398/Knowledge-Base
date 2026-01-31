# Cấu hình Auth - Giới hạn đăng ký @tet-edu.com

## Supabase Auth Hook (Backend)

Sau khi chạy migrations, cần bật hook trong Supabase Dashboard:

1. Vào https://supabase.com/dashboard/project/bjflzirgdqqkelfxddhy/auth/hooks
2. **Before user created** → Enable
3. Chọn **Call a Postgres function**
4. Function: `public.hook_restrict_signup_tet_edu`
5. Save

Hook này chặn đăng ký nếu email không phải @tet-edu.com.

## Email confirmation (tạm thời: tắt / auto-confirm)

Để đăng ký xong đăng nhập được ngay (không cần bấm link trong email):

1. **Cách 1 (code):** Migration `20240101000018_auto_confirm_email.sql` tạo trigger tự gán `email_confirmed_at` khi user mới tạo. Chạy migration; nếu báo lỗi quyền trên `auth.users` thì dùng cách 2.
2. **Cách 2 (Dashboard):** Supabase → Authentication → Providers → Email → **tắt** "Confirm email".

Route `/callback` đã được sửa để ghi cookie session sau khi đổi code (magic link / OAuth), nên sau khi bấm link xác nhận (nếu vẫn bật) đăng nhập cũng sẽ giữ session.
