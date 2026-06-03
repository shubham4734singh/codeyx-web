"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useClerk, SignInButton, SignedOut, SignedIn, UserButton, useAuth } from '@clerk/nextjs';
import { Search, Sun, Moon, Bell, ChevronDown, Briefcase, RefreshCw, Activity, ExternalLink, LogOut, User, Settings, Lock, Flame, Code2, Trophy, Clock, CalendarDays, Menu, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { platformService } from '../../services/platform.service';
import { progressService } from '../../services/progress.service';
import { useSocket } from '../../hooks/useSocket';
import { useQuery } from '@tanstack/react-query';
import { SiLeetcode, SiCodeforces, SiGeeksforgeeks, SiCodechef, SiHackerrank, SiHackerearth, SiGithub } from 'react-icons/si';

const platformsList = [
  { id: 'leetcode',     name: 'LeetCode',      icon: <SiLeetcode     size={16} className="text-yellow-500" /> },
  { id: 'codeforces',  name: 'Codeforces',    icon: <SiCodeforces   size={16} className="text-blue-500" /> },
  { id: 'geeksforgeeks', name: 'GeeksforGeeks', icon: <SiGeeksforgeeks size={16} className="text-green-500" /> },
  { id: 'codechef',    name: 'CodeChef',      icon: <SiCodechef     size={16} className="text-amber-700" /> },
  { id: 'hackerrank',  name: 'HackerRank',    icon: <SiHackerrank   size={16} className="text-emerald-400" /> },
  { id: 'atcoder',     name: 'AtCoder',       icon: <Code2          size={16} className="text-gray-300" /> },
  { id: 'hackerearth', name: 'HackerEarth',   icon: <SiHackerearth  size={16} className="text-indigo-400" /> },
  { id: 'github',      name: 'GitHub',        icon: <SiGithub       size={16} className="text-gray-200" /> },
];

const initialActiveSheets: any[] = [];

export default function TopNavbar() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const pathname = usePathname();
  const socket = useSocket();

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allProgress', user?.id],
    queryFn: async () => {
      const response: any = await progressService.getAllProgress();
      return response?.data || response || [];
    },
    enabled: isLoaded && !!user,
  });

  const activeSheets = allProgress.filter((p: any) => p.solvedProblems > 0).sort((a: any, b: any) => {
    return new Date(b.lastSolved || 0).getTime() - new Date(a.lastSolved || 0).getTime();
  });
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [popupNotification, setPopupNotification] = React.useState<any>(null);
  const { getToken } = useAuth();

  const fetchNotifications = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`http://localhost:5005/api/notifications`, {
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  React.useEffect(() => {
    if (isLoaded && user) {
      fetchNotifications();
    }
  }, [isLoaded, user]);

  React.useEffect(() => {
    if (socket) {
      socket.on('NEW_NOTIFICATION', (notification: any) => {
        setNotifications((prev) => [notification, ...prev]);
        setShowNotifications(true); 
        
        // Trigger Popup
        setPopupNotification(notification);
        setTimeout(() => {
          setPopupNotification(null);
        }, 5000);
      });
    }
    return () => {
      socket?.off('NEW_NOTIFICATION');
    };
  }, [socket]);

  const markAllAsRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    try {
      const token = await getToken();
      await fetch(`http://localhost:5005/api/notifications/read`, { 
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {}
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    try {
      const token = await getToken();
      await fetch(`http://localhost:5005/api/notifications`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {}
  };

  const [realPlatforms, setRealPlatforms] = React.useState<any[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [hasCheckedPlatforms, setHasCheckedPlatforms] = React.useState(false);

  const handleSyncAll = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      if (realPlatforms.length > 0) {
        await Promise.all(realPlatforms.map(p => 
          platformService.syncPlatform(p.platform, user.id, p.platformUsername)
        ));
      }
      const res: any = await platformService.getAllPlatformStats(user.id);
      const platformsArray = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : (res.data?.data || []));
      if (platformsArray && platformsArray.length > 0) {
        setRealPlatforms(platformsArray);
        const latest = platformsArray.reduce((max: any, p: any) =>
          new Date(p.lastSyncedAt) > new Date(max) ? p.lastSyncedAt : max, new Date(0)
        );
        if (latest && new Date(latest).getTime() > 0) setLastSyncedAt(new Date(latest));
      }
    } catch (err) {
      console.error('Failed to sync all platforms', err);
    } finally {
      setIsSyncing(false);
    }
  };

  React.useEffect(() => {
    if (isLoaded && user) {
      const fetchPlatforms = async () => {
        try {
          const res: any = await platformService.getAllPlatformStats(user.id);
          // With interceptor, res is the actual payload: { statusCode, data, message }
          // Or if no interceptor, it's { data: { data } }
          const platformsArray = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : (res.data?.data || []));

          if (platformsArray && platformsArray.length > 0) {
            setRealPlatforms(platformsArray);
            const latest = platformsArray.reduce((max: any, p: any) =>
              new Date(p.lastSyncedAt) > new Date(max) ? p.lastSyncedAt : max, new Date(0)
            );
            if (latest && new Date(latest).getTime() > 0) setLastSyncedAt(new Date(latest));
          } else {
            setRealPlatforms([]);
          }
        } catch (e) {
          console.error('Failed to fetch platforms', e);
        } finally {
          setHasCheckedPlatforms(true);
        }
      };

      fetchPlatforms();

      const handlePlatformsUpdated = (e: any) => {
        if (e.detail && Array.isArray(e.detail)) {
          setRealPlatforms(e.detail);
          const latest = e.detail.reduce((max: any, p: any) =>
            new Date(p.lastSyncedAt) > new Date(max) ? p.lastSyncedAt : max, new Date(0)
          );
          if (latest && new Date(latest).getTime() > 0) setLastSyncedAt(new Date(latest));
        } else {
          fetchPlatforms();
        }
      };

      window.addEventListener('platformsUpdated', handlePlatformsUpdated);
      return () => window.removeEventListener('platformsUpdated', handlePlatformsUpdated);
    }
  }, [isLoaded, user, pathname]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isScrolling, setIsScrolling] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      let isScrollingNow = false;
      let scrollTimer: NodeJS.Timeout;

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
        
        if (!isScrollingNow) {
           isScrollingNow = true;
           setIsScrolling(true);
           setShowNotifications(false);
           
           // Try to close Clerk UserButton popover by dispatching a mousedown event (simulates click outside)
           document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
           document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
           document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        }

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
           isScrollingNow = false;
           setIsScrolling(false);
        }, 300);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimer);
      };
    }
  }, []);

  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const userName = isLoaded && user?.firstName ? user.firstName : 'Lalit';
  const userImage = isLoaded && user?.imageUrl ? user.imageUrl : null;
  const defaultUsername = isLoaded && user ? (user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || user.firstName?.toLowerCase() || 'lalitmodi') : 'lalitmodi';
  const [displayUsername, setDisplayUsername] = React.useState(defaultUsername);

  React.useEffect(() => {
    if (isLoaded && user) {
      setDisplayUsername(localStorage.getItem('codeyx_username') || defaultUsername);
    }
  }, [isLoaded, user, defaultUsername]);

  React.useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setDisplayUsername(e.detail);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const cardBg = "bg-gray-50 dark:bg-[#101014]";
  const border = "border-gray-200 dark:border-white/5";

  return (
    <>
      {/* Spacer to maintain document flow */}
      <div className="h-16 w-full shrink-0" />
      <div className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-500 ease-out flex justify-center w-full ${isScrolled ? 'pt-2 px-2 md:pt-4 md:px-4' : 'pt-0 px-0'}`}>
        <motion.nav 
          layout
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative z-[99999] flex items-center border ${border} backdrop-blur-xl bg-white/90 dark:bg-[#09090B]/90 ${isScrolled ? 'h-14 px-4 xl:px-8 rounded-full shadow-2xl shadow-[#FF8A00]/10 border-gray-200 dark:border-white/10 w-full md:w-auto md:justify-center justify-between' : 'h-16 w-full pl-2 pr-4 rounded-none justify-between border-t-0 border-l-0 border-r-0'}`}
        >
          {/* Left: Branding & Search */}
          <motion.div 
            layout
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`flex-shrink-0 flex items-center justify-start gap-0 overflow-hidden whitespace-nowrap ${(isScrolled && !isMobileMenuOpen) ? 'xl:hidden opacity-100' : 'opacity-100'} ${isScrolled ? 'md:hidden' : ''}`}
          >
            <Link href="/" className="flex items-center group pr-2 select-none ml-2 md:ml-6">
              <img 
                src={isDarkMode ? "/assets/logo-dark-them.png" : "/assets/logo-light-Them.png"} 
                alt="Codeyx Logo" 
                className="h-[60px] md:h-[75px] w-auto object-contain transition-transform group-hover:scale-105 scale-110 origin-left" 
              />
            </Link>
          </motion.div>

          {/* Center: Nav Links */}
          <motion.div layout transition={{ duration: 0.5, ease: "easeOut" }} className="hidden xl:flex shrink-0 items-center gap-4">
            {(pathname === '/'
              ? [
                { label: 'Sheets', href: '/explore-sheets', isPrivate: false },
                { label: 'Projects', href: '/explore-projects', isPrivate: false },
                { label: 'Patterns', href: '/patterns', isPrivate: false },
                { label: 'Contests', href: '/contests', isPrivate: false },
                { label: 'Leaderboard', href: '/leaderboard', isPrivate: false },
                { label: 'Profile', href: '/profile', isPrivate: true },
              ]
              : [
                { label: 'Home', href: '/dashboard', isPrivate: true },
                { label: 'Analytics', href: '/analytics', isPrivate: true },
                { label: 'Sheets', href: '/explore-sheets', isPrivate: false },
                { label: 'Patterns', href: '/patterns', isPrivate: false },
                { label: 'Workspace', href: '/workspace', isWorkspace: true, hasDropdown: true, isPrivate: true },
                { label: 'Platforms', href: '/dashboard/platforms/leetcode', isPlatforms: true, hasDropdown: true, isPrivate: true },
                { label: 'Resume', href: '/dashboard/resume', isPrivate: true },
                { label: 'Projects', href: '/explore-projects', isPrivate: false },
                { label: 'Contests', href: '/contests', isPrivate: false },
                { label: 'Leaderboard', href: '/leaderboard', isPrivate: false },
                { label: 'Profile', href: '/profile', isPrivate: true },
              ]
            ).map((item, i) => {
              const isActive = pathname === item.href || (pathname.startsWith('/sheets') && item.label === 'Workspace') || (pathname === '/dashboard' && item.label === 'Home') || (pathname.startsWith('/dashboard/platforms') && item.label === 'Platforms') || (pathname.startsWith('/dashboard/resume') && item.label === 'Resume') || (pathname.startsWith('/projects') && item.label === 'Projects') || (pathname.startsWith('/contests') && item.label === 'Contests') || (pathname.startsWith('/leaderboard') && item.label === 'Leaderboard') || (pathname.startsWith('/patterns') && item.label === 'Patterns') || (pathname.startsWith('/profile') && item.label === 'Profile');

              if (item.isPrivate && !user) {
                return (
                  <div key={i} className={`relative py-5 ${!isScrolling ? 'group/nav' : ''}`}>
                    <Link href="/login">
                      <button className="text-xs font-semibold flex items-center gap-1 transition-all text-gray-400 opacity-50 hover:opacity-100 hover:text-white cursor-pointer">
                        {item.label}
                        <Lock size={12} className="ml-0.5" />
                      </button>
                    </Link>
                  </div>
                );
              }

              return (
                <div key={i} className={`relative py-5 ${!isScrolling ? 'group/nav' : ''}`}>
                  <Link href={item.href || '#'} className={`text-xs font-semibold flex items-center gap-1 transition-all ${isActive ? 'text-[#FF8A00]' : 'text-gray-500 dark:text-[#A1A1AA] hover:text-black dark:text-white'}`}>
                    {item.label}
                    {item.hasDropdown && <ChevronDown size={12} className={`opacity-70 transition-transform ${item.isPlatforms ? 'group-hover/nav:rotate-180' : ''}`} />}
                    {isActive && (
                      <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF8A00] shadow-[0_-2px_10px_rgba(255,138,0,0.5)]" />
                    )}
                  </Link>

                  {/* Workspace Mega Dropdown */}
                  {item.isWorkspace && (
                    <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-[340px] opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-50 pt-2 pointer-events-none group-hover/nav:pointer-events-auto">
                      <div className="bg-white/95 dark:bg-[#111216]/95 border border-gray-200 dark:border-white/10 rounded-[16px] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl flex flex-col">
                        <div className="mb-4">
                          <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs">Recently Active Sheets</h3>
                        </div>
                        <div className="flex flex-col gap-1 mb-4">
                          {activeSheets.map((sheet: any) => (
                            <Link href={`/sheets/${sheet.slug}`} key={sheet.slug} className="flex flex-col p-3 hover:bg-white/[0.03] rounded-xl border border-transparent hover:border-gray-200 dark:border-white/5 transition-all group/sheet">
                              <div className="flex justify-between items-center mb-2.5">
                                <span className="text-xs font-semibold text-black dark:text-white group-hover/sheet:text-[#FF8A00] transition-colors">{sheet.title}</span>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{sheet.progressPercentage || 0}%</span>
                              </div>
                              <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#FF8A00] shadow-[0_0_10px_#FF8A00]" style={{ width: `${sheet.progressPercentage || 0}%` }} />
                              </div>
                            </Link>
                          ))}
                        </div>
                        <Link href="/explore-sheets" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 hover:border-white/20 hover:text-black dark:text-white text-gray-600 dark:text-gray-400 text-[11px] font-semibold transition-all">
                          + Explore More Sheets
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Platforms Mega Dropdown */}
                  {item.isPlatforms && (
                    <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-[340px] opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-50 pt-2 pointer-events-none group-hover/nav:pointer-events-auto">
                      <div className="bg-white/95 dark:bg-[#111216]/95 border border-gray-200 dark:border-white/10 rounded-[16px] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl flex flex-col">

                        {/* Header */}
                        <div className="mb-4">
                          <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs">Your Coding Platforms</h3>
                        </div>

                        {/* Platforms List */}
                        <div className="flex flex-col gap-1 mb-5">
                          {platformsList.map(platform => {
                            const dbData = realPlatforms.find(p => p.platform === platform.id);
                            if (!dbData) return null; // Hide if not connected

                            // Resolve human readable metric label on hover
                            let label = 'Platform Score';
                            let score = dbData.rating || dbData.totalSolved || dbData.stats?.publicRepos || 0;
                            
                            if (platform.id === 'leetcode') {
                              label = 'Solved Problems';
                              score = dbData.totalSolved || 0;
                            } else if (platform.id === 'codechef') {
                              label = 'Contest Rating';
                              score = dbData.rating || 0;
                            } else if (platform.id === 'hackerrank') {
                              label = 'Global Rank';
                              score = dbData.rating || 0;
                            } else if (platform.id === 'codeforces') {
                              label = 'Contest Rating';
                              score = dbData.rating || 0;
                            } else if (platform.id === 'atcoder') {
                              label = 'Contest Rating';
                              score = dbData.rating || 0;
                            } else if (platform.id === 'github') {
                              label = 'Public Repositories';
                              score = dbData.totalSolved || dbData.stats?.publicRepos || 0;
                            }

                            return (
                              <Link 
                                href={`/dashboard/platforms/${platform.id}`} 
                                key={platform.id} 
                                title={`${platform.name} • ${label}: ${score.toLocaleString()}`}
                                className="flex items-center justify-between py-1.5 hover:bg-white/[0.03] rounded-lg px-2 -mx-2 transition-colors group/plat"
                              >
                                <div className="flex items-center gap-3 w-[120px]">
                                  <div className="w-5 flex items-center justify-center">
                                    {platform.icon}
                                  </div>
                                  <span className="text-xs font-semibold text-black dark:text-white">{platform.name}</span>
                                </div>

                                <div className="flex-1 flex justify-center">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium border border-emerald-500/10">Connected</span>
                                </div>

                                <div 
                                  className="flex items-center justify-end gap-1 w-20 relative group/tooltip cursor-help"
                                >
                                  <Flame size={12} className="text-[#FF8A00]" />
                                  <span className="text-xs text-gray-300 font-medium">{score >= 1000 ? (score / 1000).toFixed(1) + 'K' : score}</span>
                                  
                                  {/* Custom Premium Instant Hover Tooltip */}
                                  <div className="absolute right-0 bottom-[120%] mb-1.5 hidden group-hover/tooltip:flex flex-col items-center z-50 pointer-events-none transition-all duration-200">
                                    <div className="bg-[#121214]/95 border border-white/10 text-[10px] text-white px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap font-semibold backdrop-blur-md">
                                      {label}: <span className="text-[#FF8A00] font-bold">{score.toLocaleString()}</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-[#121214]/95 border-r border-b border-white/10 rotate-45 -mt-[4px]" />
                                  </div>
                                </div>
                              </Link>
                            )
                          })}

                          <Link href="/settings/integrations" className="flex items-center justify-center py-2 mt-2 border border-dashed border-gray-200 dark:border-white/10 rounded-lg text-gray-500 hover:text-gray-300 hover:border-white/20 transition-all text-[10px] font-medium">
                            + Connect more platforms
                          </Link>
                        </div>

                        {/* Sync Button */}
                        <button 
                          onClick={handleSyncAll}
                          disabled={isSyncing}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#FF8A00]/30 text-[#FF8A00] hover:bg-[#FF8A00]/10 text-xs font-semibold transition-all mb-3 disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} /> 
                          {isSyncing ? "Syncing..." : "Sync All Platforms"}
                        </button>

                        {lastSyncedAt && (
                          <div className="flex items-center justify-center gap-1.5 mb-5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                              Last synced: {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}

                        {/* Footer Stats */}
                        {(() => {
                          const renderedConnected = realPlatforms.filter(p => platformsList.some(pl => pl.id === p.platform));
                          const connectedCount = renderedConnected.length;
                          const totalScore = renderedConnected.reduce((sum, p) => {
                            let score = p.rating || p.totalSolved || p.stats?.publicRepos || 0;
                            if (p.platform === 'leetcode') {
                              score = p.totalSolved || 0;
                            } else if (p.platform === 'github') {
                              score = p.totalSolved || p.stats?.publicRepos || 0;
                            }
                            return sum + score;
                          }, 0);
                          return (
                            <div className="bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-3 flex justify-between">
                              <div className="flex-1 flex flex-col items-center">
                                <span className="text-sm font-bold text-black dark:text-white mb-0.5">{platformsList.length}</span>
                                <span className="text-[9px] text-gray-500 font-medium">Platforms</span>
                              </div>
                              <div className="w-px bg-white/10" />
                              <div className="flex-1 flex flex-col items-center">
                                <span className="text-sm font-bold text-emerald-500 mb-0.5">{connectedCount}</span>
                                <span className="text-[9px] text-emerald-500 font-medium">Connected</span>
                              </div>
                              <div className="w-px bg-white/10" />
                              <div className="flex-1 flex flex-col items-center">
                                <span className="text-sm font-bold text-[#FF8A00] mb-0.5">{totalScore.toLocaleString()}</span>
                                <span className="text-[9px] text-gray-500 font-medium">Total Score</span>
                              </div>
                            </div>
                          )
                        })()}

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Right: Actions */}
          <motion.div 
            layout 
            transition={{ duration: 0.5, ease: "easeOut" }} 
            className={`flex-shrink-0 flex items-center justify-end gap-2 md:gap-4 whitespace-nowrap overflow-visible relative z-[99999] ${(isScrolled && !isMobileMenuOpen) ? 'xl:hidden opacity-100 pointer-events-auto' : 'opacity-100 pointer-events-auto'} ${isScrolled ? 'md:hidden' : ''}`}
          >

            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} aria-label="Toggle Theme" title="Toggle Theme" className={`p-2 rounded-xl border ${border} text-gray-500 dark:text-[#A1A1AA] hover:text-black dark:text-white hover:bg-black/5 dark:bg-white/5 transition-all`}>
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <SignedIn>
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    aria-label="Notifications" 
                    title="Notifications" 
                    className={`relative p-2 rounded-xl border ${border} text-gray-500 dark:text-[#A1A1AA] hover:text-black dark:text-white hover:bg-black/5 dark:bg-white/5 transition-all ${showNotifications ? 'bg-white/5 border-white/20 text-white' : ''}`}
                  >
                    <Bell size={15} />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-[#FF8A00] text-[#09090B] text-[9px] font-black rounded-full px-1 shadow-[0_0_10px_rgba(255,138,0,0.5)]">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-[120%] w-80 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[999999]"
                      >
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                          <h3 className="text-sm font-black text-white">Notifications</h3>
                          {notifications.length > 0 && (
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={markAllAsRead}
                                className="text-[10px] text-[#FF8A00] hover:text-[#FF8A00]/80 font-bold transition-colors"
                              >
                                Mark all as read
                              </button>
                              <button 
                                onClick={clearAllNotifications}
                                className="text-[10px] text-gray-400 hover:text-white font-bold transition-colors"
                              >
                                Clear all
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-xs font-medium">
                              No new notifications
                            </div>
                          ) : notifications.map((n) => (
                            <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-white/[0.03]' : ''}`}>
                              <div className="shrink-0 mt-0.5">
                                {n.type === 'urgent' ? <Flame size={16} className="text-red-500" /> :
                                 n.type === 'soon' ? <Clock size={16} className="text-[#FF8A00]" /> :
                                 n.type === 'success' ? <Trophy size={16} className="text-yellow-400" /> :
                                 <CalendarDays size={16} className="text-blue-400" />}
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <h4 className={`text-xs font-bold ${!n.read ? 'text-white' : 'text-gray-300'}`}>{n.title}</h4>
                                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]" />}
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{n.message}</p>
                                <span className="text-[9px] text-gray-600 mt-1 font-bold">{n.createdAt ? new Date(n.createdAt).toLocaleString() : n.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SignedIn>
            </div>

            <SignedIn>
              <div className="relative flex items-center">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-9 h-9 shadow-[0_0_15px_rgba(255,138,0,0.2)] border border-white/10 hover:scale-105 transition-transform"
                    }
                  }}
                />
              </div>
            </SignedIn>

            <SignedOut>
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors cursor-pointer">
                    Log In
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="px-5 py-2 rounded-xl bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black text-xs font-black shadow-[0_0_15px_rgba(255,138,0,0.3)] transition-all cursor-pointer">
                    Sign Up
                  </button>
                </Link>
              </div>
            </SignedOut>

            {/* Mobile Menu Toggle Button */}
            <div className="xl:hidden flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className={`p-2 rounded-xl border ${border} text-gray-500 dark:text-[#A1A1AA] hover:text-black dark:text-white hover:bg-black/5 dark:bg-white/5 transition-all`}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </motion.div>
        </motion.nav>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-3xl pt-24 px-6 pb-6 overflow-y-auto"
          >
            <div className="flex flex-col gap-4">
              {(pathname === '/'
                ? [
                  { label: 'Sheets', href: '/explore-sheets' },
                  { label: 'Projects', href: '/explore-projects' },
                  { label: 'Patterns', href: '/patterns' },
                  { label: 'Contests', href: '/contests' },
                  { label: 'Leaderboard', href: '/leaderboard' },
                  { label: 'Profile', href: '/profile' },
                ]
                : [
                  { label: 'Home', href: '/dashboard' },
                  { label: 'Analytics', href: '/analytics' },
                  { label: 'Sheets', href: '/explore-sheets' },
                  { label: 'Patterns', href: '/patterns' },
                  { label: 'Workspace', href: '/workspace' },
                  { label: 'Platforms', href: '/dashboard/platforms/leetcode' },
                  { label: 'Resume', href: '/dashboard/resume' },
                  { label: 'Projects', href: '/explore-projects' },
                  { label: 'Contests', href: '/contests' },
                  { label: 'Leaderboard', href: '/leaderboard' },
                  { label: 'Profile', href: '/profile' },
                ]
              ).map((item, i) => {
                const isActive = pathname === item.href || (pathname.startsWith('/sheets') && item.label === 'Workspace') || (pathname === '/dashboard' && item.label === 'Home') || (pathname.startsWith('/dashboard/platforms') && item.label === 'Platforms') || (pathname.startsWith('/dashboard/resume') && item.label === 'Resume') || (pathname.startsWith('/projects') && item.label === 'Projects') || (pathname.startsWith('/contests') && item.label === 'Contests') || (pathname.startsWith('/leaderboard') && item.label === 'Leaderboard') || (pathname.startsWith('/patterns') && item.label === 'Patterns') || (pathname.startsWith('/profile') && item.label === 'Profile');

                return (
                  <Link 
                    key={i}
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-lg font-bold p-4 rounded-2xl border ${isActive ? 'bg-[#FF8A00]/10 border-[#FF8A00]/20 text-[#FF8A00]' : 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] text-gray-700 dark:text-gray-300'} transition-all flex items-center justify-between`}
                  >
                    {item.label}
                    {isActive && <div className="w-2 h-2 rounded-full bg-[#FF8A00]" />}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBAL MODAL FOR CONNECTING PLATFORMS */}
      {isLoaded && user && hasCheckedPlatforms && realPlatforms.filter(p => p.platform !== 'codeyx').length === 0 && !pathname.startsWith('/settings') && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111216] border border-[#FF8A00]/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(255,138,0,0.15)] max-w-md w-full text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A00]/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="w-16 h-16 bg-[#FF8A00]/10 border border-[#FF8A00]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[#FF8A00]">
              <Globe size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-white mb-2">Connect a Platform</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed font-medium">
              You haven't connected any coding platforms yet. To use the Codeyx platform, you must connect at least one external platform like <strong className="text-white">GitHub</strong> or <strong className="text-white">LeetCode</strong>.
            </p>
            
            <div className="flex flex-col gap-3">
              <Link href="/settings/integrations">
                <button className="w-full bg-[#FF8A00] hover:bg-orange-500 text-[#101014] font-black uppercase py-3 px-6 rounded-xl text-xs transition-all shadow-[0_4px_15px_rgba(255,138,0,0.3)]">
                  Connect Platform Now
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      )}

      {/* NEW NOTIFICATION POPUP (TOAST) */}
      <AnimatePresence>
        {popupNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-[999999] bg-[#1a1b23] border border-[#FF8A00]/40 shadow-[0_10px_40px_rgba(255,138,0,0.2)] rounded-2xl p-4 w-[320px] flex gap-4 cursor-pointer"
            onClick={() => {
              setShowNotifications(true);
              setPopupNotification(null);
            }}
          >
            <div className="w-10 h-10 rounded-full bg-[#FF8A00]/20 flex items-center justify-center flex-shrink-0 text-[#FF8A00]">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-white text-sm font-bold mb-1 line-clamp-1">
                {popupNotification.title || "New Notification"}
              </h4>
              <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                {popupNotification.message || "You have received a new notification."}
              </p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setPopupNotification(null); }}
              className="text-gray-500 hover:text-white absolute top-3 right-3"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
