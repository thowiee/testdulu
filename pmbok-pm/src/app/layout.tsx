import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMBOK-PM · Manajemen Portofolio Proyek",
  description:
    "Aplikasi manajemen proyek berbasis PMBOK: EVM, health otomatis, dan notulen rapat (MOM) dengan tanda tangan elektronik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-canvas text-ink">{children}</body>
    </html>
  );
}
