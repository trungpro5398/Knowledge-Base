import type { Metadata } from "next";
import { KbNotFound } from "@/components/kb/KbNotFound";

export const metadata: Metadata = {
  title: "Không tìm thấy tài liệu | Kho Tài Liệu TET",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
  return <KbNotFound />;
}
