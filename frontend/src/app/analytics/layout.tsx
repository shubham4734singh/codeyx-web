import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Analytics Dashboard | Codeyx DSA & Coding Tracker",
  description: "Track your coding progress across LeetCode, GitHub, and Codeforces. Get AI-powered study insights, DSA sheet tracking, and pattern analysis on Codeyx.",
  keywords: [
    "developer analytics",
    "DSA sheet tracker",
    "coding pattern analysis",
    "coding profile tracker",
    "LeetCode analytics",
    "Codeforces progress tracker",
    "CodeChef stats",
    "Github contributions tracker",
    "AI coding mentor",
    "Codeyx analytics dashboard"
  ],
  authors: [{ name: "Codeyx Team", url: "https://codeyx-web.vercel.app" }],
  creator: "Codeyx Corporation",
  metadataBase: new URL("https://codeyx-web.vercel.app"),
  alternates: {
    canonical: "/analytics",
  },
  openGraph: {
    title: "Developer Analytics Dashboard | Codeyx DSA & Coding Tracker",
    description: "Track your coding progress across LeetCode, GitHub, and Codeforces. Get AI-powered study insights, DSA sheet tracking, and pattern analysis on Codeyx.",
    url: "https://codeyx-web.vercel.app/analytics",
    siteName: "Codeyx",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/logo-dark-them.png",
        width: 800,
        height: 600,
        alt: "Codeyx Developer Analytics Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Analytics Dashboard | Codeyx DSA & Coding Tracker",
    description: "Track your coding progress across LeetCode, GitHub, and Codeforces. Get AI-powered study insights, DSA sheet tracking, and pattern analysis on Codeyx.",
    creator: "@codeyx",
    images: ["/assets/logo-dark-them.png"],
  },
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
