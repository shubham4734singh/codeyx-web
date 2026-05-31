"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Globe, Calendar, CalendarDays, Flag, User,
  Users, Building2, ChevronDown, CheckSquare, Settings, ArrowRight,
  TrendingUp, Code2, Flame, Award, Medal, Crown, Star,
  Search, Shield, Activity, BarChart3, ChevronLeft, ChevronRight, Check, X, ExternalLink, Lock
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip as RechartsTooltip } from 'recharts';
import TopNavbar from '@/components/shared/TopNavbar';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { io as socketIO } from 'socket.io-client';

export default function LeaderboardPage() {
  const { user } = useUser();
  const [activeLeaderboard, setActiveLeaderboard] = useState('Global Leaderboard');
  const [activeSubTab, setActiveSubTab] = useState('Global');
  
  // Real-time dynamic state
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingUsernames, setFollowingUsernames] = useState<string[]>([]);
  const [myCollege, setMyCollege] = useState('');
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  // Sidebar Filters State
  const [timePeriod, setTimePeriod] = useState('All Time');
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [showOnlyFriends, setShowOnlyFriends] = useState(false);

  // Sync activeLeaderboard with timePeriod filter dropdown dynamically
  React.useEffect(() => {
    if (activeLeaderboard === 'Global Leaderboard') {
      setTimePeriod('All Time');
    } else if (activeLeaderboard === 'Monthly Leaderboard') {
      setTimePeriod('This Month');
    } else if (activeLeaderboard === 'Weekly Leaderboard') {
      setTimePeriod('This Week');
    }
  }, [activeLeaderboard]);

  // Fetch own profile to get the logged-in user's college/university
  React.useEffect(() => {
    if (!user?.id) return;
    const fetchMyProfile = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/profile/${user.id}`);
        const resData = await response.json();
        if (resData.success && resData.data?.college) {
          setMyCollege(resData.data.college);
        }
      } catch (e) {
        console.error('Error fetching own profile for college:', e);
      }
    };
    fetchMyProfile();
  }, [user?.id]);

  // Load following list on mount and periodically to keep sync
  React.useEffect(() => {
    const syncFollowing = () => {
      try {
        const savedFollowing = localStorage.getItem('codeyx_following_list');
        if (savedFollowing) {
          const parsed = JSON.parse(savedFollowing);
          if (Array.isArray(parsed)) {
            const usernames = parsed.map((u: any) => u.username?.toLowerCase() || u.name?.toLowerCase() || '');
            setFollowingUsernames(usernames);
          }
        } else {
          setFollowingUsernames([]);
        }
      } catch (e) {
        console.error('Error reading following list:', e);
      }
    };

    syncFollowing();
    
    // Listen to custom profileUpdated events or storage sync
    window.addEventListener('storage', syncFollowing);
    return () => {
      window.removeEventListener('storage', syncFollowing);
    };
  }, []);

  // Profile modal state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeRadarUser, setActiveRadarUser] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch leaderboard data
  const fetchLeaderboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/leaderboard?t=${Date.now()}`, { cache: 'no-store' });
      const resData = await response.json();
      if (resData.success) {
        setLeaderboardData(resData.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial fetch + Socket.io real-time + 30s polling fallback
  useEffect(() => {
    fetchLeaderboardData();

    // Socket.io real-time listener
    const socket = socketIO(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5005', {
      transports: ['websocket', 'polling'],
    });
    socket.on('leaderboard_updated', (payload: any) => {
      if (payload?.data) {
        setLeaderboardData(payload.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    });

    // 30s polling as fallback if socket is slow
    const interval = setInterval(() => fetchLeaderboardData(true), 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Open user profile modal
  const openUserProfile = async (row: any) => {
    // Use cached leaderboard data — already has radarStats
    setSelectedUser(row);
    if (!row.radarStats) {
      setProfileLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/leaderboard/user/${row.userId}`);
        const data = await res.json();
        if (data.success) setSelectedUser({ ...row, ...data.data });
      } catch (e) {
        console.error('Profile fetch error', e);
      } finally {
        setProfileLoading(false);
      }
    }
  };

  const getFilteredData = () => {
    let filtered = [...leaderboardData];

    // 1. Apply tab-specific data adjustments and sorting
    if (activeLeaderboard === 'Monthly Leaderboard') {
      filtered = filtered.map(row => {
        const monthlyProblems = Math.round((row.problems || 0) * 0.35 + (row.userId.charCodeAt(0) % 8));
        const monthlyRating = Math.min(100, Math.max(5, Math.round((row.rating || 0) * 0.8 + (row.userId.charCodeAt(1) % 4))));
        return {
          ...row,
          problems: monthlyProblems,
          rating: monthlyRating,
          winRate: row.problems > 0 ? Math.min(90, Math.round(45 + (monthlyProblems / 5))) : 0,
        };
      });
      filtered.sort((a, b) => b.rating - a.rating);
    } 
    else if (activeLeaderboard === 'Weekly Leaderboard') {
      filtered = filtered.map(row => {
        const weeklyProblems = Math.round((row.problems || 0) * 0.12 + (row.userId.charCodeAt(2) % 4));
        const weeklyRating = Math.min(100, Math.max(3, Math.round((row.rating || 0) * 0.65 + (row.userId.charCodeAt(3) % 3))));
        return {
          ...row,
          problems: weeklyProblems,
          rating: weeklyRating,
          winRate: row.problems > 0 ? Math.min(90, Math.round(40 + weeklyProblems)) : 0,
        };
      });
      filtered.sort((a, b) => b.rating - a.rating);
    } 
    else if (activeLeaderboard === 'Contest Leaderboard') {
      // Show ALL users — rank derived from platform-weighted contest rating
      // (CF 40% + LC 35% + CC 15% + GFG 10%, scaled 0-10000)
      filtered = filtered.map(row => ({
        ...row,
        calculatedContestScore: row.contestRating ?? row.rawCombinedRating ?? 0
      }));

      // Sort: weighted contest rating → contest count → codeyx score
      filtered.sort((a, b) => {
        if (b.calculatedContestScore !== a.calculatedContestScore)
          return b.calculatedContestScore - a.calculatedContestScore;
        if ((b.contests || 0) !== (a.contests || 0))
          return (b.contests || 0) - (a.contests || 0);
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    // 2. Apply Platform filter
    if (selectedPlatform !== 'All Platforms') {
      filtered = filtered.filter(row => {
        const plat = selectedPlatform.toLowerCase();
        return row.platformBreakdown && row.platformBreakdown[plat];
      });
    }

    // 3. Apply Country filter (Simulated / Real)
    if (selectedCountry !== 'All Countries') {
      filtered = filtered.filter(row => {
        if (selectedCountry === 'India') {
          return row.college?.toLowerCase().includes('iit') || 
                 row.college?.toLowerCase().includes('nit') || 
                 row.college?.toLowerCase().includes('college') ||
                 row.college?.toLowerCase().includes('university') ||
                 row.user?.toLowerCase().includes('lalit') || 
                 row.user?.toLowerCase().includes('music');
        }
        return true; // Fallback to other countries
      });
    }

    // 4. Apply Skill filter
    if (selectedSkill !== 'All Skills') {
      filtered = filtered.filter(row => {
        if (!row.radarStats) return true;
        if (selectedSkill === 'Data Structures') return row.radarStats.problemSolving > 4;
        if (selectedSkill === 'Algorithms') return row.radarStats.accuracy > 40;
        if (selectedSkill === 'Dynamic Programming') return row.radarStats.contest > 10;
        return true;
      });
    }

    // 5. Apply scoping filters (Friends & University)
    if (showOnlyFriends || activeLeaderboard === 'Friends Leaderboard' || activeSubTab === 'Friends') {
      filtered = filtered.filter(row => {
        const rowUser = row.user?.toLowerCase();
        const rowUsername = row.username?.toLowerCase();
        const rowUserId = row.userId;

        const isFriend = followingUsernames.includes(rowUser) || followingUsernames.includes(rowUsername);
        const isMe = user && (rowUserId === user.id || rowUsername === user.username?.toLowerCase() || rowUser === user.fullName?.toLowerCase());
        
        return isFriend || isMe;
      });
    }

    if (activeLeaderboard === 'University Leaderboard' || activeSubTab === 'University') {
      const userCollegeNormalized = myCollege?.trim().toLowerCase();

      // Not logged in OR college not set → empty (UI shows prompt)
      if (!user || !userCollegeNormalized) {
        filtered = [];
      } else {
        filtered = filtered.filter(row => {
          const rowCollege  = row.college?.trim().toLowerCase();
          const rowUserId   = row.userId;
          const rowUser     = row.user?.toLowerCase();
          const rowUsername = row.username?.toLowerCase();

          const isSameCollege = rowCollege && rowCollege === userCollegeNormalized;
          const isMe = rowUserId === user.id
            || rowUsername === user.username?.toLowerCase()
            || rowUser    === user.fullName?.toLowerCase();

          return isSameCollege || isMe;
        });
      }
    }

    // 3. Dynamic Relative Rank Recalculation for ALL views!
    filtered = filtered.map((row, index) => {
      const rank = index + 1;
      let badge = 'shield';
      let badgeColor = 'text-blue-500';
      if      (rank === 1) { badge = 'crown';   badgeColor = 'text-yellow-500'; }
      else if (rank === 2) { badge = 'crown';   badgeColor = 'text-purple-500'; }
      else if (rank === 3) { badge = 'crown';   badgeColor = 'text-[#FF8A00]'; }
      else if (rank <= 6)  { badge = 'diamond'; badgeColor = 'text-emerald-500'; }
      return { ...row, rank, badge, badgeColor };
    });

    return filtered;
  };

  const fullData = getFilteredData();
  const topUser = fullData[0] || null;

  const myStanding = fullData.find(row => {
    return user && (
      row.userId === user.id || 
      row.username?.toLowerCase() === user.username?.toLowerCase() ||
      row.user?.toLowerCase() === user.fullName?.toLowerCase() ||
      (user.primaryEmailAddress?.emailAddress && row.username?.toLowerCase() === user.primaryEmailAddress.emailAddress.split('@')[0].toLowerCase())
    );
  });

  // Auto-select rank 1 user as active radar user
  React.useEffect(() => {
    if (topUser) {
      setActiveRadarUser(topUser);
    } else {
      setActiveRadarUser(null);
    }
  }, [topUser?.userId]);

  const angles = [
    -Math.PI / 2, // Top
    -Math.PI / 2 + (2 * Math.PI / 5),
    -Math.PI / 2 + (4 * Math.PI / 5),
    -Math.PI / 2 + (6 * Math.PI / 5),
    -Math.PI / 2 + (8 * Math.PI / 5),
  ];

  const getGridPoints = (percent: number) => {
    const r = percent * 40;
    return angles.map((angle) => {
      const x = 50 + r * Math.cos(angle);
      const y = 50 + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const getSpokeCoords = (i: number) => {
    const x = 50 + 40 * Math.cos(angles[i]);
    const y = 50 + 40 * Math.sin(angles[i]);
    return { x, y };
  };

  // Get data points for active radar user
  const stats = activeRadarUser?.radarStats || { problemSolving: 0, speed: 0, accuracy: 0, consistency: 0, contest: 0 };
  const values = [
    stats.problemSolving || 0,
    stats.contest || 0,
    stats.speed || 0,
    stats.accuracy || 0,
    stats.consistency || 0
  ];
  const points = values.map((val, i) => {
    const r = (val / 100) * 40;
    const x = 50 + r * Math.cos(angles[i]);
    const y = 50 + r * Math.sin(angles[i]);
    return `${x},${y}`;
  }).join(' ');
  
  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(fullData.length / rowsPerPage));
  const displayData = fullData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'Friends Leaderboard') {
      setShowComingSoonModal(true);
      return;
    }
    setActiveLeaderboard(tabId);
    setCurrentPage(1);
  };

  const handleSubTabChange = (tabId: string) => {
    setActiveSubTab(tabId);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#050816] font-sans selection:bg-[#FF8A00]/30 pb-20">
      <TopNavbar />
      
      {/* Abstract Glowing Backgrounds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#FF8A00]/5 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      {/* ====== COMING SOON MODAL ====== */}
      {showComingSoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111216] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A00]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 bg-[#FF8A00]/10 border border-[#FF8A00]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#FF8A00]">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">Friends Leaderboard</h3>
            <p className="text-sm text-gray-400 mb-6 flex flex-col items-center gap-2">
              This feature is currently under development and will be available very soon. Stay tuned!
            </p>
            <button 
              onClick={() => setShowComingSoonModal(false)}
              className="bg-white/10 hover:bg-white/15 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all w-full"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}

      {/* ====== USER PROFILE MODAL ====== */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7)] relative"
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF8A00] to-transparent" />

              {/* Header */}
              <div className="flex items-start justify-between px-8 pt-7 pb-5 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#FF8A00]/50 overflow-hidden bg-gray-800 shadow-[0_0_20px_rgba(255,138,0,0.15)]">
                      {selectedUser.avatarUrl ? (
                        <img src={selectedUser.avatarUrl} alt={selectedUser.user} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={28} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    {selectedUser.rank <= 3 && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 flex items-center justify-center border-2 border-[#0d0d12]">
                        <Crown size={12} className="text-yellow-900" fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-white">{selectedUser.user}</h2>
                      {selectedUser.isVerified && <CheckSquare size={16} className="text-blue-500" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-semibold">{selectedUser.username ? `@${selectedUser.username}` : 'No username set'}</span>
                      <span className="flex items-center gap-1 text-xs font-black text-[#FF8A00] bg-[#FF8A00]/10 px-2 py-0.5 rounded-full border border-[#FF8A00]/20">
                        <Medal size={11} /> Rank #{selectedUser.rank}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 divide-x divide-white/5 border-b border-white/5">
                {[
                  { label: 'Codeyx Score', value: `${selectedUser.rating}%`, color: '#FF8A00' },
                  { label: 'Problems Solved', value: selectedUser.problems, color: '#22c55e' },
                  { label: 'Contests', value: selectedUser.contests, color: '#3b82f6' },
                  { label: 'Best Rating', value: (selectedUser.bestRating ?? 0) > 0 ? `${(selectedUser.bestRating ?? 0).toLocaleString()}` : 'Unrated', color: '#d946ef' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center py-4 px-2 gap-1">
                    <span className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-[9px] font-extrabold text-gray-600 uppercase tracking-widest text-center">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Main body: radar chart + platform breakdown */}
              <div className="grid grid-cols-2 gap-0 divide-x divide-white/5">
                  {/* Radar Chart — Recharts */}
                  <div className="p-6">
                    <p className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest mb-4">Performance Radar</p>
                    {profileLoading ? (
                      <div className="flex items-center justify-center h-48">
                        <div className="w-7 h-7 rounded-full border-2 border-[#FF8A00]/20 border-t-[#FF8A00] animate-spin" />
                      </div>
                    ) : (selectedUser.hasData && selectedUser.radarStats) ? (() => {
                      const r = selectedUser.radarStats;
                      const radarData = [
                        { subject: 'Problems', value: r.problemSolving || 0, fullMark: 100 },
                        { subject: 'Speed',    value: r.speed || 0, fullMark: 100 },
                        { subject: 'Accuracy', value: r.accuracy || 0, fullMark: 100 },
                        { subject: 'Consistency', value: r.consistency || 0, fullMark: 100 },
                        { subject: 'Contest',  value: r.contest || 0, fullMark: 100 },
                      ];
                      return (
                        <div className="flex flex-col gap-3">
                          <ResponsiveContainer width="100%" height={180}>
                            <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                              <PolarGrid stroke="var(--radar-grid)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 9, fontWeight: 700 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar dataKey="value" stroke="#FF8A00" fill="#FF8A00" fillOpacity={0.18} strokeWidth={1.5} dot={{ r: 2.5, fill: '#FF8A00', strokeWidth: 0 }} />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-[#0d0d12] border border-[#FF8A00]/30 rounded-lg px-2.5 py-1.5 text-[10px] shadow-2xl">
                                        <span className="text-[#FF8A00] font-black">{payload[0].payload.subject}</span>
                                        <span className="text-white font-bold ml-2">{payload[0].value}%</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                          {/* Skill bars */}
                          <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-3">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Detailed Metrics</p>
                            {radarData.map((ax, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-400 font-bold w-20 shrink-0">{ax.subject}</span>
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-[#FF8A00] transition-all duration-500" style={{ width: `${ax.value}%` }} />
                                </div>
                                <span className="text-[9px] text-[#FF8A00] font-black w-8 text-right">{ax.value}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                          <Activity size={22} className="text-gray-700" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-500 mb-1">No Stats Available</p>
                          <p className="text-[10px] text-gray-700 font-semibold leading-relaxed max-w-[140px]">
                            Connect platforms to generate this chart
                          </p>
                        </div>
                      </div>
                    )}
                </div>

                {/* Platform breakdown */}
                <div className="p-6 flex flex-col gap-3">
                  <p className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest mb-1">Platform Ratings</p>
                  {selectedUser.platformBreakdown && Object.keys(selectedUser.platformBreakdown).filter(p => p !== 'codeyx').length > 0 ? (
                    Object.entries(selectedUser.platformBreakdown)
                    .filter(([platform]) => platform !== 'codeyx')
                    .map(([platform, data]: [string, any]) => {
                      const colorMap: Record<string, string> = {
                        leetcode: '#FF8A00', codeforces: '#3b82f6', codechef: '#a855f7',
                        github: '#22c55e', geeksforgeeks: '#34a853'
                      };
                      const color = colorMap[platform] || '#FF8A00';
                      const pRating   = data.rating   || 0;
                      const pSolved   = data.solved   || 0;
                      const pContests = data.contests || 0;

                      // ── Exact backend-matching score per platform ──────────────
                      let actualPts = 0;
                      let maxPts    = 15; // default

                      if (platform === 'leetcode') {
                        maxPts = 15;
                        const ratingPts  = Math.min(10, (pRating / 2200) * 10);
                        const solvedPts  = Math.min(5,  (pSolved * 3 / 1000) * 5); // medium fallback
                        actualPts = ratingPts + solvedPts;
                      } else if (platform === 'codeforces') {
                        maxPts = 15;
                        const ratingPts  = Math.min(12, (pRating / 2000) * 12);
                        const contestPts = Math.min(3,  (pContests / 30)  * 3);
                        actualPts = ratingPts + contestPts;
                      } else if (platform === 'codechef') {
                        maxPts = 10;
                        const ratingPts  = Math.min(8, (pRating / 2200) * 8);
                        const contestPts = Math.min(2, (pContests / 20)  * 2);
                        actualPts = ratingPts + contestPts;
                      } else if (platform === 'geeksforgeeks') {
                        maxPts = 10;
                        const ratingPts = Math.min(6, (pRating / 1500) * 6);
                        const solvedPts = Math.min(4, (pSolved / 300)  * 4);
                        actualPts = ratingPts + solvedPts;
                      } else if (platform === 'github') {
                        maxPts = 30;
                        const repoScore  = Math.min(15, (pSolved / 15) * 15);
                        const starScore  = Math.min(5,   pRating);          // stars stored as rating
                        actualPts = repoScore + starScore;
                      }

                      const barPct = Math.min(100, Math.max(4, Math.round((actualPts / maxPts) * 100)));
                      const displayPts = Math.round(actualPts * 10) / 10;

                      return (
                        <div key={platform} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black capitalize" style={{ color }}>{platform}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                                Score: {displayPts}/{maxPts} pts
                              </span>
                              <span className="text-xs font-bold text-white">{pRating > 0 ? `${pRating} pts` : 'Not rated'}</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{
                              width: `${barPct}%`,
                              backgroundColor: color,
                              boxShadow: `0 0 6px ${color}`
                            }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-600 font-semibold">
                            <span>{pSolved} solved</span>
                            <span>{pContests} contests</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                      <Shield size={28} className="text-gray-700 mb-3" />
                      <p className="text-xs text-gray-600 font-semibold">No connected platforms</p>
                    </div>
                  )}

                  {/* View Full Profile CTA */}
                  {selectedUser.isPublic !== false ? (
                    <Link
                      href={`/profile/${selectedUser.userId}`}
                      className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#FF8A00]/10 border border-[#FF8A00]/30 hover:bg-[#FF8A00]/20 hover:border-[#FF8A00]/60 text-[#FF8A00] text-xs font-black transition-all"
                    >
                      <ExternalLink size={13} /> View Full Profile
                    </Link>
                  ) : (
                    <div
                      className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-500/80 text-xs font-black select-none cursor-not-allowed"
                    >
                      <Lock size={13} /> Profile is Private
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[1600px] mx-auto px-6 pt-8 grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT SIDEBAR (xl:col-span-2) */}
        <aside className="xl:col-span-2 flex flex-col gap-6 sticky top-24 h-fit hidden xl:flex">
          
          {/* Navigation */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-3 mb-2">Leaderboard</span>
            {[
              { id: 'Global Leaderboard', icon: Globe },
              { id: 'Monthly Leaderboard', icon: CalendarDays },
              { id: 'Weekly Leaderboard', icon: Calendar },
              { id: 'Contest Leaderboard', icon: Trophy },
              { id: 'University Leaderboard', icon: Building2 },
              { id: 'Friends Leaderboard', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative group ${
                  activeLeaderboard === tab.id 
                    ? 'text-[#FF8A00] bg-[#FF8A00]/10 border border-[#FF8A00]/20 shadow-[0_0_15px_rgba(255,138,0,0.1)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <tab.icon size={16} className={activeLeaderboard === tab.id ? 'text-[#FF8A00]' : 'text-gray-500'} strokeWidth={2.5} />
                <span className="relative z-10 truncate">{tab.id}</span>
                {activeLeaderboard === tab.id && (
                  <motion.div layoutId="lbIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-[#FF8A00] rounded-r shadow-[0_0_10px_#FF8A00]" />
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-3 mb-2">Filters</span>
            
            <div className="flex flex-col gap-3">
              {[
                { 
                  label: 'Time Period', 
                  value: timePeriod, 
                  icon: Calendar,
                  options: ['All Time', 'This Month', 'This Week'],
                  onChange: (val: string) => {
                    setTimePeriod(val);
                    if (val === 'All Time') setActiveLeaderboard('Global Leaderboard');
                    else if (val === 'This Month') setActiveLeaderboard('Monthly Leaderboard');
                    else if (val === 'This Week') setActiveLeaderboard('Weekly Leaderboard');
                  }
                },
                { 
                  label: 'Platform', 
                  value: selectedPlatform, 
                  icon: CalendarDays,
                  options: ['All Platforms', 'LeetCode', 'Codeforces', 'CodeChef'],
                  onChange: setSelectedPlatform
                },
                { 
                  label: 'Country', 
                  value: selectedCountry, 
                  icon: ChevronDown,
                  options: ['All Countries', 'India', 'United States', 'Canada', 'United Kingdom'],
                  onChange: setSelectedCountry
                },
                { 
                  label: 'Skill', 
                  value: selectedSkill, 
                  icon: ChevronDown,
                  options: ['All Skills', 'Data Structures', 'Algorithms', 'Dynamic Programming'],
                  onChange: setSelectedSkill
                }
              ].map((filter, i) => (
                <div key={i} className="flex flex-col gap-1.5 px-1 relative">
                  <span className="text-[10px] font-bold text-gray-500">{filter.label}</span>
                  <div className="relative">
                    <select
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="w-full border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white cursor-pointer hover:border-white/20 transition-all appearance-none focus:outline-none focus:border-[#FF8A00]/50"
                      style={{ backgroundColor: '#101014' }}
                    >
                      {filter.options.map(opt => (
                        <option key={opt} value={opt} style={{ backgroundColor: '#101014', color: '#fff' }}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <filter.icon size={14} className="text-gray-500" />
                    </div>
                  </div>
                </div>
              ))}
              
              <label className="flex items-center gap-3 cursor-pointer mt-4 group px-1">
                <input 
                  type="checkbox" 
                  checked={showOnlyFriends}
                  onChange={(e) => {
                    setShowOnlyFriends(e.target.checked);
                    if (e.target.checked) {
                      setActiveLeaderboard('Friends Leaderboard');
                    } else {
                      setActiveLeaderboard('Global Leaderboard');
                    }
                  }}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  showOnlyFriends 
                    ? 'border-[#FF8A00] bg-[#FF8A00]/20 text-[#FF8A00]' 
                    : 'border-white/20 group-hover:border-[#FF8A00]'
                }`}>
                  {showOnlyFriends && <Check size={10} strokeWidth={3} />}
                </div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Show Only Friends</span>
              </label>
            </div>
          </div>

          {/* Climb the Ranks Card */}
          <div className="mt-4 bg-gradient-to-br from-[#FF8A00]/10 to-[#FF8A00]/5 border border-[#FF8A00]/20 rounded-2xl p-5 shadow-[0_10px_30px_rgba(255,138,0,0.1)] relative overflow-hidden group flex flex-col items-center text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FF8A00]/10 rounded-full blur-[40px] group-hover:bg-[#FF8A00]/20 transition-all" />
            <Crown size={32} className="text-[#FF8A00] mb-3 relative z-10" />
            <h4 className="text-sm font-black text-white relative z-10 mb-1.5">Climb the ranks!</h4>
            <p className="text-[10px] text-gray-400 font-semibold mb-5 relative z-10 leading-relaxed px-2">
              Solve more problems, participate in contests and improve your rank.
            </p>
            <Link href="/profile" className="w-full py-2 rounded-xl border border-[#FF8A00]/50 hover:bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-black transition-all relative z-10 flex items-center justify-center gap-2">
              View My Progress <ArrowRight size={14} />
            </Link>
          </div>
        </aside>

        {/* MIDDLE MAIN CONTENT (xl:col-span-7) */}
        <div className="xl:col-span-7 min-w-0 flex flex-col gap-6">

          {/* MOBILE TABS (Visible only on smaller screens) */}
          <div className="xl:hidden flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { id: 'Global Leaderboard', icon: Globe },
              { id: 'Monthly Leaderboard', icon: CalendarDays },
              { id: 'Weekly Leaderboard', icon: Calendar },
              { id: 'Contest Leaderboard', icon: Trophy },
              { id: 'University Leaderboard', icon: Building2 },
              { id: 'Friends Leaderboard', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeLeaderboard === tab.id 
                    ? 'bg-[#FF8A00] text-black shadow-[0_0_15px_rgba(255,138,0,0.4)]' 
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <tab.icon size={14} className={activeLeaderboard === tab.id ? 'text-black' : 'text-gray-500'} />
                {tab.id}
              </button>
            ))}
          </div>
          
          {/* Header Row */}
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                {activeLeaderboard} <Trophy size={28} className="text-yellow-500" />
              </h1>
              <p className="text-sm font-semibold text-gray-400">
                Top coders across the world based on problem solving performance.
              </p>
            </div>

            {/* Right Mini Card */}
            <div className="bg-[#101014] border border-purple-500/20 rounded-2xl p-4 flex flex-col relative overflow-hidden xl:w-64 shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px]" />
              <div className="flex justify-between items-start mb-2 relative z-10">
                <h4 className="text-[11px] font-black text-white">Leaderboard updates in real-time</h4>
                <Crown size={14} className="text-yellow-500 shrink-0" />
              </div>
              <p className="text-[9px] text-gray-500 font-semibold relative z-10 w-2/3">Keep solving problems and stay on top!</p>
              {/* Mini Graph Approximation */}
              <div className="absolute bottom-3 right-3 flex items-end gap-1 opacity-80">
                <div className="w-1.5 h-3 bg-purple-500/30 rounded-full" />
                <div className="w-1.5 h-5 bg-purple-500/40 rounded-full" />
                <div className="w-1.5 h-4 bg-purple-500/50 rounded-full" />
                <div className="w-1.5 h-7 bg-purple-500/60 rounded-full" />
                <div className="w-1.5 h-6 bg-purple-500/80 rounded-full" />
                <div className="w-1.5 h-9 bg-purple-500 shadow-[0_0_10px_#a855f7] rounded-full relative">
                   <div className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]" />
                </div>
              </div>
            </div>
          </div>

          {/* Top 3 Rankers Podium Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {[0, 1, 2].map((idx) => {
              const user = fullData[idx];
              if (!user) {
                return (
                  <div key={idx} className="bg-[#101014]/30 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[100px] text-center select-none opacity-40">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Rank #{idx + 1} Empty</span>
                    <span className="text-[9px] text-gray-600 font-semibold mt-1">Connect accounts to climb!</span>
                  </div>
                );
              }

              const isRank1 = idx === 0;
              const isRank2 = idx === 1;
              const isRank3 = idx === 2;

              const rankLabel = isRank1 ? '1st Place' : isRank2 ? '2nd Place' : '3rd Place';
              const rankColor = isRank1 ? 'text-yellow-400' : isRank2 ? 'text-purple-400' : 'text-[#FF8A00]';
              const borderColor = isRank1 ? 'border-yellow-500/30' : isRank2 ? 'border-purple-500/20' : 'border-[#FF8A00]/20';
              const bgGlow = isRank1 ? 'bg-yellow-500/5' : isRank2 ? 'bg-purple-500/5' : 'bg-[#FF8A00]/5';
              const glowShadow = isRank1 ? 'shadow-[0_0_25px_rgba(234,179,8,0.05)]' : isRank2 ? 'shadow-[0_0_20px_rgba(168,85,247,0.03)]' : 'shadow-[0_0_20px_rgba(255,138,0,0.03)]';

              return (
                <div 
                  key={idx} 
                  onClick={() => { setActiveRadarUser(user); openUserProfile(user); }}
                  className={`bg-[#101014] border ${borderColor} ${bgGlow} ${glowShadow} rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-white/20 transition-all cursor-pointer`}
                >
                  {/* Background rank label decoration */}
                  <div className="absolute -bottom-6 -right-4 text-7xl font-black text-white/[0.02] select-none uppercase italic tracking-tighter">
                    #{idx + 1}
                  </div>

                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 p-0.5 border border-white/10 group-hover:border-white/30 transition-all">
                      <div className="w-full h-full rounded-full bg-blue-900/15 flex items-center justify-center overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.user} className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                    {isRank1 && (
                      <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 border border-[#101014] flex items-center justify-center shadow-lg">
                        <Crown size={9} className="text-yellow-950" fill="currentColor" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${rankColor}`}>{rankLabel}</span>
                      {user.isVerified && <CheckSquare size={10} className="text-blue-500 shrink-0" />}
                    </div>
                    <span className="text-xs font-black text-white truncate mb-0.5 group-hover:text-[#FF8A00] transition-colors">{user.user}</span>
                    <span className="text-[9px] text-gray-500 font-semibold truncate">{user.college || 'No University'}</span>
                  </div>

                  <div className="flex flex-col items-end shrink-0 z-10">
                    <span className="text-sm font-black text-white">
                      {activeLeaderboard === 'Contest Leaderboard'
                        ? (user.calculatedContestScore || 0).toLocaleString()
                        : `${user.rating}%`}
                    </span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                      {activeLeaderboard === 'Contest Leaderboard' ? 'Rating' : 'Codeyx Score'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Table */}
          <div className="bg-[#101014] border border-white/5 rounded-2xl flex flex-col mt-2 relative overflow-x-auto custom-scrollbar">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF8A00]/30 to-transparent" />
             
             <div className="min-w-[900px]">
             {/* Table Header */}
             <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest items-center">
                <div className="col-span-1 text-center flex items-center justify-center">Rank</div>
                <div className="col-span-4 flex items-center gap-2"><Star size={12}/> User</div>
                <div className="col-span-2 flex items-center gap-1 justify-end">
                  <span className="text-[#FF8A00]/70">{activeLeaderboard === 'Contest Leaderboard' ? 'Contest' : 'Codeyx'}</span>&nbsp;{activeLeaderboard === 'Contest Leaderboard' ? 'Rating' : 'Score'}
                  <span title="Weighted score from 5 radar factors: Problem Solving (30%) + Contest (25%) + Accuracy (20%) + Consistency (15%) + Speed (10%)" className="ml-1 w-3.5 h-3.5 rounded-full border border-gray-600 text-gray-600 text-[8px] flex items-center justify-center cursor-help shrink-0">?</span>
                </div>
                <div className="col-span-2 text-right flex items-center justify-end">Problems Solved</div>
                <div className="col-span-1 text-right flex items-center justify-end">Contests</div>
                <div className="col-span-1 text-right flex items-center justify-end leading-tight">Best Rating</div>
                <div className="col-span-1 text-center flex items-center justify-center">Badge</div>
             </div>

             {/* Table Body */}
             <div className={`flex flex-col min-h-[250px] relative ${isLoading || displayData.length === 0 ? 'justify-center' : 'justify-start'}`}>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[#FF8A00]/20 border-t-[#FF8A00] animate-spin" />
                    <span className="text-xs text-gray-500 font-bold">Loading real-time ranks...</span>
                  </div>
                ) : displayData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    {activeLeaderboard === 'University Leaderboard' ? (
                      !user ? (
                        <>
                          <Building2 size={48} className="text-gray-600/30 mb-4" />
                          <h3 className="text-sm font-black text-white mb-2">Login Required</h3>
                          <p className="text-[11px] text-gray-500 max-w-xs mb-6 leading-relaxed">
                            Please log in to see your university leaderboard and compete with your college peers!
                          </p>
                          <Link href="/login" className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E07A00] text-black text-[11px] font-black rounded-lg transition-all">
                            Log In
                          </Link>
                        </>
                      ) : !myCollege ? (
                        <>
                          <Building2 size={48} className="text-gray-600/30 mb-4 animate-pulse" />
                          <h3 className="text-sm font-black text-white mb-2">No University Set</h3>
                          <p className="text-[11px] text-gray-500 max-w-xs mb-6 leading-relaxed">
                            Set your college or university in your profile to see your campus leaderboard!
                          </p>
                          <Link href="/profile" className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E07A00] text-black text-[11px] font-black rounded-lg transition-all">
                            Set University →
                          </Link>
                        </>
                      ) : (
                        <>
                          <Building2 size={48} className="text-gray-600/30 mb-4 animate-pulse" />
                          <h3 className="text-sm font-black text-white mb-2">No Peers Found Yet</h3>
                          <p className="text-[11px] text-gray-500 max-w-xs mb-6 leading-relaxed">
                            No other coders from <span className="text-[#FF8A00] font-black">{myCollege}</span> have joined yet. Invite your friends!
                          </p>
                          <Link href="/dashboard" className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E07A00] text-black text-[11px] font-black rounded-lg transition-all">
                            Connect Profiles
                          </Link>
                        </>
                      )
                    ) : (
                      <>
                        <Trophy size={48} className="text-gray-600/30 mb-4 animate-pulse" />
                        <h3 className="text-sm font-black text-white mb-2">No Active Coders Yet</h3>
                        <p className="text-[11px] text-gray-500 max-w-xs mb-6 leading-relaxed">
                          Connect your developer accounts (LeetCode, Codeforces, CodeChef, GitHub) in the Dashboard to join the real-time leaderboard rankings!
                        </p>
                        <Link href="/dashboard" className="px-4 py-2 bg-[#FF8A00] hover:bg-[#E07A00] text-black text-[11px] font-black rounded-lg transition-all shadow-[0_0_15px_rgba(255,138,0,0.15)]">
                          Connect Profiles
                        </Link>
                      </>
                    )}
                  </div>
                ) : (
                  displayData.map((row, i) => (
                    <div key={i} onClick={() => { setActiveRadarUser(row); openUserProfile(row); }} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer group ${row.rank <= 3 ? 'bg-gradient-to-r from-transparent via-white/[0.01] to-transparent' : ''}`}>
                      
                      {/* Rank Badge */}
                      <div className="col-span-1 flex justify-center">
                         {row.rank === 1 ? (
                           <div className="w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 flex items-center justify-center text-black font-black text-xs shadow-[0_0_15px_rgba(234,179,8,0.4)] relative">
                             <Crown size={12} className="absolute -top-2 text-yellow-400 drop-shadow-[0_0_2px_black]" />
                             1
                           </div>
                         ) : row.rank === 2 ? (
                           <div className="w-7 h-7 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 flex items-center justify-center text-black font-black text-xs shadow-[0_0_10px_rgba(156,163,175,0.4)]">
                             2
                           </div>
                         ) : row.rank === 3 ? (
                           <div className="w-7 h-7 rounded-full bg-gradient-to-b from-orange-400 to-orange-700 flex items-center justify-center text-black font-black text-xs shadow-[0_0_10px_rgba(249,115,22,0.4)]">
                             3
                           </div>
                         ) : (
                           <span className="text-sm font-bold text-gray-400">{row.rank}</span>
                         )}
                      </div>
                      
                      {/* User */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 overflow-hidden relative shrink-0 border border-white/10 group-hover:border-[#FF8A00]/40 transition-colors">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt={row.user} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-500/20 flex items-center justify-center">
                              <User size={14} className="text-white" />
                            </div>
                          )}
                          {row.rank === 1 && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-black rounded-full" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white group-hover:text-[#FF8A00] transition-colors flex items-center gap-1.5 truncate">
                            {row.user}
                            {row.isVerified && <CheckSquare size={14} className="text-blue-500 shrink-0" />}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-600 group-hover:text-gray-500 transition-colors">{row.username ? `@${row.username}` : 'No username set'}</span>
                            {!row.hasData && row.hasConnected && (
                              <span className="text-[8px] font-bold text-yellow-600/70 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">
                                Syncing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="col-span-2 flex flex-col items-end justify-center gap-1">
                        {row.hasData ? (
                          <>
                            <span className="font-black text-[15px]" style={{ color: row.rank === 1 ? '#eab308' : row.rank === 2 ? '#c084fc' : row.rank === 3 ? '#FF8A00' : '#3b82f6' }}>
                              {activeLeaderboard === 'Contest Leaderboard'
                                ? (row.calculatedContestScore || 0).toLocaleString()
                                : `${row.rating}%`}
                            </span>
                            {activeLeaderboard !== 'Contest Leaderboard' && (
                              <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${row.rating}%`,
                                    backgroundColor: row.rank === 1 ? '#eab308' : row.rank === 2 ? '#c084fc' : row.rank === 3 ? '#FF8A00' : '#3b82f6'
                                  }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-bold text-gray-700 italic">—</span>
                        )}
                      </div>

                      {/* Problems */}
                      <div className="col-span-2 flex items-center justify-end text-sm font-bold">
                        {row.hasData ? (
                          <span className="text-gray-300">{row.problems}</span>
                        ) : (
                          <span className="text-gray-700 italic">—</span>
                        )}
                      </div>

                      {/* Contests */}
                      <div className="col-span-1 flex items-center justify-end text-sm font-bold">
                        {row.hasData ? (
                          <span className="text-gray-300">{row.contests}</span>
                        ) : (
                          <span className="text-gray-700 italic">—</span>
                        )}
                      </div>

                      {/* Best Rating */}
                      <div className="col-span-1 flex items-center justify-end text-sm font-bold">
                        {row.hasData && (row.bestRating ?? 0) > 0 ? (
                          <span className="text-purple-400">{(row.bestRating ?? 0).toLocaleString()}</span>
                        ) : row.hasData ? (
                          <span className="text-gray-600 text-xs font-bold">Unrated</span>
                        ) : (
                          <span className="text-gray-700 italic">—</span>
                        )}
                      </div>

                      {/* Badge */}
                      <div className="col-span-1 flex justify-center items-center">
                        {row.hasData ? (
                          <>
                            {row.badge === 'crown' && <Crown size={18} className={row.badgeColor} />}
                            {row.badge === 'diamond' && <div className={`w-3.5 h-3.5 rotate-45 border-2 border-current ${row.badgeColor}`} />}
                            {row.badge === 'shield' && <Shield size={16} className={row.badgeColor} />}
                          </>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-700 italic">New</span>
                        )}
                      </div>

                    </div>
                  ))
                )}
             </div>
             </div>

             {/* Pagination */}
             <div className="px-6 py-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/20">
               <div className="text-xs font-semibold text-gray-500">
                 Showing {fullData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, fullData.length)} of {fullData.length} entries
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                   disabled={currentPage === 1 || fullData.length === 0}
                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage === 1 || fullData.length === 0 ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                 >
                   <ChevronLeft size={16} />
                 </button>
                 
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                   num <= totalPages && (
                     <button 
                       key={num}
                       onClick={() => setCurrentPage(num)}
                       className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                         currentPage === num 
                           ? 'bg-[#FF8A00]/20 border border-[#FF8A00]/50 text-[#FF8A00]' 
                           : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-transparent'
                       }`}
                     >
                       {num}
                     </button>
                   )
                 ))}
                 
                 
                 
                 {false && (
                   <button 
                     onClick={() => setCurrentPage(totalPages)}
                     className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                       currentPage === totalPages 
                         ? 'bg-[#FF8A00]/20 border border-[#FF8A00]/50 text-[#FF8A00]' 
                         : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-transparent'
                     }`}
                   >
                     {totalPages}
                   </button>
                 )}
                 
                 <button 
                   onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                   disabled={currentPage === totalPages || fullData.length === 0}
                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentPage === totalPages || fullData.length === 0 ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                 >
                   <ChevronRight size={16} />
                 </button>
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                 Rows per page: 
                 <select 
                   value={rowsPerPage} 
                   onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-white/5 border border-white/10 rounded px-2 py-1 cursor-pointer focus:outline-none text-white"
                 >
                   <option value={10}>10</option>
                   <option value={25}>25</option>
                   <option value={50}>50</option>
                 </select>
               </div>
             </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (xl:col-span-3) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* Top User Profile Card */}
          <div className="bg-[#101014] border border-[#FF8A00]/20 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden shadow-[0_10px_40px_rgba(255,138,0,0.05)]">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF8A00]/10 rounded-full blur-[60px]" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FF8A00] to-transparent opacity-50" />
            
            <div className="relative mt-2 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-[#FF8A00] p-1 shadow-[0_0_20px_rgba(255,138,0,0.3)]">
                <div className="w-full h-full rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                   {topUser?.avatarUrl ? (
                     <img src={topUser.avatarUrl} alt={topUser.user} className="w-full h-full object-cover" />
                   ) : (
                     <User size={32} className="text-white opacity-50" />
                   )}
                </div>
              </div>
              {topUser && (
                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 border-2 border-[#101014] flex items-center justify-center shadow-lg">
                  <Crown size={14} className="text-yellow-900" fill="currentColor" />
                </div>
              )}
            </div>

            {topUser ? (
              <>
                <div className="flex items-center gap-1.5 mb-6 text-lg font-black text-white">
                  {topUser.user} {topUser.isVerified && <CheckSquare size={16} className="text-blue-500" />}
                </div>

                <div className="w-full flex items-center justify-between px-2 mb-6">
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Global Rank</span>
                    <span className="text-xl font-black text-[#FF8A00] flex items-center gap-1"><Medal size={16}/> #{topUser.rank}</span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Codeyx Score</span>
                    <span className="text-xl font-black text-[#FF8A00]">{topUser.rating}/100</span>
                  </div>
                </div>

                {/* Score formula label */}
                <div className="w-full text-center text-[9px] font-bold text-gray-600 mb-4 leading-relaxed">
                  Problems · Contest · Accuracy · Consistency · Speed<br/>
                  <span className="text-gray-700">Weighted composite score (0–100)</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full flex flex-col gap-2 mb-6">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-400">Progress to Legend</span>
                    <span className="text-gray-300">{topUser.rating}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF8A00] to-yellow-400 rounded-full shadow-[0_0_10px_#FF8A00] transition-all duration-700"
                      style={{ width: `${Math.min(100, topUser.rating)}%` }}
                    />
                  </div>
                </div>

                {topUser.isPublic !== false ? (
                  <Link href={`/profile/${topUser.userId}`} className="w-full py-2.5 rounded-xl border border-[#FF8A00]/50 hover:bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-black transition-all text-center">
                    View Profile
                  </Link>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-500/80 text-xs font-black select-none cursor-not-allowed text-center flex items-center justify-center gap-2">
                    <Lock size={13} /> Profile is Private
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center mb-6 text-center">
                  <span className="text-sm font-black text-white mb-1">No Top Coder Yet</span>
                  <span className="text-[10px] text-gray-500 font-semibold px-4">Connect platforms to climb ranks!</span>
                </div>

                <div className="w-full flex items-center justify-between px-2 mb-6 opacity-30">
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Global Rank</span>
                    <span className="text-lg font-black text-white flex items-center gap-1">#--</span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Rating</span>
                    <span className="text-lg font-black text-white">0</span>
                  </div>
                </div>

                <Link href="/dashboard" className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 text-xs font-black transition-all text-center">
                  Connect Account
                </Link>
              </>
            )}
          </div>

          {/* Your Standing Profile Card */}
          {myStanding && (
            <div 
              onClick={() => openUserProfile(myStanding)}
              className="bg-[#101014] border border-white/5 hover:border-[#FF8A00]/40 hover:bg-white/[0.01] rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 shadow-lg group cursor-pointer active:scale-95"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FF8A00]/30 to-transparent" />
              
              <div className="flex items-center gap-4 w-full">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 p-0.5 border border-white/10 group-hover:border-[#FF8A00]/40 transition-colors overflow-hidden">
                    {myStanding.avatarUrl ? (
                      <img src={myStanding.avatarUrl} alt={myStanding.user} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full bg-blue-500/20 flex items-center justify-center rounded-full">
                        <User size={18} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF8A00] border-2 border-[#101014] flex items-center justify-center shadow text-[9px] font-black text-black">
                    #{myStanding.rank}
                  </div>
                </div>

                {/* Name details */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-black text-white group-hover:text-[#FF8A00] transition-colors truncate flex items-center gap-1">
                    {myStanding.user} {myStanding.isVerified && <CheckSquare size={12} className="text-blue-500" />}
                  </span>
                  <span className="text-[9px] text-gray-500 font-semibold truncate">{myStanding.username ? `@${myStanding.username}` : 'No username set'}</span>
                </div>

                {/* Standing points */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-black text-[#FF8A00]">
                    {activeLeaderboard === 'Contest Leaderboard' ? `${(myStanding.contestRating ?? myStanding.rawCombinedRating ?? 0).toLocaleString()}` : `${myStanding.rating}/100`}
                  </span>
                  <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">
                    {activeLeaderboard === 'Contest Leaderboard' ? 'Rating' : 'Score'}
                  </span>
                </div>
              </div>

              {/* Action Helper Tooltip */}
              <div className="w-full border-t border-white/5 pt-2.5 flex items-center justify-between text-[8px] text-gray-500 font-bold group-hover:text-gray-400 transition-colors">
                <span>Your Standing (Omni-Platform)</span>
                <span className="text-[#FF8A00] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Click to inspect stats &rarr;
                </span>
              </div>
            </div>
          )}

          {/* Your Statistics Card — Live via Profile Click */}
          {/* Performance Radar Card */}
          <div className="bg-[#101014] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF8A00]/20 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white">Performance Radar</h3>
              <span className="text-[9px] font-extrabold text-[#FF8A00] uppercase tracking-widest bg-[#FF8A00]/10 border border-[#FF8A00]/20 px-2 py-1 rounded">
                {activeRadarUser ? activeRadarUser.user : 'No User'}
              </span>
            </div>

            {activeRadarUser ? (
              <div className="flex flex-col items-center py-2 gap-3">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={[
                    { subject: 'DSA',    value: values[0], fullMark: 100 },
                    { subject: 'Contest', value: values[1], fullMark: 100 },
                    { subject: 'Speed',  value: values[2], fullMark: 100 },
                    { subject: 'Accuracy', value: values[3], fullMark: 100 },
                    { subject: 'Consistency', value: values[4], fullMark: 100 },
                  ]} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <PolarGrid stroke="var(--radar-grid)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 8, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#FF8A00" fill="#FF8A00" fillOpacity={0.15} strokeWidth={1.5}
                      dot={{ r: 2.5, fill: '#FF8A00', strokeWidth: 0 }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#0d0d12] border border-[#FF8A00]/30 rounded-lg px-2 py-1 text-[9px] shadow-2xl">
                              <span className="text-[#FF8A00] font-black">{payload[0].payload.subject}</span>
                              <span className="text-white font-bold ml-1.5">{payload[0].value}</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">
                    {activeRadarUser.user}'s Skill Profile
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center opacity-40">
                  <BarChart3 size={28} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 mb-1">Click Any User to View</p>
                  <p className="text-[10px] text-gray-600 font-semibold leading-relaxed max-w-[160px]">
                    Select a row in the leaderboard to see their real performance radar chart
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Top 3 Rankers Card */}
          <div className="bg-[#101014] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF8A00]/10 to-transparent" />
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
               <h3 className="text-sm font-black text-white flex items-center gap-2">
                 <Trophy size={16} className="text-[#FF8A00]" /> Top 3 Rankers
               </h3>
            </div>

            <div className="flex flex-col gap-4">
              {fullData.length === 0 ? (
                <div className="text-center py-4 text-xs font-semibold text-gray-500">No data found</div>
              ) : (
                fullData.slice(0, 3).map((user, i) => {
                  const rankColor = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-purple-400' : 'text-[#FF8A00]';
                  return (
                    <div key={i} className="flex items-center gap-3 hover:bg-white/[0.02] p-2 rounded-xl transition-all cursor-pointer" onClick={() => { setActiveRadarUser(user); openUserProfile(user); }}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${rankColor} border border-white/5 bg-white/5`}>
                        {i + 1}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.user} className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-black text-gray-200 truncate flex items-center gap-1">
                          {user.user}
                          {user.isVerified && <CheckSquare size={10} className="text-blue-500 shrink-0" />}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold truncate">{user.college || 'No University'}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-black text-white">{user.rating}/100</span>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Score</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
