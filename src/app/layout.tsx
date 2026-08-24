import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gốm Production Pipeline",
  description:
    "Hệ thống điều phối & giám sát quy trình sản xuất xưởng gốm",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
