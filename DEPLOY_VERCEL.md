# Deploy Knowledge Base lên Vercel

Project hiện tại: `techfives-projects/knowledge-base-web`, source
`tetedu123x/knowledge-base-web`, production URL:
`https://knowledge-base-web-xi.vercel.app`.

## 1. Đăng nhập Vercel (lần đầu)

```bash
npx vercel login
```

Mở link trong trình duyệt để xác thực.

## 2. Root Directory (bắt buộc cho monorepo)

Vào https://vercel.com/techfives-projects/knowledge-base-web/settings

- **Root Directory:** đặt `apps/web` (chọn "Edit" → nhập `apps/web` → Save)
- Không đặt Root Directory sẽ gây lỗi "No Next.js version detected"

## 3. Cấu hình env (Vercel Dashboard)

Sau khi tạo project, thêm Environment Variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL của shared Supabase project `tet-crm` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key của shared project `tet-crm` | Production, Preview |
| `NEXT_PUBLIC_API_URL` | Vercel API URL (sau khi tạo project `knowledge-base-api`) | Production, Preview |

## 4. Deploy

### Cách 1: Vercel Dashboard (khuyến nghị)

1. Vào https://vercel.com/new
2. Import repo GitHub `tetedu123x/knowledge-base-web`
3. **Project Name:** `knowledge-base-web`
4. **Root Directory:** `apps/web`
5. **Framework Preset:** Next.js (tự nhận)
6. **Build Command:** `pnpm build --filter web` (chạy từ repo root)
7. **Install Command:** `pnpm install`
8. Thêm env vars như bảng trên
9. Deploy

### Cách 2: Vercel CLI

```bash
cd /path/to/Knowledge-Base

# Link đúng project/team hiện tại
npx vercel link --yes --project knowledge-base-web --scope techfives-projects

# Set env
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel env add NEXT_PUBLIC_API_URL production

# Deploy production
npx vercel deploy --prod
```

## 5. Tạo API project trên Vercel

Tạo project thứ hai từ cùng repository `tetedu123x/knowledge-base-web`:

* Project name: `knowledge-base-api`
* Root Directory: `apps/api`
* Framework: Other
* Build Command: giữ nguyên trong `apps/api/vercel.json`

API project cần các biến server-side sau, Production và Preview:

* `SUPABASE_URL`
* `SUPABASE_SECRET_KEY`
* `SUPABASE_JWKS_URL`
* `CORS_ORIGINS` — `https://kb.tet-edu.com,http://localhost:3000`

API dùng Supabase PostgREST/RPC ở phía server với `SUPABASE_SECRET_KEY`, nên không
cần `DATABASE_POOLER_URL`, Fly.io hoặc IPv4 add-on của Supabase.

Sau khi API deploy thành công, cập nhật `NEXT_PUBLIC_API_URL` của project web bằng domain Vercel API rồi redeploy web.

Fly app có thể giữ nguyên làm rollback thủ công; workflow tự động không còn cần thiết.
