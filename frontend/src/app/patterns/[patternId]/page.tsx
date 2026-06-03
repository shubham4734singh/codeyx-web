"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import TopNavbar from '../../../components/shared/TopNavbar';
import {
  ArrowLeft, Target, CheckCircle2,
  Loader2, AlertCircle, Filter,
} from 'lucide-react';
import {
  SiLeetcode,
  SiGeeksforgeeks,
  SiCodechef,
  SiCodeforces,
} from 'react-icons/si';
import Link from 'next/link';
import { patternsService } from '../../../services/patterns.service';
import { progressService } from '../../../services/progress.service';
import PlatformLinks from '../../../components/sheets/PlatformLinks';
import SolvedCheckbox from '../../../components/shared/SolvedCheckbox';
import { useProgressSyncStore } from '../../../store/progressSync.store';

// ─── Constants ────────────────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  Easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const patternDifficultyColors: Record<string, string> = {
  Beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Advanced: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

// ─── Platform filter config ────────────────────────────────────────────────────

interface PlatformFilterDef {
  key: string;
  label: string;
  Icon: any;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  /** Returns true if the given problem belongs to this platform */
  matches: (p: any) => boolean;
}

const PLATFORM_FILTERS: PlatformFilterDef[] = [
  {
    key: 'all',
    label: 'All',
    Icon: null,
    color: '#FF8A00',
    activeBg: 'bg-[#FF8A00]',
    activeBorder: 'border-[#FF8A00]',
    activeText: 'text-white',
    matches: () => true,
  },
  {
    key: 'leetcode',
    label: 'LeetCode',
    Icon: SiLeetcode,
    color: '#FFA116',
    activeBg: 'bg-[#FFA116]/20',
    activeBorder: 'border-[#FFA116]/60',
    activeText: 'text-[#FFA116]',
    matches: (p: any) =>
      !!(p.links?.leetcode) ||
      p.platform?.toLowerCase() === 'leetcode',
  },
  {
    key: 'geeksforgeeks',
    label: 'GFG',
    Icon: SiGeeksforgeeks,
    color: '#2F8D46',
    activeBg: 'bg-[#2F8D46]/20',
    activeBorder: 'border-[#2F8D46]/60',
    activeText: 'text-[#2F8D46]',
    matches: (p: any) =>
      !!(p.links?.geeksforgeeks || p.links?.gfg) ||
      p.platform?.toLowerCase().includes('geeks') ||
      p.platform?.toLowerCase() === 'gfg',
  },
  {
    key: 'codechef',
    label: 'CodeChef',
    Icon: SiCodechef,
    color: '#5B4638',
    activeBg: 'bg-amber-800/20',
    activeBorder: 'border-amber-700/60',
    activeText: 'text-amber-500',
    matches: (p: any) =>
      !!(p.links?.codechef) ||
      p.platform?.toLowerCase() === 'codechef',
  },
  {
    key: 'codeforces',
    label: 'Codeforces',
    Icon: SiCodeforces,
    color: '#1F8ACB',
    activeBg: 'bg-blue-500/20',
    activeBorder: 'border-blue-500/60',
    activeText: 'text-blue-400',
    matches: (p: any) =>
      !!(p.links?.codeforces) ||
      p.platform?.toLowerCase() === 'codeforces',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatternDetailPage({ params }: { params: { patternId: string } }) {
  const { patternId } = params;
  const { isSignedIn, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const globalSync = useProgressSyncStore();
  const toggleLockRef = useRef<Set<number>>(new Set());

  const [patternData, setPatternData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPatternDetail = async () => {
    setIsLoading(true);
    try {
      const response: any = await patternsService.getPatternDetail(patternId);
      const data = response?.data || response;
      setPatternData(data);
    } catch (err) {
      console.error('[PatternDetail] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !patternId) return;
    fetchPatternDetail();
  }, [patternId, isLoaded, isSignedIn]);

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const allProblems: any[] = patternData?.problems || [];

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pf of PLATFORM_FILTERS) {
      counts[pf.key] = pf.key === 'all'
        ? allProblems.length
        : allProblems.filter(pf.matches).length;
    }
    return counts;
  }, [allProblems]);

  const filteredProblems = useMemo(() => {
    const pfDef = PLATFORM_FILTERS.find(f => f.key === platformFilter)!;
    return allProblems.filter(p => {
      const matchesDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
      const matchesPlatform = pfDef.matches(p);
      return matchesDiff && matchesPlatform;
    });
  }, [allProblems, difficultyFilter, platformFilter]);

  // ─── Toggle handler ─────────────────────────────────────────────────────────

  const handleToggle = async (problemId: number) => {
    if (!isSignedIn) return;
    if (toggleLockRef.current.has(problemId)) return;
    toggleLockRef.current.add(problemId);

    setToggleLoading(problemId);
    setToggleError(null);

    const problem = allProblems.find((p: any) => p.problemId === problemId);
    const prevSolved = problem?.solved ?? false;
    const newSolved = !prevSolved;

    // Update global sync
    if (newSolved) globalSync.markSolved(problemId);
    else globalSync.markUnsolved(problemId);

    // Optimistic update
    setPatternData((prev: any) => {
      if (!prev) return prev;
      const newProblems = prev.problems.map((p: any) =>
        p.problemId === problemId ? { ...p, solved: newSolved } : p
      );
      const inc = newSolved ? 1 : -1;
      return {
        ...prev,
        problems: newProblems,
        solvedProblems: Math.max(0, (prev.solvedProblems || 0) + inc),
        progressPercentage: prev.totalProblems
          ? Math.round(((Math.max(0, (prev.solvedProblems || 0) + inc)) / prev.totalProblems) * 100)
          : 0,
      };
    });

    try {
      await progressService.toggleProblem(problemId);
      queryClient.invalidateQueries({ queryKey: ['sheetProgress'] });
      queryClient.invalidateQueries({ queryKey: ['stepProgress'] });
      queryClient.invalidateQueries({ queryKey: ['rbCategories'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    } catch (err: any) {
      console.error('[PatternDetail] Toggle error:', err);
      // Rollback
      if (newSolved) globalSync.markUnsolved(problemId);
      else globalSync.markSolved(problemId);
      setPatternData((prev: any) => {
        if (!prev) return prev;
        const reverted = prev.problems.map((p: any) =>
          p.problemId === problemId ? { ...p, solved: prevSolved } : p
        );
        const inc = prevSolved ? 1 : -1;
        return {
          ...prev,
          problems: reverted,
          solvedProblems: Math.max(0, (prev.solvedProblems || 0) + inc),
          progressPercentage: prev.totalProblems
            ? Math.round(((Math.max(0, (prev.solvedProblems || 0) + inc)) / prev.totalProblems) * 100)
            : 0,
        };
      });
      setToggleError(err?.message || 'Failed to save. Please try again.');
      setTimeout(() => setToggleError(null), 4000);
    } finally {
      setToggleLoading(null);
      toggleLockRef.current.delete(problemId);
    }
  };

  // ─── Loading / Error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-[#FAFAFA] font-sans">
        <TopNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="text-[#FF8A00] animate-spin" />
        </div>
      </div>
    );
  }

  if (!patternData) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-[#FAFAFA] font-sans">
        <TopNavbar />
        <div className="max-w-[1400px] mx-auto px-6 pt-20 text-center">
          <p className="text-gray-400">Pattern not found.</p>
          <Link href="/patterns" className="text-[#FF8A00] text-sm mt-4 inline-block">← Back to Patterns</Link>
        </div>
      </div>
    );
  }

  const { pattern, category, totalProblems, solvedProblems, progressPercentage } = patternData;
  const diffColor = patternDifficultyColors[pattern?.difficulty] || 'text-gray-400 bg-white/5';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#FAFAFA] font-sans overflow-x-hidden selection:bg-[#FF8A00]/30 pb-20">
      <TopNavbar />
      <main className="max-w-[1200px] mx-auto px-6 pt-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link href="/patterns" className="text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={16} /> Patterns
          </Link>
          {category && (
            <>
              <span className="text-gray-600">/</span>
              <span className="text-gray-300">{category.title}</span>
            </>
          )}
          <span className="text-gray-600">/</span>
          <span className="text-[#FF8A00]">{pattern?.title}</span>
        </div>

        {/* Pattern Hero */}
        <div className="bg-[#111216]/60 border border-white/5 rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF8A00]/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-extrabold text-white">{pattern?.title}</h1>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${diffColor}`}>
                    {pattern?.difficulty}
                  </span>
                </div>
                {pattern?.description && (
                  <p className="text-sm text-gray-400 max-w-2xl">{pattern.description}</p>
                )}
              </div>
              {category && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  <Target size={16} className="text-[#FF8A00]" />
                  <span className="text-xs font-bold text-gray-300">{category.title}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm text-gray-300">
                    <span className="font-bold text-white">{solvedProblems}</span> / {totalProblems} solved
                  </span>
                </div>
                <span className="text-sm font-bold text-[#FF8A00]">{progressPercentage}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8A00] to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Platform Filter ────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter size={13} className="text-gray-500" />
            <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest">Platform</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PLATFORM_FILTERS.map(pf => {
              const count = platformCounts[pf.key] ?? 0;
              const isActive = platformFilter === pf.key;
              const isAllBtn = pf.key === 'all';

              return (
                <button
                  key={pf.key}
                  onClick={() => setPlatformFilter(pf.key)}
                  disabled={count === 0 && !isAllBtn}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200
                    ${count === 0 && !isAllBtn ? 'opacity-30 cursor-not-allowed border-white/5 text-gray-600' :
                      isActive
                        ? isAllBtn
                          ? 'bg-[#FF8A00] border-[#FF8A00] text-white shadow-[0_0_16px_rgba(255,138,0,0.35)]'
                          : `${pf.activeBg} ${pf.activeBorder} ${pf.activeText}`
                        : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                    }
                  `}
                >
                  {pf.Icon && <pf.Icon size={12} style={{ color: isActive ? undefined : '#888' }} />}
                  {pf.label}
                  <span className={`
                    ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold
                    ${isActive
                      ? isAllBtn ? 'bg-white/20 text-white' : 'bg-white/10'
                      : 'bg-white/5 text-gray-500'
                    }
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Difficulty Filter ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Filter size={13} className="text-gray-500" />
            <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-widest">Difficulty</span>
          </div>
          <div className="flex items-center gap-2">
            {['All', 'Easy', 'Medium', 'Hard'].map(d => (
              <button
                key={d}
                onClick={() => setDifficultyFilter(d)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  difficultyFilter === d
                    ? 'bg-[#FF8A00] text-white shadow-[0_0_15px_rgba(255,138,0,0.4)]'
                    : 'bg-transparent text-gray-400 border border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
            <span className="text-xs text-gray-500 ml-2">{filteredProblems.length} problems</span>
          </div>
        </div>

        {/* Error Toast */}
        {toggleError && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 mb-4 text-sm text-rose-400">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{toggleError}</span>
          </div>
        )}

        {/* ── Problem List ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          {(pattern.leetCount || 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00A8E8]/10 border border-[#00A8E8]/20 text-[#00A8E8] mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A8E8] inline-block" /> {pattern.leetCount} LC
            </span>
          )}
          {(pattern.gfgCount || 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF8A00]/10 border border-[#FF8A00]/20 text-[#FF8A00]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] inline-block" /> {pattern.gfgCount} GFG
            </span>
          )}
          {filteredProblems.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Filter size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-400 text-sm font-medium">No problems match the selected filters</p>
              <p className="text-gray-600 text-xs mt-1">
                {platformFilter !== 'all'
                  ? `No problems found on ${PLATFORM_FILTERS.find(f => f.key === platformFilter)?.label}. Try "All".`
                  : 'Try changing the difficulty filter.'}
              </p>
            </div>
          )}

          {filteredProblems.map((problem: any, i: number) => {
            const dColor = difficultyColors[problem.difficulty] || 'text-gray-400 bg-white/5';
            const isToggling = toggleLoading === problem.problemId;

            // Determine which platform links are available (for badge display)
            const availablePlatforms: Array<{ key: string; label: string; Icon: any; color: string }> = [];
            if (problem.links?.leetcode) {
              availablePlatforms.push({ key: 'lc', label: 'LeetCode', Icon: SiLeetcode, color: '#FFA116' });
            }
            if (problem.links?.geeksforgeeks || problem.links?.gfg) {
              availablePlatforms.push({ key: 'gfg', label: 'GFG', Icon: SiGeeksforgeeks, color: '#2F8D46' });
            }
            if (problem.links?.codechef) {
              availablePlatforms.push({ key: 'cc', label: 'CodeChef', Icon: SiCodechef, color: '#b5651d' });
            }
            if (problem.links?.codeforces) {
              availablePlatforms.push({ key: 'cf', label: 'Codeforces', Icon: SiCodeforces, color: '#1F8ACB' });
            }

            return (
              <div
                key={problem.problemId}
                className={`group bg-[#111216]/40 border rounded-xl p-4 flex items-center gap-4 transition-all ${
                  problem.solved
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                <SolvedCheckbox
                  isSolved={problem.solved}
                  isLoading={isToggling}
                  disabled={!isSignedIn}
                  onToggle={() => handleToggle(problem.problemId)}
                  size="md"
                />

                <span className="text-xs font-bold text-gray-600 w-6 flex-shrink-0">{i + 1}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold transition-colors ${problem.solved ? 'text-emerald-400' : 'text-white group-hover:text-[#FF8A00]'}`}>
                      {problem.name}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${dColor}`}>
                      {problem.difficulty}
                    </span>
                    {/* Platform mini-badges */}
                    {availablePlatforms.map(ap => (
                      <span
                        key={ap.key}
                        className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10"
                        style={{ color: ap.color }}
                        title={ap.label}
                      >
                        <ap.Icon size={9} />
                        {ap.label}
                      </span>
                    ))}
                  </div>
                  {(problem.tags || []).length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {(problem.tags as string[]).slice(0, 4).map((tag: string, ti: number) => (
                        <span key={ti} className="text-[9px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <PlatformLinks
                    links={problem.links}
                    videos={problem.videos}
                    editorials={problem.editorials}
                    platform={problem.platform}
                    link={problem.link}
                    youtubeUrl={problem.youtubeUrl}
                    articleUrl={problem.articleUrl}
                    size="sm"
                    problemTitle={problem.name}
                    showCopyLink
                  />
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
