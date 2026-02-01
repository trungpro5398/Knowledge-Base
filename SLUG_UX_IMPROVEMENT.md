# Slug UX Improvement - Ẩn Kỹ Thuật, Lộ Giá Trị

## Vấn Đề

**Trước đây**: Form tạo trang hiển thị trực tiếp field "Slug" → gây khó hiểu cho users không-tech.

```
Tiêu đề
[ Tiêu đề trang ]

Slug  ← ??? Slug là gì?
[ page-slug ]
```

**Vấn đề UX**:
- User không biết slug là gì
- Không biết có bắt buộc không
- Không biết nhập sao cho đúng
- Gây friction không cần thiết

## Giải Pháp Implemented

### 1. Auto-generate Slug từ Tiêu đề

**Hàm `generateSlug()` trong `lib/utils.ts`**:
- Xử lý tiếng Việt có dấu (bỏ dấu)
- Chuyển lowercase
- Thay space bằng dash
- Loại bỏ ký tự đặc biệt
- Normalize multiple dashes

**Ví dụ**:
```
"Quy trình duyệt hóa đơn" → "quy-trinh-duyet-hoa-don"
"Automation Rules"        → "automation-rules"
"Hướng dẫn sử dụng 2024" → "huong-dan-su-dung-2024"
```

### 2. UI Mới - Ẩn Slug Mặc Định

**Form tạo trang mới**:

```
┌─────────────────────────────────────┐
│ Trang mới                           │
├─────────────────────────────────────┤
│ Từ template (tùy chọn)              │
│ [— Không dùng —          ▼]         │
│                                     │
│ Tiêu đề                             │
│ [Quy trình duyệt hóa đơn]          │ ← User chỉ nhập đây
│                                     │
│ ▼ Tùy chọn nâng cao                 │ ← Collapsed mặc định
│                                     │
│ [Tạo trang]                         │
└─────────────────────────────────────┘
```

**Khi expand "Tùy chọn nâng cao"**:

```
┌─────────────────────────────────────┐
│ ▲ Tùy chọn nâng cao                 │
├─────────────────────────────────────┤
│ Đường dẫn URL (slug)                │
│ [quy-trinh-duyet-hoa-don]          │
│                                     │
│ Ví dụ URL:                          │
│ /kb/tet-prosys/quy-trinh-duyet-... │
│                                     │
│ ⚠️ Thay đổi slug có thể làm hỏng   │
│    link cũ                          │
└─────────────────────────────────────┘
```

### 3. Hành Vi Smart

**Auto-generate**:
- User gõ tiêu đề → slug tự động cập nhật
- Không cần user chạm vào slug

**Manual override**:
- Nếu user mở "Tùy chọn nâng cao" và edit slug
- Hệ thống nhớ và không auto-generate nữa
- Cho phép power users tùy chỉnh

**Template**:
- Chọn template → auto-fill cả title và slug
- Slug được generate từ template name

## Code Changes

### 1. `lib/utils.ts` - Vietnamese Slug Generator

```typescript
export function generateSlug(text: string): string {
  // Vietnamese diacritics map (à → a, ă → a, â → a, etc.)
  const diacriticsMap: Record<string, string> = { ... };
  
  let slug = text;
  
  // Remove Vietnamese diacritics
  for (const [char, replacement] of Object.entries(diacriticsMap)) {
    slug = slug.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Convert to lowercase, replace spaces with dashes
  slug = slug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return slug || 'untitled';
}
```

### 2. `NewPageForm.tsx` - Smart Form

**State management**:
```typescript
const [title, setTitle] = useState("");
const [slug, setSlug] = useState("");
const [showAdvanced, setShowAdvanced] = useState(false);
const [manualSlug, setManualSlug] = useState(false);
```

**Auto-generate logic**:
```typescript
const handleTitleChange = (newTitle: string) => {
  setTitle(newTitle);
  if (!manualSlug) {
    setSlug(generateSlug(newTitle));
  }
};
```

**Manual override detection**:
```typescript
const handleSlugChange = (newSlug: string) => {
  setSlug(newSlug);
  setManualSlug(true); // User has manually edited
};
```

## UX Benefits

### Cho User Thường (99% cases)

✅ **Zero cognitive load**:
- Chỉ nhập tiêu đề
- Không cần suy nghĩ về slug
- Submit → done

✅ **Tự động đúng**:
- Slug luôn valid (lowercase, no spaces, no special chars)
- Xử lý tiếng Việt đúng cách
- Không bao giờ conflict với URL rules

### Cho Power Users / Admins

✅ **Vẫn có control**:
- Mở "Tùy chọn nâng cao" khi cần
- Thấy rõ URL sẽ như thế nào
- Edit slug nếu muốn SEO-optimize

✅ **Có cảnh báo**:
- Warning về breaking old links
- Hiển thị preview URL
- Rõ ràng đây là "advanced"

## Testing Checklist

- [ ] Gõ tiếng Việt có dấu → slug bỏ dấu đúng
- [ ] Gõ tiếng Anh → slug lowercase + dash
- [ ] Gõ số và ký tự đặc biệt → slug clean
- [ ] Chọn template → auto-fill title + slug
- [ ] Edit slug manually → không bị override
- [ ] Collapse/expand "Tùy chọn nâng cao" hoạt động
- [ ] Warning message hiển thị
- [ ] URL preview hiển thị đúng

## Comparison với Các Hệ Thống Khác

### Notion
- ✅ Ẩn slug hoàn toàn
- ❌ Không cho edit (URL là random ID)

### Confluence
- ✅ Auto-generate từ title
- ✅ Cho edit trong "Advanced"

### GitBook
- ✅ Auto-generate
- ✅ Hiển thị preview URL
- ✅ Warning khi edit

**→ Implementation này giống GitBook/Confluence (best practice)**

## Kết Luận

**Trước**: User phải hiểu khái niệm "slug" → friction  
**Sau**: User chỉ nhập tiêu đề → zero friction

**Impact**:
- Giảm confusion cho non-tech users
- Tăng adoption rate
- Vẫn giữ flexibility cho power users
- Follow best practices (Notion/Confluence/GitBook)

✅ **Ẩn kỹ thuật – Lộ giá trị**
