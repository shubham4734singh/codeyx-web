import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { OnboardingProvider } from "../components/OnboardingProvider";
import ReactQueryProvider from "../providers/ReactQueryProvider";
import FeedbackButton from "../components/FeedbackButton";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import StickyBottomAd from "../components/shared/StickyBottomAd";

const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: "Codeyx - Modern Coding Platform & Developer Tracker",
  description: "Codeyx is a modern coding platform that provides coding sheets, programming contests, developer projects, DSA practice, web development resources, and tools for students and developers to learn, practice, build projects, and improve their coding skills.",
  keywords: ["coding sheet", "programming contests", "developer projects", "DSA practice", "web development resources", "learn coding", "codeyx", "developer portfolio", "coding analytics", "leetcode tracker"],
  authors: [{ name: "Codeyx Team", url: "https://codeyx-web.vercel.app" }],
  creator: "Codeyx Corporation",
  metadataBase: new URL("https://codeyx-web.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Codeyx - Modern Coding Platform & Developer Tracker",
    description: "Learn, practice, and showcase your coding skills. Access high-quality programming contests, curated coding sheets, DSA problems, and sync all your platforms in a premium developer portfolio.",
    url: "https://codeyx-web.vercel.app",
    siteName: "Codeyx",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/logo-dark-them.png",
        width: 800,
        height: 600,
        alt: "Codeyx Developer Analytics Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codeyx - Modern Coding Platform & Developer Tracker",
    description: "Learn, practice, and showcase your coding skills. Access high-quality programming contests, curated coding sheets, DSA problems, and sync all your platforms in a premium developer portfolio.",
    creator: "@codeyx",
    images: ["/assets/logo-dark-them.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2934790485812892"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </head>
      <body className={inter.className}>
        <NextTopLoader 
          color="#FF8A00"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #FF8A00,0 0 5px #FF8A00"
        />
        <ClerkProvider
          appearance={{
            layout: {
              logoImageUrl: "/assets/logo-dark-them.png",
              logoPlacement: "inside"
            },
            elements: {
              logoImage: "h-10 w-auto object-contain",
            }
          }}
        >
          <ThemeProvider>
            <ReactQueryProvider>
              <OnboardingProvider>
                {children}
                <FeedbackButton />
                <StickyBottomAd />
                <Analytics />
              </OnboardingProvider>
            </ReactQueryProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
