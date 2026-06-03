"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  CheckSquare, Square, Play, RotateCcw, FolderGit2, Bot, Calendar, Download, Eye,
  Globe, Trophy, Flame, CheckCircle2, Target, Code2, Layers,
  MonitorSmartphone, Briefcase, ChevronRight, Activity, TrendingUp,
  Zap, BookOpen, Crown, User, Plus, Trash2, Sparkles, Rocket, Bell
} from 'lucide-react';
import ActivityHeatmap from '../../components/dashboard/ActivityHeatmap';
import TopNavbar from '../../components/shared/TopNavbar';
import { useSocket } from '../../hooks/useSocket';
import DashboardAdCard from '../../components/shared/DashboardAdCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { platformService } from '../../services/platform.service';
import { progressService } from '../../services/progress.service';

export default function CodeyxDashboard() {
  const [theme, setTheme] = useState('dark');
  const [comingSoonTitle, setComingSoonTitle] = useState('');
  const [showMockModal, setShowMockModal] = useState(false);
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [adminNotification, setAdminNotification] = useState<any>(null);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  type Task = { id: number; text: string; done: boolean; };
  const [checklist, setChecklist] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isChecklistLoaded, setIsChecklistLoaded] = useState(false);

  const userName = isLoaded && user?.firstName ? user.firstName : 'Lalit';
  const userImage = isLoaded && user?.imageUrl ? user.imageUrl : null;
  const userId = user?.id || 'demo-user-123'; // fallback for testing

  React.useEffect(() => {
    if (!userId) return;
    const storageKey = `codeyx_daily_tasks_${userId}`;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.date !== todayStr) {
          // New day! Reset checkboxes but keep tasks
          const resetTasks = parsed.tasks.map((t: Task) => ({ ...t, done: false }));
          setChecklist(resetTasks);
          localStorage.setItem(storageKey, JSON.stringify({ date: todayStr, tasks: resetTasks }));
        } else {
          setChecklist(parsed.tasks || []);
        }
      } else {
        // Default tasks
        const defaultTasks = [
          { id: 1, text: 'Solve 2 DSA problems', done: false },
          { id: 2, text: 'Sync platform stats', done: false },
        ];
        setChecklist(defaultTasks);
        localStorage.setItem(storageKey, JSON.stringify({ date: todayStr, tasks: defaultTasks }));
      }
    } catch (e) {
      console.error('Error loading checklist', e);
    }
    setIsChecklistLoaded(true);
  }, [userId]);

  const saveChecklist = (newTasks: Task[]) => {
    setChecklist(newTasks);
    if (!userId) return;
    const storageKey = `codeyx_daily_tasks_${userId}`;
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(storageKey, JSON.stringify({ date: todayStr, tasks: newTasks }));
  };

  const toggleTask = (id: number) => {
    const updated = checklist.map(t => (t.id === id ? { ...t, done: !t.done } : t));
    saveChecklist(updated);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = { id: Date.now(), text: newTaskText.trim(), done: false };
    saveChecklist([...checklist, newTask]);
    setNewTaskText('');
  };

  const deleteTask = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    saveChecklist(checklist.filter(t => t.id !== id));
  };

  // Listen to Realtime Events
  React.useEffect(() => {
    if (socket) {
      socket.on('SYNC_COMPLETE', (data) => {
        console.log('Got live sync update for', data.platform);
        queryClient.invalidateQueries({ queryKey: ['platformStats'] });
      });
      socket.on('NEW_NOTIFICATION', (notification) => {
        setAdminNotification(notification);
      });
    }
    return () => {
      socket?.off('SYNC_COMPLETE');
      socket?.off('NEW_NOTIFICATION');
    };
  }, [socket, queryClient]);

  // Fetch initial notifications
  React.useEffect(() => {
    const fetchAdminNotification = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`http://localhost:5005/api/notifications`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          // Find the most recent unread notification
          const unread = data.data.find((n: any) => !n.read);
          if (unread) setAdminNotification(unread);
        }
      } catch (err) {}
    };
    if (isLoaded && user) {
      fetchAdminNotification();
    }
  }, [isLoaded, user, getToken]);

  // Fetch REAL LeetCode Stats
  const { data: leetcodeRes, isLoading: lcLoading } = useQuery({
    queryKey: ['platformStats', 'leetcode', userId],
    queryFn: () => platformService.getPlatformStats('leetcode', userId),
    enabled: !!userId,
  });

  // Fetch REAL GitHub Stats
  const { data: githubRes, isLoading: gitLoading } = useQuery({
    queryKey: ['platformStats', 'github', userId],
    queryFn: () => platformService.getPlatformStats('github', userId),
    enabled: !!userId,
  });

  // Fetch REAL Codechef Stats
  const { data: codechefRes, isLoading: ccLoading } = useQuery({
    queryKey: ['platformStats', 'codechef', userId],
    queryFn: () => platformService.getPlatformStats('codechef', userId),
    enabled: !!userId,
  });

  // Fetch Leaderboard Top 3
  const { data: top3Leaderboard, isLoading: top3Loading } = useQuery({
    queryKey: ['leaderboardTop3'],
    queryFn: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/leaderboard`);
        const data = await res.json();
        if (data.success && data.data) {
          // Sort exactly like the contest leaderboard logic: descending by rawCombinedRating or rating
          const sorted = data.data.sort((a: any, b: any) => (b.rawCombinedRating || b.rating || 0) - (a.rawCombinedRating || a.rating || 0));
          return sorted.slice(0, 3);
        }
        return [];
      } catch (e) {
        return [];
      }
    },
  });

  // Fetch REAL Codeyx Progress Stats
  const { data: progressStatsRes, isLoading: progressStatsLoading } = useQuery({
    queryKey: ['progressStats', userId],
    queryFn: () => progressService.getProgressStats(),
    enabled: !!userId,
  });

  // Fixed data paths: interceptor returns response.data → ApiResponse → .data = PlatformStats
  const lcData = leetcodeRes?.data;
  const lcTotalSolved = lcData?.totalSolved || 0;
  const lcRating = lcData?.rating || 0;
  const lcEasy = lcData?.stats?.easy || 0;
  const lcMedium = lcData?.stats?.medium || 0;
  const lcHard = lcData?.stats?.hard || 0;
  const lcRank = lcData?.stats?.rank || 0;
  const lcCalendar = lcData?.stats?.raw?.matchedUser?.userCalendar?.submissionCalendar || '{}';

  const ghData = githubRes?.data;
  const ghRepos = ghData?.stats?.repos || 0;
  const ghStars = ghData?.stats?.totalStars || 0;
  const ghFollowers = ghData?.stats?.followers || 0;

  const ccData = codechefRes?.data;
  const ccRating = ccData?.rating || 0;
  const ccStars = ccData?.stats?.stars || 0;

  // Compute streak from LC calendar
  const calObj: Record<string, number> = (() => { try { return JSON.parse(lcCalendar); } catch { return {}; } })();
  
  // Merge exact daily tasks completion into the heatmap real-time
  const mergedCalendarObj = { ...calObj };
  const completedTasksCount = checklist.filter(t => t.done).length;
  if (completedTasksCount > 0) {
    const d = new Date();
    // LeetCode calendar uses UTC midnight timestamps
    const midnightUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
    mergedCalendarObj[midnightUTC.toString()] = (mergedCalendarObj[midnightUTC.toString()] || 0) + completedTasksCount;
  }
  const mergedCalendarStr = JSON.stringify(mergedCalendarObj);

  const sortedDays = Object.keys(mergedCalendarObj).map(Number).sort((a, b) => b - a);
  let streak = 0;
  const today = Math.floor(Date.now() / 86400000);
  for (let i = 0; i < sortedDays.length; i++) {
    const dayDiff = today - Math.floor(sortedDays[i] / 86400);
    if (dayDiff === i || dayDiff === i + 1) streak++;
    else break;
  }
  const totalActiveDays = Object.values(mergedCalendarObj).filter(v => v > 0).length;

  // Skill score: weighted avg of available ratings, fallback to problems solved
  let skillScore = 0;
  if (lcRating > 0 || ccRating > 0) {
    skillScore = Math.min(100, Math.round(((lcRating || 0) * 0.5 + (ccRating || 0) * 0.5) / 20));
  } else if (lcTotalSolved > 0) {
    skillScore = Math.min(100, Math.round(lcTotalSolved / 10));
  }

  // Topic breakdown from Codeyx Platform Progress
  const codeyxStats = progressStatsRes?.data;
  const easyTotal = codeyxStats?.easy?.total || 1;
  const mediumTotal = codeyxStats?.medium?.total || 1;
  const hardTotal = codeyxStats?.hard?.total || 1;

  const easySolvedCodeyx = codeyxStats?.easy?.solved || 0;
  const mediumSolvedCodeyx = codeyxStats?.medium?.solved || 0;
  const hardSolvedCodeyx = codeyxStats?.hard?.solved || 0;

  const topicData = codeyxStats && codeyxStats.total > 0 ? [
    { name: 'Easy', val: Math.round((easySolvedCodeyx / easyTotal) * 100), color: 'text-emerald-400', stroke: '#34d399', solved: easySolvedCodeyx },
    { name: 'Medium', val: Math.round((mediumSolvedCodeyx / mediumTotal) * 100), color: 'text-amber-400', stroke: '#fbbf24', solved: mediumSolvedCodeyx },
    { name: 'Hard', val: Math.round((hardSolvedCodeyx / hardTotal) * 100), color: 'text-rose-500', stroke: '#f43f5e', solved: hardSolvedCodeyx },
  ] : [];

  // Theme classes
  const cardBg = "bg-[#101014]";
  const border = "border-white/5";

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans overflow-x-hidden selection:bg-[#FF8A00]/30 pb-12">

      {/* 📌 TOP NAVBAR */}
      <TopNavbar />

      {/* 🏠 MAIN DASHBOARD GRID */}
      <main className="max-w-[1600px] mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* LEFT COLUMN GROUP (3 Cols) */}
          <div className="xl:col-span-3 space-y-6">

            {/* ROW 1: Hero & Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* 1️⃣ Welcome Hero Section */}
              <div className={`lg:col-span-2 ${cardBg} border ${border} rounded-[24px] p-8 relative overflow-hidden flex flex-col justify-between shadow-xl`}>
                <div className="absolute top-0 right-0 w-[400px] h-full opacity-20 pointer-events-none flex items-center justify-end pr-10">
                  {/* Futuristic Code Icon Graphic */}
                  <div className="relative">
                    <Code2 size={160} className="text-[#FF8A00] animate-pulse" strokeWidth={1} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#FF8A00] rounded-full blur-[80px]" />
                  </div>
                </div>

                <div className="relative z-10">
                  <h1 className="text-3xl font-extrabold text-white mb-1 flex items-center gap-3">
                    Good Evening, {userName}! <Sparkles className="text-[#FF8A00] animate-pulse" size={28} />
                  </h1>
                  <p className="text-[#A1A1AA] text-sm">Consistency today, success tomorrow.</p>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-10 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Flame className="text-[#FF8A00]" size={24} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">Active Streak</p>
                      {lcLoading ? <div className="h-6 w-16 bg-white/10 animate-pulse rounded mt-0.5" /> : (
                        <p className="text-xl font-black text-white mt-0.5">{streak} <span className="text-xs text-[#FF8A00] font-bold">days</span></p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="text-emerald-400" size={24} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">Problems Solved (LC)</p>
                      {lcLoading ? (
                        <div className="h-6 w-16 bg-white/10 animate-pulse rounded mt-0.5"></div>
                      ) : (
                        <p className="text-xl font-black text-white mt-0.5 text-emerald-400">
                          {lcTotalSolved.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">LC Contest Rating</p>
                      {lcLoading ? (
                        <div className="h-6 w-16 bg-white/10 animate-pulse rounded mt-0.5"></div>
                      ) : (
                        <p className="text-xl font-black text-white mt-0.5 text-blue-400">
                          {lcRating.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2️⃣ Daily Checklist Card */}
              <div className={`${cardBg} border ${border} rounded-[24px] p-6 shadow-xl flex flex-col`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-white">Daily Checklist</h3>
                  <span className="text-[10px] font-bold text-[#FF8A00]">{checklist.filter(t => t.done).length}/{checklist.length} done</span>
                </div>
                <div className="flex-1 flex flex-col gap-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {checklist.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-4">No tasks for today. Add one below!</div>
                  ) : (
                    checklist.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => toggleTask(task.id)}
                        className="flex items-center gap-3 cursor-pointer group justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all ${task.done ? 'bg-[#FF8A00] border-[#FF8A00] text-[#101014]' : 'bg-transparent border-white/20 text-transparent group-hover:border-[#FF8A00]/50'}`}>
                            <CheckSquare size={12} strokeWidth={4} className={task.done ? 'opacity-100' : 'opacity-0'} />
                          </div>
                          <span className={`text-xs font-bold transition-colors truncate ${task.done ? 'text-gray-500 line-through' : 'text-gray-300 group-hover:text-white'}`}>
                            {task.text}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => deleteTask(task.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all shrink-0 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={addTask} className="mt-4 flex gap-2">
                  <input 
                    type="text" 
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a new daily task..." 
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#FF8A00]/50 transition-all"
                  />
                  <button type="submit" disabled={!newTaskText.trim()} className="bg-[#FF8A00] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-500 text-white rounded-lg w-8 h-8 flex items-center justify-center shrink-0 transition-all">
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </form>
              </div>
            </div>

            {/* ADMIN NOTIFICATION BANNER */}
            {adminNotification && (
              <div 
                onClick={() => setSelectedNotification(adminNotification)}
                className={`mb-6 relative overflow-hidden rounded-[24px] p-6 shadow-xl border border-[#FF8A00]/30 bg-gradient-to-r from-[#FF8A00]/10 to-[#101014] cursor-pointer hover:border-[#FF8A00]/50 hover:shadow-[0_0_20px_rgba(255,138,0,0.15)] transition-all group`}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF8A00]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2 group-hover:bg-[#FF8A00]/20 transition-all" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#FF8A00]/20 flex items-center justify-center shrink-0 border border-[#FF8A00]/30 group-hover:scale-110 transition-transform">
                    <Bell className="text-[#FF8A00] animate-pulse" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                      {adminNotification.title || "Admin Announcement"}
                      <span className="bg-[#FF8A00] text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-3xl line-clamp-2">
                      {adminNotification.message}
                    </p>
                    <p className="text-[#FF8A00] text-xs font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to read full message &rarr;</p>
                  </div>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      setAdminNotification(null);
                      try {
                        const token = await getToken();
                        await fetch(`http://localhost:5005/api/notifications/read`, { method: "PUT", headers: { "Authorization": `Bearer ${token}` }});
                      } catch(err) {}
                    }}
                    className="shrink-0 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-2 rounded-xl transition-all z-20"
                    title="Dismiss"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ROW 2: Continue Solving & Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

              {/* 3️⃣ Continue Solving Section */}
              <div className={`xl:col-span-2 ${cardBg} border ${border} rounded-[24px] p-6 shadow-xl relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A00]/5 rounded-full blur-2xl pointer-events-none" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2 mb-4">
                  <Play size={14} className="text-[#FF8A00]" /> Continue Solving
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
                  <Play size={28} className="text-white/10" />
                  <p className="text-xs text-gray-600 text-center">Start a sheet from<br /><span className="text-[#FF8A00]">Explore Sheets</span> to track progress here.</p>
                  <Link href="/explore-sheets">
                    <button className="mt-2 bg-[#FF8A00]/10 hover:bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/20 rounded-xl px-4 py-2 text-xs font-bold transition-all">
                      Browse Sheets
                    </button>
                  </Link>
                </div>
              </div>

              {/* 4️⃣ Quick Actions Grid */}
              <div className="xl:col-span-3">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-[#FF8A00]" />
                  <h3 className="font-bold text-sm text-white">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Layers, title: 'Explore Sheets', desc: '450+ curated sheets', color: 'text-blue-400', link: '/explore-sheets' },
                    { icon: RotateCcw, title: 'Sync Platforms', desc: 'LeetCode, GFG & more', color: 'text-orange-400', action: 'sync' },
                    { icon: BookOpen, title: 'My Notes', desc: 'Your personal notes', color: 'text-pink-400', action: 'coming_soon' },
                    { icon: FolderGit2, title: 'Projects', desc: 'Track and build projects', color: 'text-emerald-400', link: '/explore-projects' },
                    { icon: Bot, title: 'AI Mock Interview', desc: 'Practice & improve', color: 'text-cyan-400', action: 'coming_soon' },
                    { icon: Play, title: 'Resume Last Problem', desc: 'Binary Tree Inorder Traversal', color: 'text-green-400', link: '/explore-sheets' },
                  ].map((actionItem, i) => {
                    const content = (
                      <div
                        onClick={() => {
                          if (actionItem.action === 'sync') {
                            platformService.syncPlatform('leetcode', userId, user?.username || '');
                            platformService.syncPlatform('github', userId, user?.username || '');
                            platformService.syncPlatform('codechef', userId, user?.username || '');
                          } else if (actionItem.action === 'coming_soon') {
                            setComingSoonTitle(actionItem.title);
                            setShowMockModal(true);
                          }
                        }}
                        className={`${cardBg} border ${border} rounded-[16px] p-4 flex items-center justify-between cursor-pointer group hover:border-[#FF8A00]/30 hover:bg-white/[0.02] transition-all h-full`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white/5 border border-white/5 group-hover:scale-110 transition-transform ${actionItem.color}`}>
                            <actionItem.icon size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{actionItem.title}</p>
                            <p className="text-[10px] text-[#A1A1AA] mt-0.5">{actionItem.desc}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-[#FF8A00] transition-colors" />
                      </div>
                    );
                    
                    return actionItem.link ? (
                      <Link href={actionItem.link} key={i} className="block h-full">
                        {content}
                      </Link>
                    ) : (
                      <div key={i} className="block h-full">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ROW 3: Topic Analysis */}
            <div className={`${cardBg} border ${border} rounded-[24px] p-6 shadow-xl`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-[#FF8A00]" /> Topic Analysis
                </h3>
                <select aria-label="Topic Analysis time range" className="bg-[#09090B] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#A1A1AA] outline-none focus:border-[#FF8A00]/50">
                  <option>This Month</option>
                  <option>All Time</option>
                </select>
              </div>

              {progressStatsLoading ? (
                <div className="flex gap-4">{[1, 2, 3].map(i => <div key={i} className="flex-1 h-28 bg-white/5 animate-pulse rounded-2xl" />)}</div>
              ) : topicData.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">Start solving problems in sheets to see breakdown</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {topicData.map((topic, i) => (
                    <div key={i} className="bg-[#09090B] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-400 mb-3">{topic.name}</span>
                      <div className="relative w-16 h-16 mb-3">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle className="text-white/5" strokeWidth="4" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
                          <circle strokeWidth="4" strokeDasharray={176} strokeDashoffset={176 - (176 * topic.val) / 100} strokeLinecap="round" stroke={topic.stroke} fill="transparent" r="28" cx="32" cy="32" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-black text-white">{topic.val}%</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold ${topic.color}`}>{topic.solved > 0 ? `${topic.solved} solved` : '0 solved'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ROW 4: Coding Activity Heatmap */}
            <div className={`${cardBg} border ${border} rounded-[24px] p-6 shadow-xl`}>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={16} className="text-[#FF8A00]" />
                    <h3 className="font-bold text-sm text-white">Coding Activity</h3>
                    <span className="text-[10px] text-gray-500 ml-2">Keep the streak alive!</span>
                  </div>
                  {/* Reuse existing component, wrap to fit styling if needed */}
                  <div className="mt-4 opacity-90 hover:opacity-100 transition-opacity">
                    <ActivityHeatmap submissionCalendar={mergedCalendarStr} theme="dark" />
                  </div>
                </div>

                <div className="flex md:flex-col gap-6 md:w-32 shrink-0">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Longest Streak</p>
                    <p className="text-xl font-black text-[#FF8A00]">{lcLoading ? '—' : streak} <span className="text-[10px] font-bold">days</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Active Days</p>
                    <p className="text-xl font-black text-[#FF8A00]">{lcLoading ? '—' : totalActiveDays} <span className="text-[10px] font-bold">days</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Ads Card Widget (Fills empty space in the Left Column) */}
            <DashboardAdCard />

          </div>

          {/* RIGHT COLUMN (1 Col) */}
          <div className="space-y-6">

            {/* Google Ads Card Widget */}
            <DashboardAdCard />

            {/* 5️⃣ Upcoming Contests Panel */}
            <div className={`${cardBg} border ${border} rounded-[24px] p-6 shadow-xl`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Trophy size={16} className="text-[#FF8A00]" /> Upcoming Contests
                </h3>
                <Link href="/contests" className="text-[10px] font-bold text-[#FF8A00] cursor-pointer hover:underline">View all</Link>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'Codeforces Round 945 (Div. 2)', time: 'Tomorrow, 8:00 PM', status: 'Registered', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                  { title: 'LeetCode Weekly Contest 402', time: 'Sunday, 8:00 AM', status: 'Active', badge: 'bg-[#FF8A00]/10 text-[#FF8A00] border-[#FF8A00]/20' },
                  { title: 'AtCoder Beginner Contest 356', time: 'Saturday, 9:30 AM', status: 'Upcoming', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                ].map((c, i) => (
                  <div key={i} className="group">
                    <h4 className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{c.title}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">{c.time}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${c.badge}`}>
                        {c.status}
                      </span>
                    </div>
                    {i !== 2 && <div className="h-px bg-white/5 w-full mt-4" />}
                  </div>
                ))}
              </div>

              <Link href="/contests">
                <button className="w-full mt-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                  View Calendar <Calendar size={14} />
                </button>
              </Link>
            </div>

            {/* 6️⃣ Portfolio Analytics */}
            <div className={`${cardBg} border ${border} rounded-[24px] p-6 shadow-xl`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sm text-white">Portfolio Analytics</h3>
                <select aria-label="Portfolio Analytics time range" className="bg-transparent border-none text-[10px] text-gray-500 font-bold outline-none cursor-pointer">
                  <option className="bg-[#101014] text-white">This month</option>
                  <option className="bg-[#101014] text-white">Last month</option>
                  <option className="bg-[#101014] text-white">This year</option>
                  <option className="bg-[#101014] text-white">All time</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">LeetCode Rating</span>
                  {lcLoading ? (
                    <div className="h-4 w-12 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-xs font-bold text-[#FF8A00]">{lcRating > 0 ? Math.round(lcRating) : '—'}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">LeetCode Solved</span>
                  {lcLoading ? (
                    <div className="h-4 w-12 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-xs font-bold text-[#FF8A00]">{lcTotalSolved > 0 ? lcTotalSolved : '—'}</span>
                  )}
                </div>
                <div className="h-px bg-white/5 w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">CodeChef Rating</span>
                  {ccLoading ? (
                    <div className="h-4 w-12 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-xs font-bold text-[#FF8A00]">{ccRating > 0 ? ccRating : '—'}</span>
                  )}
                </div>
                <div className="h-px bg-white/5 w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">GitHub Stars</span>
                  {gitLoading ? (
                    <div className="h-4 w-12 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    <span className="text-xs font-bold text-[#FF8A00]">{ghStars}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">GitHub Repos</span>
                  {gitLoading ? <div className="h-4 w-12 bg-white/10 animate-pulse rounded" /> : <span className="text-xs font-bold text-[#FF8A00]">{ghRepos}</span>}
                </div>
                <div className="h-px bg-white/5 w-full" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Codeyx Skill Score</span>
                    <span className="text-xs font-bold text-[#FF8A00]">{skillScore > 0 ? `${skillScore} / 100` : 'Sync to calculate'}</span>
                  </div>
                  <div className="h-1.5 bg-[#09090B] rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-[#FF8A00] rounded-full" style={{ width: `${skillScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 9️⃣ Chrome Extension Card */}
            <div className={`border border-[#FF8A00]/20 bg-gradient-to-br from-[#101014] to-[#1a130c] p-6 rounded-[24px] shadow-2xl relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A00]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#FF8A00]/20 transition-colors" />

              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-[#FF8A00] flex items-center justify-center shadow-[0_0_15px_rgba(255,138,0,0.4)]">
                  <MonitorSmartphone size={16} className="text-white" />
                </div>
                <h4 className="font-extrabold text-sm text-white">Codeyx Chrome Extension</h4>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed mb-5 relative z-10">
                Sync submissions instantly. Install the extension to auto-track LeetCode & Codeforces.
              </p>

              <button 
                onClick={() => {
                  setComingSoonTitle('Codeyx Chrome Extension');
                  setShowMockModal(true);
                }} 
                className="w-full bg-[#FF8A00] hover:bg-orange-500 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,138,0,0.3)] transition-all relative z-10"
              >
                Install Extension <MonitorSmartphone size={12} />
              </button>
            </div>

            {/* 🔟 Leaderboard Preview */}
            <div className={`${cardBg} border ${border} rounded-[24px] p-6 shadow-xl`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sm text-white">Leaderboard Preview</h3>
                <Link href="/leaderboard" className="text-[10px] font-bold text-[#FF8A00] cursor-pointer hover:underline">View all</Link>
              </div>
              <div className="flex flex-col gap-3">
                {top3Loading ? (
                  <div className="flex flex-col gap-2 py-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded-xl" />)}
                  </div>
                ) : (top3Leaderboard && top3Leaderboard.length > 0) ? (
                  <div className="flex flex-col gap-3 py-2">
                    {top3Leaderboard.map((u: any, idx: number) => {
                      const isFirst = idx === 0;
                      return (
                        <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isFirst ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/10 text-white'}`}>
                              #{idx + 1}
                            </div>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800">
                              {u.avatarUrl ? <img src={u.avatarUrl} alt={u.user} className="w-full h-full object-cover" /> : <User size={16} className="text-gray-400 m-auto mt-2" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white leading-tight">{u.user}</span>
                              <span className="text-[10px] text-gray-500">@{u.username || u.user}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-[#FF8A00]">{u.rating || u.rawCombinedRating || 0}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest">Score</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Trophy size={28} className="text-white/10" />
                    <p className="text-xs text-gray-600 text-center">Leaderboard is empty right now.</p>
                  </div>
                )}
                
                <Link href="/leaderboard" className="mt-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold transition-all text-center">View Full Leaderboard</Link>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* CUSTOM MODAL FOR COMING SOON */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111216] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <Bot size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">{comingSoonTitle || 'AI Mock Interview'}</h3>
            <p className="text-sm text-gray-400 mb-6 flex flex-col items-center gap-2">
              This feature is currently under development and will be available very soon. Stay tuned! 
              <Rocket size={16} className="text-cyan-400" />
            </p>
            <button 
              onClick={() => setShowMockModal(false)}
              className="bg-white/10 hover:bg-white/15 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all w-full"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
      {/* FULL ADMIN NOTIFICATION MODAL */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#111216] border border-[#FF8A00]/30 rounded-3xl p-8 shadow-2xl max-w-2xl w-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF8A00]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-14 h-14 rounded-full bg-[#FF8A00]/20 flex items-center justify-center shrink-0 border border-[#FF8A00]/30">
                <Bell className="text-[#FF8A00]" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  {selectedNotification.title || "Admin Announcement"}
                </h3>
                <p className="text-[#FF8A00] text-xs font-bold uppercase tracking-widest mt-1">
                  Official Communication
                </p>
              </div>
            </div>
            
            <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <p className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {selectedNotification.message}
              </p>
            </div>
            
            <div className="flex justify-end relative z-10">
              <button 
                onClick={async () => {
                  setSelectedNotification(null);
                  setAdminNotification(null); // Also remove from dashboard
                  try {
                    const token = await getToken();
                    await fetch(`http://localhost:5005/api/notifications/read`, { method: "PUT", headers: { "Authorization": `Bearer ${token}` }});
                  } catch(e) {}
                }}
                className="bg-[#FF8A00] hover:bg-orange-500 text-black font-black uppercase py-3 px-8 rounded-xl text-xs transition-all shadow-[0_4px_15px_rgba(255,138,0,0.3)]"
              >
                Mark as Read & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
