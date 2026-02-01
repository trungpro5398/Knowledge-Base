# Database Schema - Knowledge Base

## Tổng quan bảng

| Bảng | Mục đích | Luồng dữ liệu |
|------|----------|---------------|
| **spaces** | Nhóm trang KB (vd: tet-prosys) | Seed / Admin tạo → KB đọc |
| **pages** | Trang trong cây (metadata, cha-con, thứ tự) | Từ templates hoặc Admin → tree + content |
| **page_versions** | Nội dung + lịch sử phiên bản | Autosave/Publish → render KB |
| **page_templates** | Mẫu tạo trang nhanh | Seed ProSys → chọn khi tạo trang mới |
| **memberships** | Phân quyền user trong space (viewer/editor/admin) | Admin gán → kiểm tra quyền |
| **attachments** | File đính kèm trang | Upload → lưu metadata, file trong Storage |
| **page_labels** | Nhãn/tag trong space | Admin tạo → gán cho trang |
| **page_label_mappings** | Liên kết trang–nhãn (N-N) | Gán nhãn cho trang |
| **comments** | Bình luận trên trang (có thể thread) | User comment → hiển thị |
| **watchers** | User theo dõi thay đổi trang | Subscribe → nhận thông báo |
| **trash** | Xóa mềm trang (khôi phục được) | Xóa → vào trash, restore xóa bản ghi |
| **audit_events** | Nhật ký hành động (compliance) | Hành động → ghi log |

---

## Chi tiết từng bảng

### 1. spaces
- **Input:** Seed (tet-prosys), Admin tạo space mới
- **Output:** Danh sách space, slug dùng cho URL `/kb/{slug}`

### 2. pages
- **Input:** Seed từ templates, Admin tạo trang (có thể chọn template)
- **Cột quan trọng:** `parent_id` (cha), `path` (ltree), `sort_order`, `current_version_id`, `status`
- **Output:** Cây trang, breadcrumb, metadata trang

### 3. page_versions
- **Input:** Autosave (draft), Publish (rendered_html, toc_json), seed
- **Cột:** `content_md`, `rendered_html`, `toc_json`, `search_vector`
- **Output:** Nội dung hiển thị KB, tìm kiếm

### 4. page_templates
- **Input:** Seed ProSys (17 templates)
- **Output:** Dropdown chọn mẫu khi tạo trang mới

### 5. memberships
- **Input:** Seed (user đầu tiên = admin tet-prosys), Admin mời user
- **Output:** Kiểm tra quyền xem/sửa space

### 6. attachments
- **Input:** Upload file qua API (metadata) + Supabase Storage (file)
- **Output:** Danh sách file đính kèm trang

### 7. page_labels + page_label_mappings
- **Input:** Admin tạo nhãn, gán cho trang
- **Output:** Filter/lọc trang theo nhãn

### 8. comments
- **Input:** User gửi comment (có thể reply `parent_id`)
- **Output:** Thread bình luận trên trang

### 9. watchers
- **Input:** User bấm "theo dõi" trang
- **Output:** (Chưa dùng) Gửi thông báo khi trang đổi

### 10. trash
- **Input:** Xóa trang (soft delete) → INSERT
- **Output:** Danh sách trang đã xóa, Restore → DELETE

### 11. audit_events
- **Input:** API ghi khi có hành động (publish, delete, …)
- **Output:** Admin xem lịch sử audit

---

## Quan hệ chính

```
spaces 1──N pages 1──N page_versions
         │
         ├── 1──N attachments
         ├── N──N page_label_mappings ──N page_labels
         ├── 1──N comments
         └── 1──N watchers

spaces 1──N memberships N──1 auth.users
pages 1──1 trash (soft delete)
spaces 1──N audit_events
```

---

## Migrations (thứ tự chạy)

| # | File | Mục đích |
|---|------|----------|
| 1 | extensions | uuid-ossp, ltree, pg_trgm |
| 2 | spaces | Bảng spaces |
| 3 | memberships | RBAC |
| 4 | pages | Trang + hierarchy |
| 5 | page_versions | Nội dung + version |
| 6 | attachments | File đính kèm |
| 7 | page_labels | Labels + mappings |
| 8 | page_templates | Templates |
| 9 | comments | Bình luận |
| 10 | watchers | Theo dõi |
| 11 | trash | Xóa mềm |
| 12 | audit_events | Audit log |
| 13 | search_vector | FTS trên page_versions |
| 14 | rls | Row Level Security |
| 15 | storage | Bucket attachments |
| 16 | auth_email_domain_hook | Chỉ @tet-edu.com |
| 16 | seed_prosys_templates | Space + templates |
| 17 | auth_email_domain_hook | (Trùng 16) |
| 18 | auto_confirm_email | Tự confirm email |
| 19 | rendered_html | Pre-compile markdown |
| 20 | seed_pages_from_templates | pages + versions từ templates |
| 21 | pages_sort_order | Thứ tự cây trang |
