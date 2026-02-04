export type Locale = "vi" | "en";

export const translations = {
  vi: {
    // Header
    "header.title": "Kho Tài Liệu TET",
    "header.titleShort": "Tài Liệu",
    "header.viewDocs": "Xem Tài Liệu",
    "header.logout": "Đăng xuất",
    "header.login": "Đăng nhập",
    "header.register": "Đăng ký (@tet-edu.com)",
    "header.registerTitle": "Chỉ email @tet-edu.com",
    "header.shortcuts": "Phím tắt",
    "header.shortcutsTitle": "Phím tắt (?)",

    // Sidebar
    "sidebar.menu": "Danh mục",
    "sidebar.spaces": "Không gian",
    "sidebar.pagesInSpace": "Trang trong kho",
    "sidebar.searchPlaceholder": "Tìm trang...",
    "sidebar.expand": "Mở danh mục",
    "sidebar.collapse": "Thu gọn danh mục",
    "sidebar.resize": "Kéo để đổi độ rộng",

    // Common
    "common.admin": "Admin",
    "common.dashboard": "Dashboard",
    "common.trash": "Thùng rác",
    "common.viewDocs": "Xem Tài Liệu",
    "common.cancel": "Hủy",
    "common.save": "Lưu",
    "common.delete": "Xóa",
    "common.edit": "Chỉnh sửa",
    "common.create": "Tạo",
    "common.search": "Tìm kiếm",
    "common.noResults": "Không tìm thấy kết quả",

    // Welcome / Empty
    "welcome.title": "Chào mừng đến Kho Tài Liệu",
    "welcome.selectDoc": "Chọn một tài liệu từ danh mục bên trái để bắt đầu đọc",
    "welcome.tip": "Sử dụng menu bên trái để điều hướng",
    "welcome.tipMobile": "Mở menu ở góc dưới để điều hướng",
    "welcome.newToProSys": "New to ProSys? Start here →",

    // Shortcuts
    "shortcuts.title": "Phím tắt",
    "shortcuts.close": "Đóng",
    "shortcuts.hint": "Nhấn ? để mở • Esc để đóng",
    "shortcuts.category.general": "Chung",
    "shortcuts.commandPalette": "Mở command palette",
    "shortcuts.toggleSidebar": "Thu gọn / mở sidebar",
    "shortcuts.showHelp": "Xem danh sách phím tắt",
  },
  en: {
    // Header
    "header.title": "TET Knowledge Base",
    "header.titleShort": "Docs",
    "header.viewDocs": "View Docs",
    "header.logout": "Log out",
    "header.login": "Log in",
    "header.register": "Register (@tet-edu.com)",
    "header.registerTitle": "Email @tet-edu.com only",
    "header.shortcuts": "Shortcuts",
    "header.shortcutsTitle": "Shortcuts (?)",

    // Sidebar
    "sidebar.menu": "Menu",
    "sidebar.spaces": "Spaces",
    "sidebar.pagesInSpace": "Pages",
    "sidebar.searchPlaceholder": "Search pages...",
    "sidebar.expand": "Expand menu",
    "sidebar.collapse": "Collapse menu",
    "sidebar.resize": "Drag to resize",

    // Common
    "common.admin": "Admin",
    "common.dashboard": "Dashboard",
    "common.trash": "Trash",
    "common.viewDocs": "View Docs",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.noResults": "No results found",

    // Welcome / Empty
    "welcome.title": "Welcome to Knowledge Base",
    "welcome.selectDoc": "Select a document from the sidebar to start reading",
    "welcome.tip": "Use the left menu to navigate",
    "welcome.tipMobile": "Open the menu at the bottom to navigate",
    "welcome.newToProSys": "New to ProSys? Start here →",

    // Shortcuts
    "shortcuts.title": "Shortcuts",
    "shortcuts.close": "Close",
    "shortcuts.hint": "Press ? to open • Esc to close",
    "shortcuts.category.general": "General",
    "shortcuts.commandPalette": "Open command palette",
    "shortcuts.toggleSidebar": "Collapse / expand sidebar",
    "shortcuts.showHelp": "Show shortcuts",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["vi"];
