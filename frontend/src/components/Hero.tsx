"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Code2, Trophy } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Content */}
        <motion.div 
          className="flex-1 text-center lg:text-left z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-semibold">
            🚀 The #1 Portfolio Tracker
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Unified <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Developer Portfolio</span> & Coding Tracker
          </h1>
          <p className="text-lg lg:text-xl text-[var(--text-muted)] mb-8 max-w-2xl mx-auto lg:mx-0">
            Codeyx is the ultimate developer analytics dashboard and portfolio tracker. Sync your competitive programming profiles from LeetCode, GitHub, Codeforces, and GeeksforGeeks into a single verified page with AI-powered DSA sheet insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-semibold text-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all hover:-translate-y-1">
              Start Tracking Free
            </button>
            <button className="px-8 py-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] font-semibold text-lg hover:border-primary/50 transition-all hover:-translate-y-1">
              Explore Demo
            </button>
          </div>
        </motion.div>

        {/* Right Visuals */}
        <motion.div 
          className="flex-1 relative w-full max-w-lg lg:max-w-none"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Main Dashboard Preview */}
          <div className="relative z-10 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 overflow-hidden card-hover">
            <div className="flex items-center gap-2 mb-6 border-b border-[var(--border-color)] pb-4">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="ml-2 text-xs text-[var(--text-muted)] font-mono">coderyx-analytics</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--background)]">
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2"><Code2 size={16}/> Total Solved</div>
                <div className="text-3xl font-bold">1,284</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--background)]">
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2"><Trophy size={16}/> Global Rank</div>
                <div className="text-3xl font-bold text-primary">#42</div>
              </div>
            </div>

            {/* Heatmap Mockup */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--background)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3"><Activity size={16}/> Activity Heatmap</div>
              <div className="grid grid-cols-12 gap-1.5 opacity-80">
                {[...Array(60)].map((_, i) => (
                  <div key={i} className={`h-3 rounded-sm ${Math.random() > 0.6 ? 'bg-primary' : Math.random() > 0.3 ? 'bg-primary/40' : 'bg-[var(--border-color)]'}`}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <motion.div 
            animate={{ y: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 z-20 bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-xl shadow-xl flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">New Achievement</p>
              <p className="font-semibold text-sm">Knight Status</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
