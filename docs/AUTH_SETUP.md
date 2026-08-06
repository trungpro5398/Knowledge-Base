# Cấu hình Auth - Google Workspace @tet-edu.com

## Google Workspace SSO

Ứng dụng dùng Supabase Auth với Google OAuth. Người dùng không còn đăng ký bằng
mật khẩu riêng; nút đăng nhập sẽ chuyển sang Google Workspace và chỉ chấp nhận
email đúng domain `@tet-edu.com`.

Trong Supabase Dashboard:

1. Vào **Authentication → Providers → Google** và bật Google.
2. Tạo OAuth Client ID loại **Web application** trong Google Cloud Console.
3. Thêm Client ID/Secret vào Supabase.
4. Thêm callback URL của Supabase vào Google Cloud OAuth client. URL có dạng:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Trong **Authentication → URL Configuration**, thêm các URL callback của app:
   - local: `http://localhost:3000/callback`
   - production: `https://<domain-production>/callback`
6. Vào **Authentication → Providers → Email** và tắt Email provider để không
   cho đăng nhập/đăng ký bằng mật khẩu riêng.

Migrations `20260806000003_google_workspace_admins.sql` và
`20260806000004_isolate_tet_crm_schema.sql` tự động cấp organization
admin và space admin cho `lap.le@tet-edu.com`, `trung.nguyen@tet-edu.com`, và
`admin@tet-edu.com` khi tài khoản Google đăng nhập lần đầu; đồng thời backfill
nếu các tài khoản đã tồn tại. Các bảng của app nằm
trong schema `tet_kb`, không dùng chung các bảng nghiệp vụ đang có trong
`public` của project Tech5.

## Supabase Auth Hook (Backend)

Sau khi chạy migrations, cần bật hook trong Supabase Dashboard:

1. Vào **Authentication → Hooks** trong đúng project `Tech5 / tet-crm`; các bảng Knowledge Base vẫn nằm riêng trong schema `tet_kb`.
2. **Before user created** → Enable
3. Chọn **Call a Postgres function**
4. Function: `public.hook_restrict_signup_tet_edu`
5. Save

Hook này chặn tạo user nếu email không phải @tet-edu.com. Callback của app cũng
kiểm tra lại sau khi Google trả user về.

## Email confirmation

Google Workspace OAuth trả về email đã được Google xác thực nên không cần email
confirmation riêng. Migration `20240101000018_auto_confirm_email.sql` chỉ còn
phục vụ luồng email/password cũ và không cần cho luồng Google SSO.

Route `/callback` đã được sửa để ghi cookie session sau khi đổi code (magic link / OAuth), nên sau khi bấm link xác nhận (nếu vẫn bật) đăng nhập cũng sẽ giữ session.
