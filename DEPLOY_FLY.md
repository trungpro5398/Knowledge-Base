# Deploy API lên Fly.io

## Bạn cần thêm 2 secrets từ Supabase Dashboard

1. Vào https://supabase.com/dashboard → chọn project → **Settings** → **API**
2. Lấy **Project URL** (dạng `https://xxxx.supabase.co`)
3. Vào **Settings** → **Database** → **Connection string** → URI (hoặc dùng connection pooling)

Chạy lệnh (thay `YOUR_SUPABASE_URL` và `YOUR_DATABASE_URL`):

```bash
fly secrets set \
  SUPABASE_URL="YOUR_SUPABASE_URL" \
  DATABASE_URL="YOUR_DATABASE_URL" \
  --app knowledge-base-api
```

Sau đó:

```bash
fly deploy --app knowledge-base-api
```

## Cập nhật CORS (khi deploy web lên Vercel)

```bash
fly secrets set CORS_ORIGINS="https://your-app.vercel.app,http://localhost:3000" --app knowledge-base-api
```
