import type { Metadata } from 'next';
import TopNavbar from '../components/shared/TopNavbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Projects from '../components/Projects';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import GEOAuthority from '../components/GEOAuthority';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import Link from 'next/link';
import { Bot, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: "Codeyx | Modern Developer Portfolio & Coding Analytics Tracker",
  description: "Connect LeetCode, GitHub, and Codeforces to build a verified developer portfolio. Track DSA sheets, practice coding patterns, and climb global leaderboards.",
  keywords: [
    "Codeyx",
    "developer portfolio",
    "coding analytics",
    "DSA sheet tracker",
    "LeetCode tracker",
    "Github dashboard",
    "competitive programming rank",
    "Codeforces ratings",
    "Striver DSA sheet",
    "coding leaderboard"
  ],
  alternates: {
    canonical: "https://codeyx-web.vercel.app",
  },
  openGraph: {
    title: "Codeyx | Modern Developer Portfolio & Coding Analytics Tracker",
    description: "Connect LeetCode, GitHub, and Codeforces to build a verified developer portfolio. Track DSA sheets, practice coding patterns, and climb global leaderboards.",
    url: "https://codeyx-web.vercel.app",
    siteName: "Codeyx",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://codeyx-web.vercel.app/assets/logo-dark-them.png",
        width: 1200,
        height: 630,
        alt: "Codeyx Developer Analytics & Portfolio Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codeyx | Modern Developer Portfolio & Coding Analytics Tracker",
    description: "Connect LeetCode, GitHub, and Codeforces to build a verified developer portfolio. Track DSA sheets, practice coding patterns, and climb global leaderboards.",
    images: ["https://codeyx-web.vercel.app/assets/logo-dark-them.png"],
  },
};

export default function Home() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Codeyx",
    "url": "https://codeyx-web.vercel.app",
    "description": "Codeyx is an AI-powered developer platform to track DSA sheets, sync LeetCode and GitHub profiles, showcase projects, and rank on coding leaderboards.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://codeyx-web.vercel.app/explore-sheets?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Codeyx",
    "url": "https://codeyx-web.vercel.app",
    "logo": "https://codeyx-web.vercel.app/assets/logo-dark-them.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "codeyx6@gmail.com",
      "contactType": "customer support"
    },
    "sameAs": [
      "https://github.com/LalitModi90/codeyx-web"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Codeyx?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Codeyx is an all-in-one developer analytics and portfolio platform. It synchronizes coding profiles across LeetCode, GitHub, Codeforces, and GeeksforGeeks into a single verified portfolio for developers, software engineers, and competitive programmers."
        }
      },
      {
        "@type": "Question",
        "name": "Is Codeyx free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, core profile tracking, progress sheet visualizations, global leaderboard rankings, and coding pattern trackers on Codeyx are 100% free."
        }
      },
      {
        "@type": "Question",
        "name": "How does the Codeyx leaderboard ranking work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Codeyx ranks developers using a weighted algorithm combining their public contest ratings (LeetCode, CodeChef), total problem-solving consistency, and verified open-source GitHub contributions."
        }
      },
      {
        "@type": "Question",
        "name": "Can I sync my LeetCode and GitHub profiles?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! You can connect your profiles by entering your public usernames. Codeyx automatically indexes solved problems, contest stats, and public repositories without requiring credentials."
        }
      }
    ]
  };

  return (
    <main className="min-h-screen relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <TopNavbar />
      <Hero />
      <AnalyticsDashboard />
      <Projects />
      <Features />
      <HowItWorks />
      <GEOAuthority />
      <FAQ />
      <Footer />

      {/* Floating AI Help Desk Button */}
      <Link href="/help" className="fixed bottom-8 right-8 z-50 group cursor-pointer" title="Ask Codeyx AI">
        <div className="absolute -inset-2 bg-gradient-to-r from-primary to-orange-400 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
        <div className="relative flex items-center justify-center bg-[#111216] border border-white/10 p-3 rounded-full shadow-2xl hover:scale-110 transition-transform">
          <div className="relative">
            <Bot className="text-primary" size={20} />
            <Sparkles className="absolute -top-1 -right-1 text-orange-400 animate-pulse" size={10} />
          </div>
        </div>
      </Link>
    </main>
  );
}
