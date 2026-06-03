"use client";

import React from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { ShieldOff, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

const ADMIN_EMAIL = "lalitkumargeloth16@gmail.com";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  // If visiting public authentication routes, bypass the guard completely
  const isAuthRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()?.trim();

  if (!userEmail || userEmail !== ADMIN_EMAIL) {
    return (
      <div className="flex h-screen items-center justify-center bg-background flex-col gap-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <ShieldOff className="text-red-500" size={40} />
        </div>
        <div className="text-center px-4 max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You do not have permission to access the Admin Portal.
          </p>
          <p className="text-muted-foreground text-xs mt-2 bg-muted p-2 rounded border border-border">
            Logged in as: <span className="text-red-400 font-mono font-medium">{userEmail || "Not logged in"}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <SignOutButton>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition shadow-sm">
              <LogOut size={16} />
              Switch / Sign Out Account
            </button>
          </SignOutButton>
          
          <a
            href={process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://codeyx-web.vercel.app"}
            className="px-5 py-2.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-semibold hover:bg-secondary/80 transition"
          >
            Go to Main App
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

