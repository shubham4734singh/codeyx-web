"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Calendar, PlayCircle, History, User, Bookmark, 
  Search, ChevronDown, ChevronLeft, ChevronRight, CheckSquare, Settings, ArrowRight,
  MonitorPlay, Code2, Shield, CalendarDays, Users, LayoutList,
  Filter, Star, TrendingUp, Clock, Plus, CalendarPlus, BellRing, Lock, RefreshCw
} from 'lucide-react';
import TopNavbar from '@/components/shared/TopNavbar';
import { SignedIn, SignedOut, useAuth } from '@clerk/nextjs';
import Link from 'next/link';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Date format helper to UTC YYYYMMDDTHHmmSSZ
const formatToUTCString = (dateStr: string): string => {
  const d = new Date(dateStr);
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

const getGoogleCalendarUrl = (c: any) => {
  if (!c) return '';
  const start = formatToUTCString(c.startTime);
  const end = formatToUTCString(c.endTime);
  const details = encodeURIComponent(`Sync with Codeyx Contest Aggregator!\nPlatform: ${c.plat}\nURL: ${c.url}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(c.name)}&dates=${start}/${end}&details=${details}&location=${encodeURIComponent(c.url)}`;
};

const getOutlookCalendarUrl = (c: any) => {
  if (!c) return '';
  const start = new Date(c.startTime).toISOString();
  const end = new Date(c.endTime).toISOString();
  const subject = encodeURIComponent(c.name);
  const body = encodeURIComponent(`Sync with Codeyx Contest Aggregator!\nPlatform: ${c.plat}\nURL: ${c.url}`);
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${start}&enddt=${end}&body=${body}&location=${encodeURIComponent(c.plat)}`;
};

const getPlatformTheme = (plat: string) => {
  if (!plat) return {
    glow: 'from-gray-500/10 to-transparent',
    accent: '#94A3B8',
    text: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    banner: 'from-slate-500/20 via-[#101014] to-[#101014]'
  };
  const p = plat.toLowerCase();
  if (p.includes('leetcode')) {
    return {
      glow: 'from-amber-500/20 to-transparent',
      accent: '#FF8A00',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      banner: 'from-amber-500/20 via-[#101014] to-[#101014]'
    };
  }
  if (p.includes('codeforces')) {
    return {
      glow: 'from-blue-500/20 to-transparent',
      accent: '#3B82F6',
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      banner: 'from-blue-500/20 via-[#101014] to-[#101014]'
    };
  }
  if (p.includes('codechef')) {
    return {
      glow: 'from-orange-500/20 to-transparent',
      accent: '#FF8A00',
      text: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      banner: 'from-[#FF8A00]/20 via-[#101014] to-[#101014]'
    };
  }
  return {
    glow: 'from-gray-500/25 to-transparent',
    accent: '#94A3B8',
    text: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    banner: 'from-slate-500/20 via-[#101014] to-[#101014]'
  };
};

export default function ContestsPage() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState('All Contests');
  const [openCalendarId, setOpenCalendarId] = useState<number | null>(null);
  
  // Interactive Modal for Reminder/Calendar integrations
  const [selectedContest, setSelectedContest] = useState<any | null>(null);
  const [reminderBefore, setReminderBefore] = useState<number>(30); // default 30 mins
  const [isReminderSubmitting, setIsReminderSubmitting] = useState(false);
  const [reminderStatusMsg, setReminderStatusMsg] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSetReminder = async () => {
    if (!selectedContest) return;
    if (!userId) {
      setReminderStatusMsg('🔒 Please sign in to set reminders.');
      return;
    }
    setIsReminderSubmitting(true);
    setReminderStatusMsg('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/contests/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contestId: selectedContest.id,
          reminderBefore
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReminderStatusMsg('✅ Real-time reminder scheduled successfully!');
      } else {
        setReminderStatusMsg(`❌ ${data.message || 'Failed to schedule reminder.'}`);
      }
    } catch (err: any) {
      setReminderStatusMsg('❌ Network error. Please try again.');
    } finally {
      setIsReminderSubmitting(false);
    }
  };


  const [contestsList, setContestsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncContests = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/contests?refresh=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch from backend: ' + response.status);
      }
      const json = await response.json();
      if (json.success && json.data) {
        const mappedData = json.data.map((c: any) => {
          const startDate = new Date(c.startTime);
          let iconColor = 'text-gray-400';
          let diffColor = 'text-[#FF8A00]';
          let plat = c.site || 'Unknown';
          
          if (plat.toLowerCase().includes('leetcode')) { iconColor = 'text-yellow-500'; diffColor = 'text-emerald-400'; }
          else if (plat.toLowerCase().includes('codechef')) { iconColor = 'text-[#FF8A00]'; diffColor = 'text-rose-500'; }
          else if (plat.toLowerCase().includes('atcoder')) { iconColor = 'text-gray-300'; diffColor = 'text-[#FF8A00]'; }
          else if (plat.toLowerCase().includes('codeforces')) { iconColor = 'text-blue-500'; diffColor = 'text-rose-500'; }
          else if (plat.toLowerCase().includes('hacker')) { iconColor = 'text-emerald-500'; diffColor = 'text-emerald-400'; }

          let status = 'Upcoming';
          const endDate = new Date(c.endTime);
          const currentDate = new Date();
          
          if (c.status === 'CODING' || (currentDate >= startDate && currentDate <= endDate)) {
            status = 'Live';
          }

          return {
            id: c._id,
            name: c.name,
            plat: plat,
            date: startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            timestamp: startDate.getTime(),
            startTime: c.startTime,
            endTime: c.endTime,
            url: c.url,
            status: status,
            iconColor,
            diff: plat.toLowerCase().includes('leetcode') ? 'Easy' : 'Medium',
            diffColor
          };
        });
        setContestsList(mappedData);
      }
    } catch (error: any) {
      console.error("Error refreshing contests:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  React.useEffect(() => {
    const fetchContests = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/contests`);
        if (!response.ok) {
          throw new Error('Failed to fetch from backend: ' + response.status);
        }
        const json = await response.json();
        setDebugMsg('Fetched json: success=' + json.success + ' data.length=' + (json.data ? json.data.length : 'null'));
        if (json.success && json.data) {
          const mappedData = json.data.map((c: any) => {
            const startDate = new Date(c.startTime);
            let iconColor = 'text-gray-400';
            let diffColor = 'text-[#FF8A00]';
            let plat = c.site || 'Unknown';
            
            if (plat.toLowerCase().includes('leetcode')) { iconColor = 'text-yellow-500'; diffColor = 'text-emerald-400'; }
            else if (plat.toLowerCase().includes('codechef')) { iconColor = 'text-[#FF8A00]'; diffColor = 'text-rose-500'; }
            else if (plat.toLowerCase().includes('atcoder')) { iconColor = 'text-gray-300'; diffColor = 'text-[#FF8A00]'; }
            else if (plat.toLowerCase().includes('codeforces')) { iconColor = 'text-blue-500'; diffColor = 'text-rose-500'; }
            else if (plat.toLowerCase().includes('hacker')) { iconColor = 'text-emerald-500'; diffColor = 'text-emerald-400'; }

            let status = 'Upcoming';
            const endDate = new Date(c.endTime);
            const currentDate = new Date();
            
            if (c.status === 'CODING' || (currentDate >= startDate && currentDate <= endDate)) {
              status = 'Live';
            }

            return {
              id: c._id,
              name: c.name,
              plat: plat,
              date: startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              time: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              timestamp: startDate.getTime(),
              startTime: c.startTime,
              endTime: c.endTime,
              url: c.url,
              status: status,
              iconColor,
              diff: plat.toLowerCase().includes('leetcode') ? 'Easy' : 'Medium',
              diffColor
            };
          });
          setContestsList(mappedData);
          setDebugMsg(prev => prev + ' | mappedData.length=' + mappedData.length);
        } else {
          setDebugMsg('Backend returned failure: ' + JSON.stringify(json));
          console.error("Backend returned failure");
        }
      } catch (error: any) {
        setDebugMsg('Error fetching: ' + error.message);
        console.error("Error fetching cached contests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContests();

    // Auto refresh contests data in background every 5 minutes
    const interval = setInterval(() => {
      fetchContests();
    }, 1000 * 60 * 5);

    return () => clearInterval(interval);
  }, []);

  const filteredContests = contestsList.filter(contest => {
    if (activeTab === 'All Contests') return true;
    if (activeTab === 'Upcoming') return contest.status === 'Upcoming';
    if (activeTab === 'Live Contests' || activeTab === 'Live') return contest.status === 'Live';
    if (activeTab === 'Past Contests' || activeTab === 'Past') return contest.status === 'Past';
    if (activeTab === 'My Contests') return contest.isMyContest;
    if (activeTab === 'Bookmarked') return contest.isBookmarked;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050816] font-sans selection:bg-[#FF8A00]/30 pb-20">
      <TopNavbar />
      
      {/* Abstract Glowing Backgrounds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-900/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-[#FF8A00]/5 blur-[120px]" />
      </div>

      <main className="max-w-[1600px] mx-auto px-6 pt-8 grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
        
        {/* MAIN CONTENT AREA */}
        <div className="xl:col-span-12 min-w-0 flex flex-col gap-8">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                Contests <Trophy size={28} className="text-[#FF8A00]" />
              </h1>
              <p className="text-sm font-semibold text-gray-400 max-w-2xl leading-relaxed">
                Compete, challenge and improve your problem solving skills. Sync with top platforms, view schedules in the contest calendar, and click any contest to set email reminders or synchronize directly to your Google, Outlook, or Apple calendar.
              </p>
            </div>
            
            <button
              onClick={handleSyncContests}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 active:scale-95 transition-all text-xs font-black text-white shadow-lg disabled:opacity-50 relative z-10"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FF8A00] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Contests'}</span>
            </button>
          </div>




          {/* Calendar View Area */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start mt-4">
            {/* Left List - Upcoming highlighting */}
            <div className="xl:col-span-1 bg-[#101014] border border-white/5 rounded-2xl p-4 flex flex-col h-[700px] overflow-y-auto custom-scrollbar">
              <h3 className="text-lg font-black text-white mb-2">Upcoming Highlights</h3>
              <p className="text-xs text-gray-500 mb-6">Today & next upcoming contests</p>
              
              <div className="flex flex-col gap-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-[#FF8A00]/20 border-t-[#FF8A00] animate-spin" />
                  </div>
                ) : (
                  filteredContests
                    .filter(c => {
                      const cDate = new Date(c.timestamp);
                      const isToday = cDate.toDateString() === new Date().toDateString();
                      const isFuture = c.timestamp > Date.now();
                      const isLive = c.status === 'Live';
                      return isToday || isFuture || isLive;
                    })
                    .sort((a, b) => {
                      const isTodayA = new Date(a.timestamp).toDateString() === new Date().toDateString();
                      const isTodayB = new Date(b.timestamp).toDateString() === new Date().toDateString();
                      if (isTodayA && !isTodayB) return -1;
                      if (!isTodayA && isTodayB) return 1;
                      return a.timestamp - b.timestamp;
                    })
                    .slice(0, 12)
                    .map((contest, index) => {
                      const isToday = new Date(contest.timestamp).toDateString() === new Date().toDateString();
                      return (
                        <div key={index} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            {isToday ? (
                              <span className="text-[9px] font-black tracking-widest bg-[#FF8A00]/10 border border-[#FF8A00]/30 rounded px-2.5 py-0.5 animate-pulse" style={{ color: '#FF8A00' }}>
                                ● TODAY
                              </span>
                            ) : (
                              <div className="text-[10px] font-bold text-gray-400">{contest.date}</div>
                            )}
                          </div>
                                          <div 
                            onClick={() => { setSelectedContest(contest); setReminderStatusMsg(''); }}
                            className={`rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-300 cursor-pointer group/card ${
                              isToday 
                                ? 'bg-[#FF8A00]/5 border border-[#FF8A00]/30 shadow-[0_0_15px_rgba(255,138,0,0.1)] hover:border-[#FF8A00]/50 hover:bg-[#FF8A00]/10 hover:scale-[1.015]' 
                                : 'bg-[#18181f] border border-white/5 hover:border-[#FF8A00]/30 hover:bg-[#20202a] hover:scale-[1.015]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: isToday ? '#FF8A00' : '#d1d5db' }}>
                                 <div className={`w-2 h-2 rounded-full ${
                                   contest.status === 'Live' ? 'bg-red-500 animate-pulse' : 'bg-[#FF8A00]'
                                 } ${isToday ? 'shadow-[0_0_8px_#FF8A00]' : ''}`} /> 
                                 {contest.time}
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 group-hover/card:text-[#FF8A00] transition-colors flex items-center gap-1">
                                <CalendarPlus size={12} />
                                <span className="opacity-0 group-hover/card:opacity-100 transition-opacity text-[9px] font-black tracking-wider uppercase">Sync</span>
                              </span>
                            </div>

                            <div className="text-sm font-black text-white flex items-start gap-2 text-left">
                              <span className={`text-[9px] mt-0.5 px-1.5 py-0.5 rounded border font-black uppercase tracking-widest shrink-0 ${
                                contest.plat.toLowerCase().includes('leetcode') ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                contest.plat.toLowerCase().includes('codechef') ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                contest.plat.toLowerCase().includes('codeforces') ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                'bg-white/5 text-gray-400 border-white/10'
                              }`}>
                                {contest.plat}
                              </span>
                              <span className="group-hover/card:text-[#FF8A00] transition-colors line-clamp-2">{contest.name}</span>
                            </div>

                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className="text-gray-500 group-hover/card:text-gray-400 transition-colors text-[9px] font-medium italic">
                                Click to set reminder / sync
                              </span>
                              <span className={`font-bold ${contest.diffColor}`}>{contest.diff}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
                {!isLoading && filteredContests.length === 0 && (
                   <div className="text-xs text-gray-500 text-center py-4">No upcoming contests found.</div>
                )}
              </div>
            </div>
            
            {/* Right Grid - Calendar */}
            <div className="xl:col-span-3 bg-[#101014] border border-white/5 rounded-2xl flex flex-col h-[700px] overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-black text-white">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevMonth} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronLeft size={16}/></button>
                  <button onClick={handleNextMonth} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronRight size={16}/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 border-b border-white/5 bg-black/20 text-center text-xs font-bold text-gray-500 py-3">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              
              <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(6,1fr)] relative min-h-0 overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#101014]/50 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full border-2 border-[#FF8A00]/20 border-t-[#FF8A00] animate-spin" />
                  </div>
                )}
                {Array.from({ length: 42 }).map((_, i) => {
                   const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
                   const dayNum = i - firstDayOfMonth + 1;
                   const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                   
                   const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth();
                   const displayNum = cellDate.getDate();
                   const isToday = cellDate.toDateString() === new Date().toDateString();
                   
                   // Find contests for this exact date
                   const dayContests = filteredContests.filter(c => {
                       const cDate = new Date(c.timestamp);
                       return cDate.getDate() === cellDate.getDate() && 
                              cDate.getMonth() === cellDate.getMonth() && 
                              cDate.getFullYear() === cellDate.getFullYear();
                   });
                   
                   return (
                     <div 
                       key={i} 
                       className={`border-r border-b border-white/5 p-1.5 flex flex-col gap-1 min-h-0 overflow-hidden transition-all duration-300 relative group ${
                         !isCurrentMonth ? 'opacity-30' : ''
                       } ${
                         isToday 
                           ? 'bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.12)]' 
                           : 'hover:bg-white/[0.02]'
                       }`}
                     >
                       <div className={`text-right text-[10px] font-black mb-1 ${isToday ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {displayNum}
                       </div>
                       
                       <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-0.5 min-h-0">
                         {dayContests.map((c, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => { setSelectedContest(c); setReminderStatusMsg(''); }} 
                              className={`px-1.5 py-1 rounded text-[9px] font-bold truncate flex items-center gap-1 transition-all duration-200 hover:scale-[1.04] cursor-pointer ${
                               c.status === 'Live' ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 
                               c.plat.toLowerCase().includes('codeforces') ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' :
                               c.plat.toLowerCase().includes('leetcode') ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' :
                               'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                             }`}
                             title={`${c.name} at ${c.time} (Click to set reminder/sync)`}
                           >
                             <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === 'Live' ? 'bg-red-400 animate-pulse' : 'bg-current'}`} />
                             {c.name}
                           </button>
                         ))}
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SELECTED CONTEST DETAIL & REMINDER MODAL */}
      {selectedContest && (() => {
        const theme = getPlatformTheme(selectedContest.plat);
        
        // Calculate duration safely
        let durationStr = "N/A";
        if (selectedContest.startTime && selectedContest.endTime) {
          const diffMs = new Date(selectedContest.endTime).getTime() - new Date(selectedContest.startTime).getTime();
          const durationHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const durationMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          durationStr = `${durationHrs}h ${durationMins > 0 ? `${durationMins}m` : ''}`;
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-lg bg-[#0d0d12]/95 border border-white/10 rounded-[28px] overflow-hidden shadow-2xl relative"
            >
              {/* Dynamic ambient header background decoration */}
              <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${theme.glow} opacity-60 pointer-events-none filter blur-2xl`} />

              {/* Dynamic platform top accent strip */}
              <div className="absolute top-0 inset-x-0 h-[3px]" style={{ backgroundColor: theme.accent }} />

              <div className="p-6 md:p-8 flex flex-col gap-6 relative z-10">
                {/* Platform Badge & Title block */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${theme.bg} ${theme.text} border ${theme.border}`}>
                        {selectedContest.plat}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: '#8e8e93' }}>
                        {selectedContest.diff}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight mt-1" style={{ color: '#ffffff' }}>
                      {selectedContest.name}
                    </h2>
                  </div>
                  
                  {/* Premium Close Button */}
                  <button 
                    onClick={() => setSelectedContest(null)}
                    className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all duration-300"
                    style={{ color: '#8e8e93' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Modern Three-Column Stats Grid */}
                <div className="grid grid-cols-3 gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  {/* 1. Starts At */}
                  <div className="flex flex-col gap-1 border-r border-white/5 pr-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#8e8e93' }}>
                      <Clock size={11} className={theme.text} /> Starts At
                    </span>
                    <div className="text-xs font-black mt-1" style={{ color: '#ffffff' }}>
                      {selectedContest.time}
                    </div>
                    <span className="text-[9px] font-medium leading-none" style={{ color: '#aeaeb2' }}>{selectedContest.date}</span>
                  </div>

                  {/* 2. Duration */}
                  <div className="flex flex-col gap-1 border-r border-white/5 px-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#8e8e93' }}>
                      <Clock size={11} className={theme.text} /> Duration
                    </span>
                    <div className="text-xs font-black mt-1" style={{ color: '#ffffff' }}>
                      {durationStr}
                    </div>
                    <span className="text-[9px] font-medium leading-none" style={{ color: '#aeaeb2' }}>Limit</span>
                  </div>

                  {/* 3. Status */}
                  <div className="flex flex-col gap-1 pl-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#8e8e93' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Status
                    </span>
                    <div className="text-xs font-black mt-1">
                      <span style={{ color: selectedContest.status === 'Live' ? '#ff453a' : '#30d158' }}>
                        {selectedContest.status === 'Live' ? 'Ongoing' : 'Upcoming'}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium leading-none" style={{ color: '#aeaeb2' }}>Schedule</span>
                  </div>
                </div>

                {/* Calendar Sync Actions */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#aeaeb2' }}>
                    <CalendarPlus size={13} className="text-[#FF8A00]" /> Synchronize to Calendar
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Google */}
                    <a 
                      href={getGoogleCalendarUrl(selectedContest)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 py-3 px-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-[#FF8A00]/30 text-xs font-black rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <CalendarDays size={16} className="text-[#FF8A00] mb-0.5" />
                      <span className="text-[10px] font-bold text-gray-300">Google</span>
                    </a>

                    {/* Outlook */}
                    <a 
                      href={getOutlookCalendarUrl(selectedContest)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 py-3 px-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-blue-500/30 text-xs font-black rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Calendar size={16} className="text-blue-400 mb-0.5" />
                      <span className="text-[10px] font-bold text-gray-300">Outlook</span>
                    </a>

                    {/* Apple / Download ICS */}
                    <a 
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/contests/export/ics/${selectedContest.id}`}
                      download
                      className="flex flex-col items-center gap-1.5 py-3 px-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-emerald-500/30 text-xs font-black rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <CalendarPlus size={16} className="text-emerald-400 mb-0.5" />
                      <span className="text-[10px] font-bold text-gray-300">Apple / ICS</span>
                    </a>
                  </div>
                </div>

                {/* Real-time Reminders */}
                <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#aeaeb2' }}>
                    <BellRing size={13} className="text-[#FF8A00]" /> Set Contest Reminder
                  </h3>
                  
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <select 
                        value={reminderBefore}
                        onChange={(e) => setReminderBefore(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#FF8A00]/50 appearance-none cursor-pointer font-bold"
                      >
                        <option value={15} className="bg-[#0d0d12] text-white">15 minutes before</option>
                        <option value={30} className="bg-[#0d0d12] text-white">30 minutes before</option>
                        <option value={60} className="bg-[#0d0d12] text-white">1 hour before</option>
                        <option value={120} className="bg-[#0d0d12] text-white">2 hours before</option>
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    <button
                      onClick={handleSetReminder}
                      disabled={isReminderSubmitting}
                      className="px-4 py-2.5 bg-[#FF8A00] hover:bg-orange-500 disabled:opacity-50 text-black font-black rounded-xl text-xs transition-all duration-300 flex items-center gap-1.5 shrink-0"
                    >
                      {isReminderSubmitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                      ) : (
                        <BellRing size={12} strokeWidth={2.5} />
                      )}
                      {isReminderSubmitting ? 'Setting...' : 'Set Reminder'}
                    </button>
                  </div>

                  {reminderStatusMsg && (
                    <p className={`text-[11px] font-semibold mt-1 px-3 py-2 rounded-lg border ${
                      reminderStatusMsg.includes('✅') 
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}>
                      {reminderStatusMsg}
                    </p>
                  )}
                </div>

                {/* Ultimate Visit Platform Primary CTA */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
                  <a 
                    href={selectedContest.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.accent} 0%, #FF8A00 100%)`,
                      boxShadow: `0 8px 24px -6px ${theme.accent}50`,
                      color: '#ffffff'
                    }}
                    className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black rounded-xl transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                  >
                    Go to Platform Contest Page ↗
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
