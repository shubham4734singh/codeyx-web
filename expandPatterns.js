#!/usr/bin/env node
'use strict';
/**
 * expandPatterns.js
 * Auto-assigns MasterProblems to existing Patterns using tag/title matching.
 * NON-DESTRUCTIVE — does NOT delete existing pattern data.
 * Run: node expandPatterns.js
 */
const mongoose = require('./backend/node_modules/mongoose');
const dotenv = require('./backend/node_modules/dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const URI = process.env.MONGODB_URI || 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

// ─── Schema definitions ──────────────────────────────────────────────────────

const PatternSchema = new mongoose.Schema({ title: String, categoryId: mongoose.Schema.Types.ObjectId, difficulty: String, order: Number, active: Boolean }, { timestamps: true });
const PatternProblemSchema = new mongoose.Schema({ patternId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pattern' }, masterProblemId: Number, order: Number }, { timestamps: true });
PatternProblemSchema.index({ patternId: 1, masterProblemId: 1 }, { unique: true });
const MasterProblemSchema = new mongoose.Schema({ problemId: Number, title: String, titleKey: String, difficulty: String, platform: String, link: String, links: mongoose.Schema.Types.Mixed, tags: [String], active: Boolean }, { timestamps: true });

const Pattern = mongoose.models.Pattern || mongoose.model('Pattern', PatternSchema);
const PatternProblem = mongoose.models.PatternProblem || mongoose.model('PatternProblem', PatternProblemSchema);
const MasterProblem = mongoose.models.MasterProblem || mongoose.model('MasterProblem', MasterProblemSchema);

// ─── Tag → Pattern title mapping ─────────────────────────────────────────────
// Each entry: { tags: [...], pattern: 'Pattern Title in DB', category: hint }
// A problem matching ANY of the listed tags will be added to that pattern.
const TAG_TO_PATTERN = [
  // Arrays
  { tags: ['two pointers', 'two pointer'],           pattern: 'Two Pointer' },
  { tags: ['sliding window'],                         pattern: 'Sliding Window' },
  { tags: ['prefix sum'],                             pattern: 'Prefix Sum' },
  { tags: ["kadane's algorithm", 'kadane'],           pattern: "Kadane's Algorithm" },

  // Strings
  { tags: ['palindrome'],                             pattern: 'Two Pointer (Palindrome)' },
  { tags: ['string', 'string matching'],              pattern: 'Pattern Matching' },
  { tags: ['anagram', 'hash table', 'hashing'],       pattern: 'String Hashing' },

  // Binary Search
  { tags: ['binary search'],                          pattern: 'Classic Binary Search' },

  // Stack
  { tags: ['monotonic stack'],                        pattern: 'Monotonic Stack' },
  { tags: ['stack'],                                  pattern: 'Stack Simulation' },

  // Queue
  { tags: ['bfs', 'breadth-first search'],            pattern: 'BFS Queue' },
  { tags: ['monotonic queue'],                        pattern: 'Monotonic Queue' },

  // Linked List
  { tags: ['fast pointer', 'slow pointer', 'linked list cycle'], pattern: 'Fast & Slow Pointer' },
  { tags: ['linked list'],                            pattern: 'Reverse Pattern' },

  // Heap
  { tags: ['heap', 'priority queue'],                 pattern: 'Top K Elements' },

  // Tree
  { tags: ['dfs', 'depth-first search', 'tree'],      pattern: 'DFS Traversal' },
  { tags: ['level order', 'bfs tree'],                pattern: 'BFS / Level Order' },
  { tags: ['lowest common ancestor'],                 pattern: 'Lowest Common Ancestor' },

  // BST
  { tags: ['binary search tree', 'bst'],              pattern: 'BST Operations' },

  // Graph
  { tags: ['graph', 'topological sort'],              pattern: 'Topological Sort' },
  { tags: ['union find', 'disjoint set'],             pattern: 'Union Find' },
  { tags: ["dijkstra's algorithm", 'shortest path', 'dijkstra'], pattern: "Dijkstra's Algorithm" },

  // Backtracking
  { tags: ['backtracking'],                           pattern: 'Choice-Based Backtracking' },

  // Greedy
  { tags: ['greedy', 'intervals'],                    pattern: 'Intervals & Reach' },

  // DP
  { tags: ['dynamic programming', 'dp'],              pattern: '1D DP' },
  { tags: ['knapsack'],                               pattern: 'Knapsack / Subset Sum' },
  { tags: ['stock', 'stocks'],                        pattern: 'DP on Stocks' },
  { tags: ['dp string', 'edit distance', 'lcs'],      pattern: 'DP on Strings' },

  // Trie
  { tags: ['trie'],                                   pattern: 'Basic Trie' },

  // Bit Manipulation
  { tags: ['bit manipulation', 'xor', 'bitmask'],     pattern: 'XOR Tricks' },
  { tags: ['bitmask', 'bit masking'],                 pattern: 'Bitmasking' },
];

// ─── Title keyword matching (fallback when tags don't match) ─────────────────
const TITLE_KEYWORD_MAP = [
  { keywords: ['two sum', 'three sum', 'container with most water', 'trapping rain', 'valid palindrome', 'reverse string'], pattern: 'Two Pointer' },
  { keywords: ['longest substring', 'minimum window', 'permutation in string', 'anagram', 'sliding window', 'max consecutive'], pattern: 'Sliding Window' },
  { keywords: ['product of array', 'subarray sum', 'range sum', 'prefix'], pattern: 'Prefix Sum' },
  { keywords: ['maximum subarray', 'maximum product subarray', 'maximum sum circular'], pattern: "Kadane's Algorithm" },
  { keywords: ['merge intervals', 'non-overlapping', 'meeting rooms', 'arrows', 'insert interval'], pattern: 'Intervals & Reach' },
  { keywords: ['binary search', 'search insert', 'first bad', 'koko', 'capacity to ship', 'search in rotated', 'peak element'], pattern: 'Classic Binary Search' },
  { keywords: ['daily temperatures', 'next greater', 'largest rectangle', 'histogram', 'sum of subarray'], pattern: 'Monotonic Stack' },
  { keywords: ['evaluate reverse polish', 'basic calculator', 'valid parenthes', 'generate parenthes', 'min stack', 'decode string', 'asteroid'], pattern: 'Stack Simulation' },
  { keywords: ['number of islands', 'rotting oranges', '01 matrix', 'shortest path in binary', 'walls and gates'], pattern: 'BFS Queue' },
  { keywords: ['linked list cycle', 'middle of the linked list', 'palindrome linked list', 'happy number'], pattern: 'Fast & Slow Pointer' },
  { keywords: ['reverse linked list', 'reverse nodes', 'reorder list', 'swapping nodes'], pattern: 'Reverse Pattern' },
  { keywords: ['merge two sorted', 'merge k sorted', 'sort list', 'remove nth node'], pattern: 'Merge / Reorder' },
  { keywords: ['kth largest', 'top k frequent', 'k closest', 'task scheduler', 'kth smallest'], pattern: 'Top K Elements' },
  { keywords: ['inorder', 'preorder', 'postorder', 'maximum depth', 'same tree', 'invert binary', 'symmetric', 'diameter', 'balanced', 'path sum', 'flatten'], pattern: 'DFS Traversal' },
  { keywords: ['level order', 'right side view', 'zigzag', 'average of levels', 'minimum depth', 'maximum width'], pattern: 'BFS / Level Order' },
  { keywords: ['validate binary search tree', 'kth smallest in bst', 'convert sorted array to bst', 'search in a bst', 'insert into a bst', 'delete node in bst', 'range sum of bst'], pattern: 'BST Operations' },
  { keywords: ['course schedule', 'alien dictionary', 'topological'], pattern: 'Topological Sort' },
  { keywords: ['number of connected components', 'graph valid tree', 'redundant connection', 'accounts merge'], pattern: 'Union Find' },
  { keywords: ['network delay', 'cheapest flights', 'path with minimum effort', 'swim in rising'], pattern: "Dijkstra's Algorithm" },
  { keywords: ['subsets', 'permutations', 'combinations', 'combination sum', 'letter combinations', 'n-queens', 'sudoku', 'word search', 'palindrome partitioning', 'restore ip'], pattern: 'Choice-Based Backtracking' },
  { keywords: ['gas station', 'partition labels', 'jump game', 'assign cookies', 'queue reconstruction', 'hand of straights'], pattern: 'Sorting + Local Choice' },
  { keywords: ['climbing stairs', 'house robber', 'coin change', 'word break', 'longest increasing subsequence', 'decode ways', 'delete and earn'], pattern: '1D DP' },
  { keywords: ['unique paths', 'minimum path sum', 'maximal square', 'triangle', 'dungeon game'], pattern: 'Grid DP' },
  { keywords: ['longest common subsequence', 'edit distance', 'longest palindromic subsequence', 'palindromic substrings', 'shortest common supersequence'], pattern: 'DP on Strings' },
  { keywords: ['partition equal subset', 'coin change ii', 'target sum', 'ones and zeroes', 'combination sum iv'], pattern: 'Knapsack / Subset Sum' },
  { keywords: ['best time to buy', 'stock'], pattern: 'DP on Stocks' },
  { keywords: ['implement trie', 'replace words', 'design add and search words'], pattern: 'Basic Trie' },
  { keywords: ['word search ii', 'palindrome pairs', 'word break ii'], pattern: 'Word Break / Search' },
  { keywords: ['maximum xor', 'bitwise trie'], pattern: 'Bitwise Trie / XOR' },
  { keywords: ['single number', 'missing number', 'xor'], pattern: 'XOR Tricks' },
  { keywords: ['number of 1 bits', 'counting bits', 'reverse bits', 'power of two', 'power of four', 'sum of two integers', 'subsets'], pattern: 'Bitmasking' },
];

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected\n');

  // Load all patterns from DB
  const allPatterns = await Pattern.find({ active: true }).lean();
  const patternMap = new Map(); // title → _id
  allPatterns.forEach(p => patternMap.set(p.title.toLowerCase().trim(), p._id));
  console.log(`📋 Found ${allPatterns.length} existing patterns in DB`);

  // Get all already-linked masterProblemIds
  const alreadyLinked = new Set(
    (await PatternProblem.find({}, { masterProblemId: 1 }).lean()).map(pp => pp.masterProblemId)
  );
  console.log(`🔗 Already linked to patterns: ${alreadyLinked.size} problems`);

  // Load ALL active master problems not already linked, and ONLY those on LeetCode or GFG
  const unlinked = await MasterProblem.find({
    active: true,
    problemId: { $nin: [...alreadyLinked] },
    $or: [
      { 'links.leetcode': { $exists: true, $ne: '' } },
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg': { $exists: true, $ne: '' } }
    ]
  }).lean();
  console.log(`🆕 Unlinked problems available: ${unlinked.length}\n`);

  // Helper: find pattern _id by title (case-insensitive)
  function findPattern(title) {
    const key = title.toLowerCase().trim();
    if (patternMap.has(key)) return patternMap.get(key);
    // Fuzzy: check if any pattern title contains the search key
    for (const [k, v] of patternMap) {
      if (k.includes(key) || key.includes(k)) return v;
    }
    return null;
  }

  const toInsert = []; // { patternId, masterProblemId, order }
  const alreadyQueued = new Set([...alreadyLinked]);
  const assignedCount = new Map(); // patternId.toString() → count

  for (const mp of unlinked) {
    const tags = (mp.tags || []).map(t => t.toLowerCase().trim());
    const titleLower = (mp.title || '').toLowerCase();
    const matchedPatternIds = new Set();

    // 1. Tag-based matching
    for (const rule of TAG_TO_PATTERN) {
      if (rule.tags.some(t => tags.includes(t))) {
        const pid = findPattern(rule.pattern);
        if (pid) matchedPatternIds.add(pid.toString());
      }
    }

    // 2. Title keyword matching (if no tag match yet, or to add to additional patterns)
    for (const rule of TITLE_KEYWORD_MAP) {
      if (rule.keywords.some(kw => titleLower.includes(kw))) {
        const pid = findPattern(rule.pattern);
        if (pid) matchedPatternIds.add(pid.toString());
      }
    }

    // Only add to patterns (max 2 patterns per problem to avoid over-seeding)
    let addedForThisProb = 0;
    for (const pidStr of matchedPatternIds) {
      if (addedForThisProb >= 2) break;
      const pid = allPatterns.find(p => p._id.toString() === pidStr)?._id;
      if (!pid) continue;

      const currentCount = assignedCount.get(pidStr) || 0;
      // Cap per pattern at 60 new additions to spread coverage evenly
      if (currentCount >= 60) continue;

      const queueKey = `${pidStr}__${mp.problemId}`;
      if (alreadyQueued.has(queueKey)) continue;
      alreadyQueued.add(queueKey);

      toInsert.push({ patternId: pid, masterProblemId: mp.problemId, order: 100 + (currentCount + 1) });
      assignedCount.set(pidStr, currentCount + 1);
      addedForThisProb++;
    }
  }

  console.log(`\n🎯 Will insert ${toInsert.length} new pattern-problem mappings...`);

  // Batch insert in chunks of 100
  let inserted = 0;
  let skipped = 0;
  const chunkSize = 100;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    try {
      const result = await PatternProblem.insertMany(chunk, { ordered: false });
      inserted += result.length;
    } catch (err) {
      // ordered: false means it inserts what it can and skips duplicates
      const written = err.insertedDocs?.length || 0;
      inserted += written;
      skipped += chunk.length - written;
    }
    process.stdout.write(`\r   Inserted: ${inserted} / ${toInsert.length}  `);
  }
  console.log('\n');

  // Final count
  const totalNow = await PatternProblem.countDocuments({});
  const uniqueNow = (await PatternProblem.distinct('masterProblemId')).length;

  // Per-pattern breakdown
  const perPattern = await PatternProblem.aggregate([
    { $group: { _id: '$patternId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const patternById = new Map(allPatterns.map(p => [p._id.toString(), p.title]));

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           EXPAND PATTERNS — FINAL RESULTS           ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n  New mappings inserted : ${inserted}`);
  console.log(`  Duplicates skipped    : ${skipped}`);
  console.log(`\n  Total mappings in DB  : ${totalNow}`);
  console.log(`  Unique problems       : ${uniqueNow}`);
  console.log(`\n📊 Top patterns by problem count:`);
  perPattern.slice(0, 15).forEach(p => {
    const name = patternById.get(p._id?.toString()) || p._id;
    const bar = '█'.repeat(Math.min(Math.round(p.count / 5), 20));
    console.log(`   ${String(p.count).padStart(4)}  ${name.substring(0, 35).padEnd(35)}  ${bar}`);
  });
  console.log('\n══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Done.');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
