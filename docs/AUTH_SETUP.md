# Cấu hình Auth - Giới hạn đăng ký @tet-edu.com

## Supabase Auth Hook (Backend)

Sau khi chạy migrations, cần bật hook trong Supabase Dashboard:

1. Vào https://supabase.com/dashboard/project/bjflzirgdqqkelfxddhy/auth/hooks
2. **Before user created** → Enable
3. Chọn **Call a Postgres function**
4. Function: `public.hook_restrict_signup_tet_edu`
5. Save

Hook này chặn đăng ký nếu email không phải @tet-edu.com.

## Email confirmation

Trong Supabase → Authentication → Providers → Email:
- Bật **Confirm email** nếu muốn user xác nhận qua link trước khi đăng nhập
- Tắt nếu muốn đăng nhập ngay sau đăng ký
