import React from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminGuard } from "@/components/AdminGuard";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "Admin Dashboard - Codeyx",
  description: "Codeyx Admin Panel",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          logoImageUrl: "/favicon.svg",
        }
      }}
    >
      <html lang="en" className="dark">
        <body>
          <AdminGuard>
            <div className="flex h-screen bg-background overflow-hidden">
              <AdminSidebar />
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
                  <h2 className="text-xl font-semibold text-foreground">Admin Portal</h2>
                  <div className="flex items-center gap-4">
                    <UserButton afterSignOutUrl="/sign-in" />
                  </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
                  {children}
                </main>
              </div>
            </div>
          </AdminGuard>
        </body>
      </html>
    </ClerkProvider>
  );
}

