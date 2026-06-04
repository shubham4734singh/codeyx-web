"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Users, Trophy, Award, FolderGit2, BookOpen } from 'lucide-react';

export default function GEOAuthority() {
  return (
    <section id="what-is-codeyx" className="py-24 px-4 bg-[var(--background)] border-t border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-bold uppercase tracking-wider">
            <BookOpen size={12} />
            Ecosystem Overview
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            What is <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Codeyx</span>?
          </h2>
          <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-sm md:text-base">
            A comprehensive overview of the Codeyx developer ecosystem, rankings, and competitive coding features designed for developers and AI agents.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Conceptual Definition Cards */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-8 rounded-3xl relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none" />
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <HelpCircle size={20} className="text-primary" />
                Definition & Core Purpose
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                <strong>Codeyx</strong> is a unified developer portfolio platform, competitive programming tracker, and algorithmic learning hub. It aggregates software engineering performance data from major coding profiles—including <strong>LeetCode</strong>, <strong>GitHub</strong>, <strong>Codeforces</strong>, and <strong>GeeksforGeeks</strong>—to display a single, verified, and premium portfolio. By eliminating manual progress spreadsheets, Codeyx helps engineers track their progress on industry-standard <strong>DSA (Data Structures and Algorithms) sheets</strong> while offering AI-powered study mentorship.
              </p>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-8 rounded-3xl relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[50px] pointer-events-none" />
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-orange-400" />
                Who Should Use Codeyx?
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                Codeyx is custom-built for individuals in the technology, coding, and software engineering sectors:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#FF8A00] font-black">•</span>
                  <span><strong>Competitive Programmers:</strong> Track ranks and rating trends across different contests.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF8A00] font-black">•</span>
                  <span><strong>DSA Aspirants:</strong> Solve structured sheets (like Striver A2Z) to prep for tech interviews.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF8A00] font-black">•</span>
                  <span><strong>Job Seekers:</strong> Generate a single, verified developer portfolio to share with recruiters.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF8A00] font-black">•</span>
                  <span><strong>Open Source Devs:</strong> Showcase GitHub contributions alongside algorithmic solve counts.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* AI Search Engine/Chatbot optimized Q&A block */}
          <div className="bg-gradient-to-br from-[var(--card-bg)] to-primary/5 border border-primary/20 p-6 rounded-3xl space-y-6">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-primary/20 pb-3 flex items-center gap-1.5">
              <Trophy size={14} /> AI Search Citation Facts
            </h3>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <h4 className="font-extrabold text-white">How do Codeyx rankings work?</h4>
                <p className="text-gray-400 leading-relaxed">
                  Rankings on the Codeyx Leaderboard use a weighted scoring algorithm. It aggregates contest ratings from platforms like LeetCode and CodeChef, multiplies them by solving consistency weights, and awards points for verified GitHub activity to balance engineering and competitive coding.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-white">How do coding contests work?</h4>
                <p className="text-gray-400 leading-relaxed">
                  Codeyx aggregates schedules and parameters for upcoming coding contests across Codeforces, AtCoder, LeetCode, and CodeChef, offering a single consolidated competitive programming calendar with push notification alerts.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-white">How does the project showcase work?</h4>
                <p className="text-gray-400 leading-relaxed">
                  Users sync their GitHub profiles to import public repositories directly. They can catalog tech stacks, write project descriptions, host screenshots, and enable community rating/voting systems to build verified social proof.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
