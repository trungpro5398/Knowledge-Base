# UX/UI Review & Update Plan - Feb 2025

## Đã hoàn thành (sessions trước)

| Tính năng | Trạng thái |
|-----------|------------|
| Sidebar search + filter | ✅ |
| Stagger animation list | ✅ |
| Sticky breadcrumb chip style | ✅ |
| router.refresh sau create | ✅ |
| Delete space + cascade delete page | ✅ |
| Collapsible sidebar (hide/unhide) | ✅ |
| Resizable sidebar (kéo độ rộng) | ✅ |
| Labels tiếng Việt (Không gian, Danh mục) | ✅ |

## Skills & Rules

- Tạo `.cursor/rules/ux-ui.mdc` – conventions UX/UI cho AI khi sửa FE

## Đề xuất cải tiến tiếp

### Ưu tiên cao
1. **Keyboard shortcuts help** – Phím `?` hiện modal (đã có component, cần register shortcuts)
2. **Empty states** – Đồng nhất style, icon + message rõ ràng
3. **Error states** – Friendly message, CTA "Thử lại"

### Ưu tiên trung bình
4. **Loading skeletons** – Thêm cho admin pages chưa có
5. **Focus management** – Modal mở → focus vào element đầu
6. **Form validation** – Inline errors, không chỉ toast

### Ưu tiên thấp
7. **Drag-drop tree** – Backend sẵn sàng
8. **Undo/redo editor** – History stack
9. **Virtualized tree** – Khi >100 nodes

## References

- UX_UI_IMPLEMENTATION_SUMMARY.md
- UX_TERMINOLOGY_IMPROVEMENT.md
