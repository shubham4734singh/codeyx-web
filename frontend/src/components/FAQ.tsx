"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  { q: "What is Codeyx?", a: "Codeyx is an all-in-one developer analytics and portfolio platform. It synchronizes coding profiles across LeetCode, GitHub, Codeforces, and GeeksforGeeks into a single verified portfolio for developers, software engineers, and competitive programmers." },
  { q: "Is Codeyx free to use?", a: "Yes, core profile tracking, progress sheet visualizations, global leaderboard rankings, and coding pattern trackers on Codeyx are 100% free." },
  { q: "How does the Codeyx leaderboard ranking work?", a: "Codeyx ranks developers using a weighted algorithm combining their public contest ratings (LeetCode, CodeChef), total problem-solving consistency, and verified open-source GitHub contributions." },
  { q: "Can I sync my LeetCode and GitHub profiles?", a: "Yes! You can connect your profiles by entering your public usernames. Codeyx automatically indexes solved problems, contest stats, and public repositories without requiring credentials." },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 px-4 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-[var(--text-muted)]">Got questions? We've got answers.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border border-[var(--border-color)] bg-[var(--card-bg)] rounded-2xl overflow-hidden">
            <button 
              className="w-full px-6 py-5 flex justify-between items-center text-left font-semibold focus:outline-none"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              {faq.q}
              <motion.div animate={{ rotate: openIndex === idx ? 180 : 0 }}>
                <ChevronDown className="text-[var(--text-muted)]" />
              </motion.div>
            </button>
            <AnimatePresence>
              {openIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 text-[var(--text-muted)] border-t border-[var(--border-color)] pt-4">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
