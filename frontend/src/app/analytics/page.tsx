"use client";
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import TopNavbar from '../../components/shared/TopNavbar';
import Link from 'next/link';
import { progressService } from '../../services/progress.service';
import { patternsService } from '../../services/patterns.service';
import { api } from '../../lib/api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import {
  ArrowLeft, Zap, Target, Flame, BrainCircuit,
  TrendingUp, Clock, AlertTriangle, CheckCircle2,
  Circle, Trophy, BookOpen, Loader2, Star, Layers, Activity, LayoutDashboard, Sparkles
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const diffColors: Record<string, string> = {
  Easy: '#34D399', Medium: '#FBBF24', Hard: '#FB7185',
};

const diffBg: Record<string, string> = {
  Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function formatDateAgo(dateVal: string | Date | null) {
  if (!dateVal) return 'Never';
  const d = new Date(dateVal);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function HeatmapCell({ count, maxCount }: { count: number; maxCount: number }) {
  const intensity = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
  let bg = 'bg-[#1a1a2e]';
  if (count > 0 && intensity <= 0.25) bg = 'bg-emerald-900/60';
  else if (count > 0 && intensity <= 0.5) bg = 'bg-emerald-700/70';
  else if (count > 0 && intensity <= 0.75) bg = 'bg-emerald-500/70';
  else if (count > 0) bg = 'bg-emerald-400/80';
  return (
    <div
      className={`w-3 h-3 rounded-sm ${bg} transition-colors`}
      title={`${count} problem${count !== 1 ? 's' : ''}`}
    />
  );
}

const formatToPoints = (text: string) => {
  if (!text) return [];
  
  const numberedMatch = text.match(/\d+[\)\.]/g);
  if (numberedMatch && numberedMatch.length > 1) {
    const firstIndex = text.search(/\d+[\)\.]/);
    const prefix = text.substring(0, firstIndex).trim();
    const parts = text.substring(firstIndex).split(/\s*\d+[\)\.]\s*/);
    const points = parts.map(p => p.trim()).filter(Boolean);
    if (prefix) {
      return [prefix, ...points];
    }
    return points;
  }
  
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9'"])/)
    .map(s => s.trim())
    .filter(Boolean);
    
  return sentences;
};

const renderInsightText = (text: string) => {
  if (!text) return null;
  const points = formatToPoints(text);
  
  if (points.length <= 1) {
    return <p className="text-[11.5px] text-gray-300 leading-relaxed">{text}</p>;
  }

  const hasPrefix = points[0].endsWith(':') || 
                    points[0].toLowerCase().includes('need to') || 
                    points[0].toLowerCase().includes('struggling across') || 
                    points[0].toLowerCase().includes('criteria of having') ||
                    points[0].toLowerCase().includes('adopt a structured');
  const startIndex = hasPrefix ? 1 : 0;
  
  return (
    <div className="flex flex-col gap-2">
      {hasPrefix && (
        <p className="text-[11.5px] text-gray-300 font-bold leading-relaxed">{points[0]}</p>
      )}
      <ul className="list-disc pl-4 space-y-1.5 text-[11.5px] text-gray-300 leading-relaxed">
        {points.slice(startIndex).map((pt, idx) => (
          <li key={idx} className="marker:text-[#FF8A00]">
            {pt}
          </li>
        ))}
      </ul>
    </div>
  );
};

const formatAiError = (err: any) => {
  const msg = err?.message || (typeof err === 'string' ? err : '');
  if (msg.includes('429') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
    return 'AI Limit reached. Please try again later or use the second option: switch to Groq / Gemini.';
  }
  return msg || 'An unexpected error occurred.';
};

export default function GlobalAnalyticsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'overall' | 'sheets' | 'patterns'>('overall');
  const [sheetsData, setSheetsData] = useState<any[]>([]);
  const [patternAnalytics, setPatternAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'completion' | 'name' | 'remaining'>('completion');
  const [patternSort, setPatternSort] = useState<'completion' | 'name' | 'remaining'>('completion');
  
  // AI study insights states
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsProvider, setInsightsProvider] = useState<'gemini' | 'groq'>('gemini');
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      setIsLoading(true);
      try {
        const [sheetsRes, patternsRes] = await Promise.all([
          progressService.getAllProgress(),
          patternsService.getPatternAnalytics(),
        ]);
        
        const sData = (sheetsRes as any)?.data || sheetsRes || [];
        setSheetsData(Array.isArray(sData) ? sData : []);
        
        setPatternAnalytics((patternsRes as any)?.data || patternsRes);
      } catch (e) {
        console.error('[Analytics] fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn]);

  const sortedSheets = useMemo(() => {
    const list = [...sheetsData];
    if (sortOption === 'completion') list.sort((a, b) => b.progressPercentage - a.progressPercentage);
    else if (sortOption === 'name') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOption === 'remaining') list.sort((a, b) => b.remainingProblems - a.remainingProblems);
    return list;
  }, [sheetsData, sortOption]);

  const sortedPatterns = useMemo(() => {
    if (!patternAnalytics?.patternStats) return [];
    const list = [...patternAnalytics.patternStats];
    if (patternSort === 'completion') list.sort((a, b) => b.completionPercentage - a.completionPercentage);
    else if (patternSort === 'name') list.sort((a, b) => a.patternTitle.localeCompare(b.patternTitle));
    else if (patternSort === 'remaining') list.sort((a, b) => b.remainingProblems - a.remainingProblems);
    return list;
  }, [patternAnalytics?.patternStats, patternSort]);

  // Sheets Stats
  const sheetsSolved = sheetsData.reduce((acc, curr) => acc + (curr.solvedProblems || 0), 0);
  const sheetsTotal = sheetsData.reduce((acc, curr) => acc + (curr.totalProblems || 0), 0);
  const sheetsOverallPct = sheetsTotal > 0 ? Math.round((sheetsSolved / sheetsTotal) * 100) : 0;
  
  const sheetsBarData = sortedSheets.slice(0, 10).map(s => ({
    name: s.title.length > 18 ? s.title.slice(0, 16) + '…' : s.title,
    completion: s.progressPercentage,
    solved: s.solvedProblems,
    total: s.totalProblems,
  }));

  // Pattern Stats
  const d = patternAnalytics;
  const patternsTotalSolved = d?.totalSolved || 0;
  const patternsTotalProblems = d?.totalProblems || 0;
  const patternsCompletionPct = d?.completionPercentage || 0;
  
  const pieData = [
    { name: 'Easy', value: d?.difficultySolved?.Easy || 0, color: '#34D399' },
    { name: 'Medium', value: d?.difficultySolved?.Medium || 0, color: '#FBBF24' },
    { name: 'Hard', value: d?.difficultySolved?.Hard || 0, color: '#FB7185' },
  ].filter(p => p.value > 0);

  const patternBarData = sortedPatterns.slice(0, 10).map((p: any) => ({
    name: p.patternTitle.length > 18 ? p.patternTitle.slice(0, 16) + '…' : p.patternTitle,
    completion: p.completionPercentage,
    solved: p.solvedProblems,
    total: p.totalProblems,
  }));

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    setAiInsights(null);
    try {
      const response: any = await api.post('/resume/analytics-insights', {
        totalSolved: Math.max(sheetsSolved, patternsTotalSolved),
        totalProblems: Math.max(sheetsTotal, patternsTotalProblems),
        weakPatterns: d?.weakPatterns || [],
        strongPatterns: d?.strongPatterns || [],
        difficultySolved: d?.difficultySolved || { Easy: 0, Medium: 0, Hard: 0 },
        difficultyTotal: d?.difficultyTotal || { Easy: 0, Medium: 0, Hard: 0 },
        sheetsProgress: sheetsData.map(s => ({
          title: s.title,
          solved: s.solvedProblems,
          total: s.totalProblems,
          percentage: s.progressPercentage
        })),
        provider: insightsProvider
      });
      if (response.success && response.data) {
        setAiInsights(response.data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorModal({
        isOpen: true,
        title: 'AI Insights Failed',
        message: formatAiError(err)
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-[#FAFAFA] font-sans">
        <TopNavbar />
        <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="text-[#FF8A00] animate-spin" /></div>
      </div>
    );
  }

  if (!isSignedIn) {
    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Codeyx",
      "url": "https://codeyx-web.vercel.app",
      "logo": "https://codeyx-web.vercel.app/assets/logo-dark-them.png"
    };

    const prodSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Codeyx Developer Analytics Dashboard",
      "operatingSystem": "All",
      "applicationCategory": "DeveloperApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "An AI-powered developer tracking platform that aggregates coding performance across LeetCode, GitHub, Codeforces, and GeeksforGeeks to generate smart study plans."
    };

    const faqSchemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does Codeyx track my coding progress?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Codeyx syncs directly with public profiles on major coding platforms like LeetCode, Codeforces, CodeChef, GitHub, and GeeksforGeeks. It aggregates your solved problems, weekly submissions, and achievements into a unified developer dashboard."
          }
        },
        {
          "@type": "Question",
          "name": "What is the AI Study Mentor feature in Codeyx?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The AI Study Mentor analyses your weak coding patterns (e.g. Dynamic Programming, Sliding Window, or Graphs) and suggests custom roadmaps, learning tips, and targeted practice lists using Gemini and Groq Llama models."
          }
        },
        {
          "@type": "Question",
          "name": "Can I track my DSA sheets on Codeyx?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Codeyx lets you track and view progress on popular DSA sheets (such as Striver A2Z DSA, Love Babbar, etc.) in real time, calculating percentages and remaining problems automatically."
          }
        }
      ]
    };

    return (
      <div className="min-h-screen bg-[#0B0C10] text-[#FAFAFA] font-sans selection:bg-[#FF8A00]/30 pb-20 overflow-x-hidden">
        {/* Inject structured schema markup for SEO/GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(prodSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }}
        />

        <TopNavbar />

        <main className="max-w-[1200px] mx-auto px-4 md:px-6 pt-12 md:pt-20">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-6 mb-16 relative">
            {/* Ambient background glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#FF8A00]/10 blur-[100px] pointer-events-none" />
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs text-gray-400">
              <Sparkles size={14} className="text-[#FF8A00] animate-pulse" />
              <span>Next-Gen Developer Tracking Platform</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Codeyx Developer <br />
              <span className="bg-gradient-to-r from-[#FF8A00] to-orange-500 bg-clip-text text-transparent">
                Analytics Dashboard
              </span>
            </h1>

            <p className="text-base md:text-lg text-gray-400 leading-relaxed font-normal">
              Track, analyze, and supercharge your algorithmic and programming skills. Aggregate your data from LeetCode, GitHub, Codeforces, and GeeksforGeeks into a single premium developer profile with AI-guided study pathing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#FF8A00] to-orange-500 hover:from-orange-500 hover:to-[#FF8A00] text-black font-extrabold rounded-xl transition-all duration-300 shadow-lg shadow-[#FF8A00]/25 hover:shadow-[#FF8A00]/40 flex items-center justify-center gap-2 text-sm"
              >
                Get Started For Free <Zap size={16} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#111216]/80 hover:bg-[#18191e] text-white font-bold rounded-xl border border-white/10 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* AI Search Engine/Chatbot optimized summary and entities list */}
          <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-6 md:p-8 mb-16 space-y-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 blur-[50px] pointer-events-none" />
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <BrainCircuit className="text-[#FF8A00]" size={20} />
              AI Summary: Unified Coding Analytics & Tracking
            </h2>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
              Codeyx is a comprehensive multi-platform coding tracker and developer portfolio platform. It solves the fragmentation of developer analytics by fetching data from <strong>LeetCode</strong>, <strong>GitHub</strong>, <strong>Codeforces</strong>, <strong>CodeChef</strong>, and <strong>GeeksforGeeks</strong>. By utilizing advanced LLMs like <strong>Google Gemini</strong> and <strong>Meta Llama</strong> (via Groq), Codeyx detects pattern weaknesses and formats customized mentorship recommendations, making it a pivotal ecosystem for competitive programmers and software engineers preparing for interviews.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div>
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">Key Features at a Glance</h3>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF8A00] font-black">•</span>
                    <span><strong>DSA Sheet Syncing:</strong> Auto-updates progress on sheets like Striver A2Z and Love Babbar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF8A00] font-black">•</span>
                    <span><strong>Conceptual Patterns:</strong> Tracks mastery over specific algorithms (DP, Two Pointers, Graphs).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF8A00] font-black">•</span>
                    <span><strong>Unified Activity Heatmap:</strong> A single grid representing all connected-platform submissions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF8A00] font-black">•</span>
                    <span><strong>AI-Driven Roadmaps:</strong> Recommends focus questions to speed up interview preparation.</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">Supported Integrations & Entities</h3>
                <div className="flex flex-wrap gap-2">
                  {['LeetCode', 'GitHub', 'Codeforces', 'CodeChef', 'GeeksforGeeks', 'Google Gemini AI', 'Groq Llama', 'Striver A2Z DSA', 'DSA Coding Patterns', 'Developer Portfolios'].map((tag) => (
                    <span key={tag} className="px-2.5 py-1 text-[10px] font-medium text-gray-300 bg-white/5 border border-white/10 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Key Capabilities Section */}
          <div className="space-y-8 mb-16">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Why Use Codeyx Analytics?</h2>
              <p className="text-xs md:text-sm text-gray-500">How we help developers optimize their DSA practice and showcase skills.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-[#FF8A00]/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF8A00] group-hover:scale-110 transition-transform">
                  <Layers size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Multi-Platform Aggregation</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  No more manual Excel spreadsheets. Link your coding accounts, and we will sync your solving metrics, stars, and ranks automatically.
                </p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-[#FF8A00]/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <BrainCircuit size={20} />
                </div>
                <h3 className="text-base font-bold text-white">AI-Guided Study Mentorship</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Analyze your performance trends. The AI Mentor pinpoints the algorithmic patterns that need work and builds custom revision roadmaps.
                </p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-[#FF8A00]/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Target size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Structured DSA Sheets</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Solve industry-standard DSA patterns sequentially. Directly see how close you are to mastering each specific sheet, keeping you highly focused.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="space-y-6 mb-16">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">How Codeyx Compares</h2>
              <p className="text-xs md:text-sm text-gray-500">A comparative look at tracking methods for competitive programmers.</p>
            </div>

            <div className="bg-[#111216]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-xs text-gray-400 font-bold uppercase">
                      <th className="p-4 pl-6">Feature Capability</th>
                      <th className="p-4 text-[#FF8A00]">Codeyx Dashboard</th>
                      <th className="p-4">Manual Spreadsheets</th>
                      <th className="p-4 pr-6">Single Site Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    <tr className="border-b border-white/5">
                      <td className="p-4 pl-6 font-bold text-white">Unified Multi-Platform Sync</td>
                      <td className="p-4 text-emerald-400 font-semibold">Yes (Automatic)</td>
                      <td className="p-4 text-amber-400 font-normal">Yes (Manual Entry)</td>
                      <td className="p-4 text-rose-400 pr-6 font-normal">No (Single site only)</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-4 pl-6 font-bold text-white">AI Weakness Detection</td>
                      <td className="p-4 text-emerald-400 font-semibold">Yes (Gemini & Llama)</td>
                      <td className="p-4 text-rose-400 font-normal">No</td>
                      <td className="p-4 text-rose-400 pr-6 font-normal">No</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-4 pl-6 font-bold text-white">DSA Sheet Syncing</td>
                      <td className="p-4 text-emerald-400 font-semibold">Yes (Striver, Babbar, etc.)</td>
                      <td className="p-4 text-rose-400 font-normal">No (Must tick boxes)</td>
                      <td className="p-4 text-rose-400 pr-6 font-normal">No</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-4 pl-6 font-bold text-white">Algorithmic Pattern Tracker</td>
                      <td className="p-4 text-emerald-400 font-semibold">Yes (Two Pointers, DP, Graphs)</td>
                      <td className="p-4 text-rose-400 font-normal">No</td>
                      <td className="p-4 text-rose-400 pr-6 font-normal">No</td>
                    </tr>
                    <tr>
                      <td className="p-4 pl-6 font-bold text-white">Unified Activity Heatmap</td>
                      <td className="p-4 text-emerald-400 font-semibold">Yes (Aggregated)</td>
                      <td className="p-4 text-rose-400 font-normal">No</td>
                      <td className="p-4 text-rose-400 pr-6 font-normal">No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
              <p className="text-xs md:text-sm text-gray-500">Clear answers to target your direct searches and inquiries.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">How does Codeyx track my coding progress?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Codeyx connects via public APIs and page scrapers to fetch metrics from developer portfolios (LeetCode, GitHub, Codeforces, CodeChef, and GeeksforGeeks) without needing passwords. Simply input your username to start sync.
                </p>
              </div>

              <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">What is the AI Study Mentor and how does it help?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Our AI Mentor is an integration leveraging large language models like Google Gemini. It analyzes your patterns (like solving speeds or failure rates on Trees, Strings, or Recursion) to build customized practice checklists.
                </p>
              </div>

              <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">Can I track Striver A2Z and other DSA sheets?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Yes, Codeyx hosts structured DSA sheet lists. When you complete a problem on a synced platform, Codeyx detects it, updates your sheet status, and tracks your global sheet completion percentage in real time.
                </p>
              </div>

              <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">Is Codeyx Developer Analytics free to use?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Yes, basic profile aggregation, progress sheets tracking, global analytics graphs, and core heatmap visualizations are 100% free. Additional LLM tokens for advanced roadmaps might have daily rate limits.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weeklyChartData = (d?.weeklyProgress || []).map((w: any) => ({
    day: weekDays[new Date(w.date).getDay()],
    solved: w.solved,
    date: w.date,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-xl shadow-black/40">
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          {payload.map((pld: any, i: number) => (
            <p key={i} className="text-sm font-bold text-white">{pld.name}: {pld.value}{pld.name === 'completion' || pld.name === 'Completion' ? '%' : ''}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#FAFAFA] font-sans overflow-x-hidden selection:bg-[#FF8A00]/30 pb-20">
      <TopNavbar />

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 md:pt-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A00]/20 to-orange-500/5 border border-[#FF8A00]/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-[#FF8A00]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">Global Analytics Dashboard</h1>
            <p className="text-xs md:text-sm text-gray-500">Track your progress across all Sheets and Patterns</p>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="flex items-center gap-2 mb-8 bg-[#111216]/60 p-1.5 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('overall')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overall' ? 'bg-[#FF8A00] text-black shadow-[0_0_15px_rgba(255,138,0,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={14} /> Overall
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sheets' ? 'bg-[#FF8A00] text-black shadow-[0_0_15px_rgba(255,138,0,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} /> Sheets
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'patterns' ? 'bg-[#FF8A00] text-black shadow-[0_0_15px_rgba(255,138,0,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BrainCircuit size={14} /> Patterns
          </button>
        </div>

        {activeTab === 'overall' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Overall Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-[#FF8A00]" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Progress</span>
                </div>
                <p className="text-3xl font-extrabold text-white">{Math.max(sheetsSolved, patternsTotalSolved)}</p>
                <p className="text-[10px] text-gray-500 mt-1">Unique problems solved</p>
              </div>
              
              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={14} className="text-orange-400" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Streak</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-extrabold text-orange-400">{d?.currentStreak || 0}</p>
                  <span className="text-xs text-gray-500">days</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Best: {d?.longestStreak || 0}d</p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} className="text-blue-400" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Sheets</span>
                </div>
                <p className="text-3xl font-extrabold text-blue-400">{sheetsData.filter(s => s.solvedProblems > 0).length}</p>
                <p className="text-[10px] text-gray-500 mt-1">Out of {sheetsData.length} sheets</p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit size={14} className="text-emerald-400" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Patterns</span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-400">{(d?.patternStats || []).filter((p: any) => p.solvedProblems > 0).length}</p>
                <p className="text-[10px] text-gray-500 mt-1">Out of {d?.totalPatterns || 0} patterns</p>
              </div>
            </div>

            {/* AI Mentor Insights */}
            <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[#FF8A00] h-5 w-5 animate-pulse" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Study Insights & Roadmap</h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">Custom study plans analyzed from your weak patterns and solving consistency.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-black border border-white/10 rounded-lg p-0.5 text-[9px] font-bold">
                    <button
                      onClick={() => setInsightsProvider('gemini')}
                      className={`px-2 py-1 rounded ${insightsProvider === 'gemini' ? 'bg-[#FF8A00] text-black font-extrabold' : 'text-gray-400'}`}
                    >
                      Gemini
                    </button>
                    <button
                      onClick={() => setInsightsProvider('groq')}
                      className={`px-2 py-1 rounded ${insightsProvider === 'groq' ? 'bg-[#FF8A00] text-black font-extrabold' : 'text-gray-400'}`}
                    >
                      Groq Llama
                    </button>
                  </div>

                  <button
                    onClick={handleGenerateInsights}
                    disabled={insightsLoading}
                    className="px-3.5 py-1.5 bg-[#FF8A00] hover:bg-orange-500 disabled:opacity-40 text-black font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-md shadow-[#FF8A00]/20"
                  >
                    {insightsLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="h-3 w-3" />
                        Ask AI Mentor
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiInsights ? (
                <div className="space-y-6 pt-2 border-t border-white/5 animate-in fade-in duration-500">
                  {/* Strength, Weakness & Effort Analysis Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Strong Topics */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                        <CheckCircle2 size={13} /> Topic Strengths
                      </div>
                      {renderInsightText(aiInsights.strongTopicsAnalysis)}
                    </div>

                    {/* Weak Topics */}
                    <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-[11px] uppercase tracking-wider">
                        <AlertTriangle size={13} /> Topic Weaknesses
                      </div>
                      {renderInsightText(aiInsights.weakTopicsAnalysis)}
                    </div>

                    {/* More Effort Required */}
                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                        <Target size={13} /> Effort Needed
                      </div>
                      {renderInsightText(aiInsights.effortRequiredAnalysis)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Mentorship Tips & Recommended Patterns */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-black/20 border border-white/5 p-4 rounded-xl">
                        <h4 className="text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-2">Mentor Feedback</h4>
                        {renderInsightText(aiInsights.learningTip)}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Recommended Focus Topics</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {aiInsights.recommendedPatterns.map((pat: string, idx: number) => {
                            const parts = pat.split(':');
                            return (
                              <div key={idx} className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                                <span className="text-[11px] font-bold text-[#FF8A00] block">{parts[0]}</span>
                                <span className="text-[10px] text-gray-400 mt-1 block">{parts[1] || ''}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Action Items & Placement perspective */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-[#FF8A00]/5 border border-[#FF8A00]/10 p-4 rounded-xl space-y-3">
                        <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Target className="text-[#FF8A00] h-3.5 w-3.5" /> Action Plan
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.actionItems.map((act: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-[11.5px] text-gray-200">
                              <span className="text-[#FF8A00] font-black mt-0.5">•</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="border border-white/5 bg-black/40 p-4 rounded-xl">
                        <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Interview Advantage</h4>
                        <p className="text-[11px] text-gray-400 italic leading-relaxed">"{aiInsights.careerAngle}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-t border-white/5 text-gray-500">
                  <p className="text-xs">Click <strong>"Ask AI Mentor"</strong> to get personal study roadmaps based on your current stats.</p>
                </div>
              )}
            </div>

            {/* Heatmap */}
            <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <Activity size={16} className="text-orange-400" /> Overall Activity Heatmap
              </h2>
              <p className="text-[11px] text-gray-500 mb-6">Last 365 days of problem solving activity across the platform.</p>
              
              {(d?.heatmapData || []).some((h: any) => h.count > 0) ? (
                <>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-1" style={{ minWidth: '700px' }}>
                      {[0,1,2,3,4,5,6,7,8,9,10,11].map(monthIdx => {
                        const monthData = (d?.heatmapData || []).filter((h: any) => {
                          const m = new Date(h.date).getMonth();
                          return m === monthIdx;
                        });
                        return (
                          <div key={monthIdx} className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] text-gray-600 mb-1">{MONTHS[monthIdx]}</span>
                            <div className="flex flex-wrap gap-1">
                              {monthData.map((h: any, i: number) => (
                                <HeatmapCell key={i} count={h.count} maxCount={Math.max(...(d?.heatmapData || []).map((x: any) => x.count), 1)} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-4">
                    <span className="text-[10px] text-gray-600">Less</span>
                    <div className="w-4 h-4 rounded-sm bg-[#1a1a2e]" />
                    <div className="w-4 h-4 rounded-sm bg-emerald-900/60" />
                    <div className="w-4 h-4 rounded-sm bg-emerald-700/70" />
                    <div className="w-4 h-4 rounded-sm bg-emerald-500/70" />
                    <div className="w-4 h-4 rounded-sm bg-emerald-400/80" />
                    <span className="text-[10px] text-gray-600">More</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Flame size={40} className="text-gray-700 mb-3" />
                  <p className="text-sm font-bold text-gray-400">No activity data yet</p>
                  <p className="text-xs text-gray-600 mt-1">Your solving heatmap will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sheets' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sheets Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-[#FF8A00]" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Solved</span>
                </div>
                <p className="text-3xl font-extrabold text-white">{sheetsSolved}</p>
                <p className="text-[10px] text-gray-500 mt-1">across all sheets</p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-[#FF8A00]" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Overall Completion</span>
                </div>
                <p className="text-3xl font-extrabold text-[#FF8A00]">{sheetsOverallPct}%</p>
                <div className="h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF8A00] to-orange-400 rounded-full transition-all duration-700" style={{ width: `${sheetsOverallPct}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Top Sheets by Completion</h2>
              <p className="text-[11px] text-gray-500 mb-6">Highest completion %</p>
              {sheetsBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sheetsBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="completion" fill="#FF8A00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-600 text-xs">No sheet data yet</div>
              )}
            </div>

            <div className="bg-[#111216]/40 border border-white/5 rounded-2xl overflow-hidden mb-8">
              <div className="p-5 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">All Sheets</h2>
                  <p className="text-[10px] text-gray-500">Sheet-wise completion breakdown</p>
                </div>
                <div className="flex items-center gap-2">
                  {['completion', 'name', 'remaining'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSortOption(s as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        sortOption === s ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30' : 'text-gray-400 bg-white/5 border border-white/10 hover:text-white'
                      }`}
                    >
                      {s === 'completion' ? 'By %' : s === 'name' ? 'A-Z' : 'Remaining'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {sortedSheets.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-500">No sheets found</div>
                )}
                {sortedSheets.map((s: any) => (
                  <Link
                    key={s.sheetId}
                    href={`/sheets/${s.slug}`}
                    className="flex items-center gap-3 md:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm font-bold text-white group-hover:text-[#FF8A00] transition-colors truncate">{s.title}</span>
                        {s.progressPercentage >= 100 && <Trophy size={12} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              s.progressPercentage >= 80 ? 'bg-emerald-400' :
                              s.progressPercentage >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${s.progressPercentage}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span className="font-bold text-white">{s.solvedProblems}/{s.totalProblems}</span>
                          <span className={`font-bold ${
                            s.progressPercentage >= 80 ? 'text-emerald-400' :
                            s.progressPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {s.progressPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Pattern Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-[#FF8A00]" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Solved</span>
                </div>
                <p className="text-3xl font-extrabold text-white">{patternsTotalSolved}</p>
                <p className="text-[10px] text-gray-500 mt-1">of {patternsTotalProblems} problems</p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit size={14} className="text-emerald-400" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Patterns</span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-400">{d?.patternsCompleted || 0}</p>
                <p className="text-[10px] text-gray-500 mt-1">of {d?.totalPatterns || 0} completed</p>
              </div>

              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-[#FF8A00]" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Completion</span>
                </div>
                <p className="text-3xl font-extrabold text-[#FF8A00]">{patternsCompletionPct}%</p>
                <div className="h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF8A00] to-orange-400 rounded-full transition-all duration-700" style={{ width: `${patternsCompletionPct}%` }} />
                </div>
              </div>
              
              <div className="bg-[#111216]/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-blue-400" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg / Day</span>
                </div>
                <p className="text-3xl font-extrabold text-blue-400">{d?.avgProblemsPerDay || 0}</p>
                <p className="text-[10px] text-gray-500 mt-1">problems per day</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pattern Difficulty Pie */}
              <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Difficulty Distribution</h2>
                <p className="text-[11px] text-gray-500 mb-6">Easy / Medium / Hard solved breakdown</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value: string) => <span className="text-xs text-gray-400">{value}</span>}
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-600 text-xs">No solved problems yet</div>
                )}
              </div>

              {/* Weekly Trend */}
              <div className="bg-[#111216]/40 border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Weekly Progress</h2>
                <p className="text-[11px] text-gray-500 mb-6">Problems solved per day</p>
                {weeklyChartData.some((w: any) => w.solved > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={weeklyChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF8A00" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF8A00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="solved" stroke="#FF8A00" strokeWidth={2} fill="url(#colorSolved)" dot={{ fill: '#FF8A00', r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-600 text-xs">No activity this week</div>
                )}
              </div>
            </div>
            
            {/* WEAK & STRONG PATTERNS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className={`bg-[#111216]/40 border rounded-2xl p-5 ${(d?.weakPatterns || []).length > 0 ? 'border-rose-500/20' : 'border-white/5'}`}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-400" /> Needs Practice
                </h3>
                <p className="text-[10px] text-gray-500 mb-4">Patterns under 30% completion</p>
                {(d?.weakPatterns || []).length > 0 ? (
                  <div className="space-y-3">
                    {d.weakPatterns.map((wp: any) => (
                      <Link key={wp.patternId || wp.title} href={`/patterns/${wp.patternId}`} className="block bg-[#0B0C10] border border-white/5 rounded-xl p-3.5 hover:border-rose-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{wp.title}</span>
                          <span className="text-[10px] font-bold text-rose-400">{wp.percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${wp.percentage}%` }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-emerald-400 font-bold text-xs">All patterns above 30%!</div>
                )}
              </div>
              <div className={`bg-[#111216]/40 border rounded-2xl p-5 ${(d?.strongPatterns || []).length > 0 ? 'border-emerald-500/20' : 'border-white/5'}`}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Trophy size={14} className="text-emerald-400" /> Mastered
                </h3>
                <p className="text-[10px] text-gray-500 mb-4">Patterns above 80% completion</p>
                {(d?.strongPatterns || []).length > 0 ? (
                  <div className="space-y-3">
                    {d.strongPatterns.map((sp: any) => (
                      <Link key={sp.patternId || sp.title} href={`/patterns/${sp.patternId}`} className="block bg-[#0B0C10] border border-white/5 rounded-xl p-3.5 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{sp.title}</span>
                          <span className="text-[10px] font-bold text-emerald-400">{sp.percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${sp.percentage}%` }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 text-xs">No patterns mastered yet</div>
                )}
              </div>
            </div>

            {/* Pattern-wise list */}
            <div className="bg-[#111216]/40 border border-white/5 rounded-2xl overflow-hidden mb-8">
              <div className="p-5 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">All Patterns</h2>
                  <p className="text-[10px] text-gray-500">Pattern-wise completion breakdown</p>
                </div>
                <div className="flex items-center gap-2">
                  {['completion', 'name', 'remaining'].map(s => (
                    <button
                      key={s}
                      onClick={() => setPatternSort(s as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        patternSort === s ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30' : 'text-gray-400 bg-white/5 border border-white/10 hover:text-white'
                      }`}
                    >
                      {s === 'completion' ? 'By %' : s === 'name' ? 'A-Z' : 'Remaining'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {sortedPatterns.map((p: any) => (
                  <Link
                    key={p.patternId}
                    href={`/patterns/${p.patternId}`}
                    className="flex items-center gap-3 md:gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm font-bold text-white group-hover:text-[#FF8A00] transition-colors truncate">{p.patternTitle}</span>
                        {p.categoryTitle && <span className="text-[9px] text-gray-600 hidden sm:inline">{p.categoryTitle}</span>}
                        {p.completionPercentage >= 100 && <Trophy size={12} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              p.completionPercentage >= 80 ? 'bg-emerald-400' :
                              p.completionPercentage >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${p.completionPercentage}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span className="font-bold text-white">{p.solvedProblems}/{p.totalProblems}</span>
                          <span className={`font-bold ${
                            p.completionPercentage >= 80 ? 'text-emerald-400' :
                            p.completionPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {p.completionPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Centered Custom Error Modal */}
      <AnimatePresence>
        {errorModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0e131f] p-6 shadow-2xl z-10"
            >
              {/* Glow decoration */}
              <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-[#FF8A00]/10 blur-3xl pointer-events-none" />
              
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF8A00] mb-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                
                <h3 className="text-base font-bold text-white mb-2">{errorModal.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6 whitespace-pre-line">{errorModal.message}</p>
                
                <button
                  onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2 bg-gradient-to-r from-[#FF8A00] to-orange-500 hover:from-orange-500 hover:to-[#FF8A00] text-black font-extrabold rounded-lg text-xs transition-all shadow-md shadow-[#FF8A00]/20"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
