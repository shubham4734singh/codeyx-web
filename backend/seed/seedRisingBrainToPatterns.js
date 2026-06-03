#!/usr/bin/env node
'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const URI = process.env.MONGODB_URI || 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx';

// ============================================================
// Inline schema definitions (to avoid TS compilation issues)
// ============================================================

const PatternCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'Folder' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PatternSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatternCategory', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PatternProblemSchema = new mongoose.Schema(
  {
    patternId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pattern', required: true },
    masterProblemId: { type: Number, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
PatternProblemSchema.index({ patternId: 1, masterProblemId: 1 }, { unique: true });
PatternProblemSchema.index({ masterProblemId: 1 });

const MasterProblemSchema = new mongoose.Schema(
  {
    problemId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    titleKey: { type: String, required: true, unique: true, index: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    platform: { type: String, default: '' },
    link: { type: String, default: '' },
    youtubeUrl: { type: String, default: '' },
    articleUrl: { type: String, default: '' },
    links: {
      leetcode: { type: String, default: '' },
      geeksforgeeks: { type: String, default: '' },
      codeforces: { type: String, default: '' },
      codechef: { type: String, default: '' },
      spoj: { type: String, default: '' },
      interviewbit: { type: String, default: '' },
    },
    tags: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PatternCategory = mongoose.models.PatternCategory || mongoose.model('PatternCategory', PatternCategorySchema);
const Pattern = mongoose.models.Pattern || mongoose.model('Pattern', PatternSchema);
const PatternProblem = mongoose.models.PatternProblem || mongoose.model('PatternProblem', PatternProblemSchema);
const MasterProblem = mongoose.models.MasterProblem || mongoose.model('MasterProblem', MasterProblemSchema);

const difficultyMap = {
  Easy: 'Easy', Medium: 'Medium', Hard: 'Hard',
  Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard',
};

const patternMapping = {
  "Two Pointers": "Two Pointer",
  "Sliding Window": "Sliding Window",
  "Prefix Sum": "Prefix Sum",
  "Monotonic Stack": "Monotonic Stack",
  "Binary Search": "Classic Binary Search",
  "Fast & Slow Pointers": "Fast & Slow Pointer",
  "Merge Intervals": "Intervals & Reach",
  "Cyclic Sort": "Cyclic Sort",
  "In-place Reversal of Linked List": "Reverse Pattern",
  "Tree BFS": "BFS / Level Order",
  "Tree DFS": "DFS Traversal",
  "Subsets (Backtracking)": "Choice-Based Backtracking",
  "Top K Elements (Heap)": "Top K Elements",
  "K-way Merge": "Merge K Sorted",
  "0/1 Knapsack (Dynamic Programming)": "Knapsack / Subset Sum",
  "Topological Sort (Graph)": "Topological Sort",
  "Graph Traversal (BFS/DFS)": "BFS", // default, dynamically refined below
  "Bitwise XOR": "XOR Tricks",
  "Greedy Algorithms": "Sorting + Local Choice"
};

// BFS specific problems in Graph Traversal
const bfsGraphProblems = [
  "number of islands",
  "rotting oranges",
  "word ladder",
  "01 matrix",
  "shortest path in binary matrix",
  "walls and gates",
  "snakes and ladders",
  "clone graph"
];

async function getNextProblemId() {
  const latest = await MasterProblem.findOne().sort({ problemId: -1 }).select('problemId').lean();
  return latest ? latest.problemId + 1 : 10001;
}

async function findOrCreateMasterProblem(title, difficulty, platform, link) {
  const titleKey = title.toLowerCase().trim().replace(/\s+/g, ' ');
  let mp = await MasterProblem.findOne({ titleKey });
  if (mp) {
    // If link is present but not in the nested links object, populate it
    let updated = false;
    const platKey = (platform || 'LeetCode').toLowerCase();
    if (link && mp.links && !mp.links[platKey]) {
      mp.links[platKey] = link;
      updated = true;
    }
    if (!mp.link && link) {
      mp.link = link;
      updated = true;
    }
    if (updated) {
      await mp.save();
    }
    return mp;
  }

  const nextId = await getNextProblemId();
  const mappedDifficulty = difficultyMap[difficulty] || 'Medium';

  const links = {};
  const platKey = (platform || 'LeetCode').toLowerCase();
  if (link) {
    links[platKey] = link;
  }

  mp = await MasterProblem.create({
    problemId: nextId,
    title,
    titleKey,
    difficulty: mappedDifficulty,
    platform: platform || 'LeetCode',
    link: link || '',
    links,
    active: true,
  });
  console.log(`     ➕ Created Master Problem: "${title}" (ID: ${nextId})`);
  return mp;
}

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected.');

  const filePath = path.join(__dirname, 'data', 'risingBrain.json');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ RisingBrain data file not found at: ${filePath}`);
    process.exit(1);
  }

  const sheetData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`\nImporting ${sheetData.steps.length} categories from "${sheetData.title}"...`);

  // Ensure "Cyclic Sort" pattern exists under "Arrays" Category
  const arraysCategory = await PatternCategory.findOne({ title: 'Arrays' });
  if (arraysCategory) {
    let cyclicSortPattern = await Pattern.findOne({ title: 'Cyclic Sort' });
    if (!cyclicSortPattern) {
      cyclicSortPattern = await Pattern.create({
        categoryId: arraysCategory._id,
        title: 'Cyclic Sort',
        description: 'Sort arrays containing numbers in a given range in O(n) time.',
        difficulty: 'Intermediate',
        order: 6,
        active: true
      });
      console.log(`✨ Created "Cyclic Sort" pattern under "Arrays" Category.`);
    }
  }

  let totalMappingsCreated = 0;
  let totalMappingsSkipped = 0;

  for (const step of sheetData.steps) {
    const stepTitle = step.title;
    console.log(`\nProcessing step: "${stepTitle}"`);

    // Determine target Pattern Title
    let targetPatternTitle = patternMapping[stepTitle] || stepTitle;

    for (const prob of step.problems) {
      const isBfs = bfsGraphProblems.includes(prob.title.toLowerCase().trim());
      
      let finalPatternTitle = targetPatternTitle;
      if (stepTitle === "Graph Traversal (BFS/DFS)") {
        finalPatternTitle = isBfs ? "BFS" : "DFS";
      }

      // Find the Pattern in the database
      const pattern = await Pattern.findOne({ title: finalPatternTitle });
      if (!pattern) {
        console.warn(`⚠️ Pattern "${finalPatternTitle}" not found in DB! Skipping problem "${prob.title}"`);
        continue;
      }

      // Find or create the Master Problem
      const mp = await findOrCreateMasterProblem(prob.title, prob.difficulty, prob.platform, prob.problemUrl);
      
      // Check if mapping already exists
      const existingMapping = await PatternProblem.findOne({
        patternId: pattern._id,
        masterProblemId: mp.problemId
      });

      if (!existingMapping) {
        const maxOrder = await PatternProblem.findOne({ patternId: pattern._id }).sort({ order: -1 }).select('order').lean();
        const nextOrder = (maxOrder?.order || 0) + 1;

        await PatternProblem.create({
          patternId: pattern._id,
          masterProblemId: mp.problemId,
          order: nextOrder
        });
        totalMappingsCreated++;
      } else {
        totalMappingsSkipped++;
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  📊 Import Summary`);
  console.log(`═══════════════════════════════════════`);
  console.log(`  New Mappings Created : ${totalMappingsCreated}`);
  console.log(`  Existing (Skipped)   : ${totalMappingsSkipped}`);
  console.log(`═══════════════════════════════════════\n`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
