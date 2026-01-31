# Deploy Web lên Vercel

## 1. Đăng nhập Vercel (lần đầu)

```bash
npx vercel login
```

Mở link trong trình duyệt để xác thực.

## 2. Root Directory (bắt buộc cho monorepo)

Vào https://vercel.com/trungpro5398s-projects/knowledge-base-web/settings

- **Root Directory:** đặt `apps/web` (chọn "Edit" → nhập `apps/web` → Save)
- Không đặt Root Directory sẽ gây lỗi "No Next.js version detected"

## 3. Cấu hình env (Vercel Dashboard)

Sau khi tạo project, thêm Environment Variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bjflzirgdqqkelfxddhy.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase anon key) | Production, Preview |
| `NEXT_PUBLIC_API_URL` | `https://knowledge-base-api.fly.dev` | Production, Preview |

## 4. Deploy

### Cách 1: Vercel Dashboard (khuyến nghị)

1. Vào https://vercel.com/new
2. Import repo GitHub `trungpro5398/Knowledge-Base`
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

# Link project (tạo mới tên knowledge-base-web)
npx vercel link --yes

# Set env
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add NEXT_PUBLIC_API_URL production

# Deploy production
npx vercel deploy --prod
```

## 5. Cập nhật CORS trên Fly.io

Sau khi có URL Vercel (vd: `https://knowledge-base-web.vercel.app`):

```bash
fly secrets set CORS_ORIGINS="https://knowledge-base-web.vercel.app,http://localhost:3000" --app knowledge-base-api
```
