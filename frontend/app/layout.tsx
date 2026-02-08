import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DashboardRefreshProvider } from "@/contexts/DashboardRefreshContext";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "제조 공정 대시보드",
  description: "제조 공정 모니터링 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <LanguageProvider>
          <AuthProvider>
            <DashboardRefreshProvider>
              <AuthGuard>{children}</AuthGuard>
            </DashboardRefreshProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
