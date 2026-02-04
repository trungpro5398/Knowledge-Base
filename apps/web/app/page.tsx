import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-[100dvh]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-balance">
            Knowledge Base for TET
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Tài liệu vận hành, quy trình và quyết định nội bộ của TET.
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Luôn cập nhật, dễ tìm, dễ hiểu.
          </p>

          {/* Primary CTA – chỉ 1 hành động chính; Auth ở header */}
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/kb/tet-prosys"
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Xem Tài Liệu
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Một số nội dung yêu cầu đăng nhập bằng email @tet-edu.com
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
