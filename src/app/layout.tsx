import type { Metadata } from "next";
import { AppLayout } from "@/components/AppLayout";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "ISF Can Tho Hub";
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  "Hệ thống Quản trị Tập trung Team ISF Cần Thơ"; 

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/sf-pro-display"
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/sf-mono"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
