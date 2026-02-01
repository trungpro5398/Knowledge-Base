# UX Terminology Improvement - Removing "KB" Abbreviation

## 📋 Problem Statement

**Issue**: "KB" (Knowledge Base) là viết tắt khó hiểu cho người dùng không tech, đặc biệt là người dùng Việt Nam.

**User Feedback**: 
> "trang KB cũng nên design lại UX UI thấy khá khó hiểu, với không nên viết tắt KB không hiểu"

## ✅ Solution Implemented

Thay thế tất cả "KB" bằng thuật ngữ tiếng Việt rõ ràng, dễ hiểu.

---

## 🔄 Changes Made

### 1. **Site Header** (`components/site-header.tsx`)

**Before**:
```tsx
<span className="hidden sm:inline">Knowledge Base for TET</span>
<span className="sm:hidden">KB</span>
```

**After**:
```tsx
<span className="hidden sm:inline">Kho Tài Liệu TET</span>
<span className="sm:hidden">Tài Liệu</span>
```

**Navigation Link**:
- ❌ "Tìm kiếm / Xem KB"
- ✅ "Xem Tài Liệu"

---

### 2. **Admin Sidebar** (`app/(admin)/admin/layout.tsx`)

**Before**:
```tsx
<h1 className="font-bold text-lg">KB Admin</h1>
```

**After**:
```tsx
<h1 className="font-bold text-lg">Quản Trị Tài Liệu</h1>
```

**Desktop Sidebar Link**:
- ❌ "Xem KB"
- ✅ "Xem Tài Liệu"

**Mobile Bottom Nav**:
- ❌ "KB"
- ✅ "Tài Liệu"

---

### 3. **Page Metadata** (`app/layout.tsx`)

**Before**:
```tsx
export const metadata: Metadata = {
  title: "Knowledge Base for TET",
  description: "...",
};
```

**After**:
```tsx
export const metadata: Metadata = {
  title: "Kho Tài Liệu TET - Knowledge Base",
  description: "...",
};
```

**Benefit**: 
- SEO-friendly (tiếng Việt)
- Giữ "Knowledge Base" ở cuối cho người hiểu thuật ngữ
- Browser tab title rõ ràng hơn

---

### 4. **Empty State** (`app/(kb)/kb/[[...slug]]/page.tsx`)

**Before**:
```tsx
<h1 className="text-xl md:text-2xl font-bold">Space: {spaceSlug}</h1>
<p className="text-muted-foreground">Select a page from the sidebar.</p>
```

**After**:
```tsx
<div className="text-center py-20 sm:py-32">
  <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 mb-6">
    <svg className="h-10 w-10 sm:h-12 sm:w-12 text-primary">...</svg>
  </div>
  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
    Chào mừng đến Kho Tài Liệu
  </h2>
  <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto">
    Chọn một tài liệu từ danh mục bên trái để bắt đầu đọc
  </p>
  <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
    <span>💡</span>
    <span>Sử dụng menu bên trái để điều hướng</span>
  </div>
</div>
```

**Improvements**:
- ✅ Larger, centered welcome message
- ✅ Visual icon (book)
- ✅ Clear instructions in Vietnamese
- ✅ Helpful tip with emoji
- ✅ Better spacing and typography

---

## 📊 Terminology Mapping

| Old Term (English) | Old Term (Abbr) | New Term (Vietnamese) | Context |
|-------------------|-----------------|----------------------|---------|
| Knowledge Base for TET | KB | Kho Tài Liệu TET | Site header |
| KB Admin | - | Quản Trị Tài Liệu | Admin sidebar |
| Xem KB | - | Xem Tài Liệu | Navigation links |
| KB | - | Tài Liệu | Mobile nav |
| Space: {slug} | - | Chào mừng đến Kho Tài Liệu | Empty state |
| Select a page... | - | Chọn một tài liệu từ danh mục... | Instructions |

---

## 🎯 UX Benefits

### For Non-Tech Users:
1. **Immediate Understanding**: "Kho Tài Liệu" = "Document Library" - instantly clear
2. **No Mental Translation**: No need to decode "KB" abbreviation
3. **Vietnamese-First**: Matches user's primary language
4. **Professional**: Sounds more formal and official

### For All Users:
1. **Consistency**: Same terminology across all pages
2. **Clarity**: No ambiguity about what "KB" means
3. **Accessibility**: Better for screen readers (Vietnamese pronunciation)
4. **Onboarding**: New users understand immediately

---

## 📱 Mobile Considerations

**Mobile Bottom Nav** (limited space):
- ❌ "KB" (2 letters, unclear)
- ✅ "Tài Liệu" (8 letters, clear)

Even though longer, "Tài Liệu" fits well in mobile nav and is much clearer.

---

## 🌐 SEO Impact

**Page Title**:
```
Kho Tài Liệu TET - Knowledge Base
```

**Benefits**:
- ✅ Vietnamese keywords for local search
- ✅ English fallback for international users
- ✅ Brand name "TET" prominent
- ✅ Descriptive and clear

**Search Queries Improved**:
- "tài liệu TET" ✅
- "kho tài liệu TET" ✅
- "TET knowledge base" ✅ (still works)

---

## 🧪 Testing Checklist

- [x] Site header shows "Kho Tài Liệu TET" on desktop
- [x] Site header shows "Tài Liệu" on mobile
- [x] Admin sidebar shows "Quản Trị Tài Liệu"
- [x] Admin sidebar link shows "Xem Tài Liệu"
- [x] Mobile bottom nav shows "Tài Liệu"
- [x] Empty state shows welcoming Vietnamese message
- [x] Page title in browser tab is clear
- [x] All "KB" abbreviations removed

---

## 📈 Expected User Feedback

**Before**:
- "KB là gì?"
- "Phải click vào đâu để xem tài liệu?"
- "Trang này làm gì?"

**After**:
- Immediate understanding
- Clear navigation
- Confident usage

---

## 🔮 Future Considerations

### Potential Additional Improvements:
1. **Breadcrumb**: Add Vietnamese breadcrumb labels
2. **Search**: Add Vietnamese search placeholder
3. **Tooltips**: Add Vietnamese tooltips for icons
4. **Help Text**: More Vietnamese instructions throughout

### Maintain English Where Appropriate:
- Technical terms (API, URL, etc.)
- Status labels (DRAFT, OFFICIAL) - already clear
- Developer-facing interfaces

---

## ✅ Conclusion

**Impact**: High
**Effort**: Low (simple text replacements)
**User Benefit**: Immediate clarity for all users, especially non-tech Vietnamese users

**Result**: The app is now **significantly more accessible and user-friendly** for the target audience (TET employees in Vietnam).

---

## 📝 Files Modified

1. `apps/web/app/layout.tsx` - Page metadata
2. `apps/web/components/site-header.tsx` - Site header
3. `apps/web/app/(admin)/admin/layout.tsx` - Admin sidebar & mobile nav
4. `apps/web/app/(kb)/kb/[[...slug]]/page.tsx` - Empty state

**Total**: 4 files, ~15 lines changed

**No breaking changes** - purely UI text updates.
