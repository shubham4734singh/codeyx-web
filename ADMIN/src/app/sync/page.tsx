"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock, Zap, Users, ChevronRight, Play, Pause } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const getApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5005/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";
};
const API_URL = getApiUrl();
const DELAY_BETWEEN_SYNCS_MS = 3000; // 3s delay between each user to avoid rate limits

type SyncStatus = "idle" | "pending" | "syncing" | "done" | "error";

interface PlatformEntry {
  userId: string;
  platform: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: SyncStatus;
  message?: string;
}

export default function SyncPage() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<PlatformEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [totalDone, setTotalDone] = useState(0);
  const pauseRef = useRef(false);

  // Group flat entries by userId for display
  const groupedUsers = React.useMemo(() => {
    const groups: Record<string, {
      userId: string;
      displayName: string;
      avatarUrl?: string;
      platforms: {
        platform: string;
        username: string;
        status: SyncStatus;
        message?: string;
        originalIndex: number;
      }[];
    }> = {};

    entries.forEach((entry, originalIndex) => {
      if (!groups[entry.userId]) {
        groups[entry.userId] = {
          userId: entry.userId,
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
          platforms: [],
        };
      }
      groups[entry.userId].platforms.push({
        platform: entry.platform,
        username: entry.username,
        status: entry.status,
        message: entry.message,
        originalIndex,
      });
    });

    return Object.values(groups);
  }, [entries]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch all connected platform stats
  const fetchEntries = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/admin/sync-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Server responded with HTTP ${res.status}: ${res.statusText}`);
      }
      if (data.success) {
        setEntries(
          data.data.map((e: any) => ({
            ...e,
            status: "idle" as SyncStatus,
          }))
        );
      } else {
        throw new Error(data.message || "Failed to load sync list");
      }
    } catch (err: any) {
      console.error("Failed to load sync list:", err);
      setFetchError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Sync a single platform entry
  const syncOne = async (idx: number, token: string): Promise<boolean> => {
    const entry = entries[idx];
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, status: "syncing" } : e))
    );
    try {
      const res = await fetch(`${API_URL}/admin/sync-one`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: entry.userId,
          platform: entry.platform,
          username: entry.username,
        }),
      });
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e, i) =>
          i === idx
            ? { ...e, status: data.success ? "done" : "error", message: data.message }
            : e
        )
      );
      return data.success;
    } catch (err: any) {
      setEntries((prev) =>
        prev.map((e, i) =>
          i === idx ? { ...e, status: "error", message: err.message } : e
        )
      );
      return false;
    }
  };

  // Run bulk sync one-by-one with delay
  const runBulkSync = async () => {
    setIsBulkRunning(true);
    setIsPaused(false);
    pauseRef.current = false;
    setTotalDone(0);

    // Reset all to pending
    setEntries((prev) => prev.map((e) => ({ ...e, status: "pending", message: undefined })));

    const token = await getToken() || "";
    let done = 0;

    for (let i = 0; i < entries.length; i++) {
      // Check pause
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }

      setCurrentIdx(i);
      await syncOne(i, token);
      done++;
      setTotalDone(done);

      // Delay between syncs to avoid API rate limits
      if (i < entries.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SYNCS_MS));
      }
    }

    setCurrentIdx(-1);
    setIsBulkRunning(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(pauseRef.current);
  };

  const getStatusIcon = (status: SyncStatus, isCurrentIdx: boolean) => {
    if (isCurrentIdx && status === "syncing")
      return <RefreshCw size={14} className="text-blue-400 animate-spin" />;
    switch (status) {
      case "done":    return <CheckCircle size={14} className="text-emerald-500" />;
      case "error":   return <XCircle size={14} className="text-red-500" />;
      case "syncing": return <RefreshCw size={14} className="text-blue-400 animate-spin" />;
      case "pending": return <Clock size={14} className="text-yellow-500 animate-pulse" />;
      default:        return <ChevronRight size={14} className="text-gray-600" />;
    }
  };

  const getStatusBg = (status: SyncStatus) => {
    switch (status) {
      case "done":    return "border-emerald-500/20 bg-emerald-500/5";
      case "error":   return "border-red-500/20 bg-red-500/5";
      case "syncing": return "border-blue-500/30 bg-blue-500/10";
      case "pending": return "border-yellow-500/20 bg-yellow-500/5";
      default:        return "border-white/5 bg-transparent";
    }
  };

  const doneCount  = entries.filter((e) => e.status === "done").length;
  const errorCount = entries.filter((e) => e.status === "error").length;
  const progress   = entries.length > 0 ? Math.round((totalDone / entries.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap size={22} className="text-yellow-400" /> Platform Sync Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sync all connected users one-by-one with {DELAY_BETWEEN_SYNCS_MS / 1000}s delay to respect API rate limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isBulkRunning && (
            <button
              onClick={togglePause}
              className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors ${
                isPaused
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-yellow-600 hover:bg-yellow-500 text-black"
              }`}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}
          <button
            onClick={runBulkSync}
            disabled={isBulkRunning || isLoading || entries.length === 0}
            className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} className={isBulkRunning ? "animate-spin" : ""} />
            {isBulkRunning ? `Syncing ${totalDone}/${entries.length}...` : "Start Sync All"}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isBulkRunning && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-foreground">
              {isPaused ? "⏸ Paused" : `Syncing... ${totalDone} of ${entries.length}`}
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="text-emerald-500 font-bold">✅ {doneCount} done</span>
            <span className="text-red-500 font-bold">❌ {errorCount} failed</span>
            <span className="text-yellow-500 font-bold">⏳ {entries.length - totalDone} remaining</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: entries.length, color: "text-blue-400" },
          { label: "Completed",     value: doneCount,       color: "text-emerald-400" },
          { label: "Failed",        value: errorCount,      color: "text-red-400" },
          { label: "Remaining",     value: entries.length - doneCount - errorCount, color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Entries List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-muted-foreground" />
          <h3 className="font-bold text-foreground text-sm">
            Connected Platform Entries ({entries.length})
          </h3>
        </div>
 
        {fetchError && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-red-500/5 border-b border-red-500/10">
            <XCircle size={32} className="text-red-500 mb-2" />
            <p className="text-red-400 text-sm font-bold">API Connection Error</p>
            <p className="text-muted-foreground text-xs mt-1 font-mono max-w-md">{fetchError}</p>
            {fetchError.toLowerCase().includes("failed to fetch") && (
              <p className="text-yellow-500/80 text-[10px] mt-2 font-semibold bg-yellow-500/5 border border-yellow-500/10 rounded-lg px-3 py-1.5 max-w-sm">
                💡 Tip: Please ensure your backend dev server is running! Run <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono text-[9px]">npm run dev</code> inside the <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono text-[9px]">backend</code> directory (Port 5005).
              </p>
            )}
            <button
              onClick={fetchEntries}
              className="mt-3 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <RefreshCw size={20} className="text-primary animate-spin" />
            <span className="text-muted-foreground text-sm">Loading connected users...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No connected platform entries found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {groupedUsers.map((user, i) => (
              <div
                key={user.userId}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.01] transition-all"
              >
                {/* User Info (Left) */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 uppercase">
                    {user.displayName ? user.displayName[0] : "?"}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-foreground block truncate">
                      {user.displayName || `User ${user.userId.slice(-6)}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate block">ID: {user.userId}</span>
                  </div>
                </div>

                {/* Platforms & Sync Buttons (Right) */}
                <div className="flex flex-wrap items-center gap-2">
                  {user.platforms.map((plat) => {
                    const colorMap: Record<string, string> = {
                      leetcode: "hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
                      codeforces: "hover:bg-blue-500/20 text-blue-400 border-blue-500/20 bg-blue-500/5",
                      codechef: "hover:bg-purple-500/20 text-purple-400 border-purple-500/20 bg-purple-500/5",
                      github: "hover:bg-gray-500/20 text-gray-400 border-gray-500/20 bg-gray-500/5",
                      geeksforgeeks: "hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
                    };
                    const badgeClass = colorMap[plat.platform] || "hover:bg-orange-500/20 text-orange-400 border-orange-500/20 bg-orange-500/5";

                    return (
                      <div key={plat.platform} className="flex flex-col gap-1 items-end">
                        <button
                          onClick={async () => {
                            const token = await getToken() || "";
                            await syncOne(plat.originalIndex, token);
                          }}
                          disabled={isBulkRunning || plat.status === "syncing"}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${badgeClass} ${
                            plat.status === "syncing" ? "ring-2 ring-primary animate-pulse" :
                            plat.status === "done" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" :
                            plat.status === "error" ? "border-red-500 bg-red-500/10 text-red-400" : ""
                          }`}
                        >
                          <RefreshCw size={11} className={plat.status === "syncing" ? "animate-spin" : ""} />
                          <span className="capitalize">{plat.platform}</span>
                          <span className="text-[10px] opacity-60 font-mono font-normal">(@{plat.username})</span>
                        </button>
                        {plat.message && (
                          <span className={`text-[9px] px-1 font-semibold block ${plat.status === "error" ? "text-red-400" : "text-emerald-400"}`}>
                            {plat.message}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
