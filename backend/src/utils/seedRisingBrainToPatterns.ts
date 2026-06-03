import fs from 'fs';
import path from 'path';
import { PatternCategory } from '../models/PatternCategory';
import { Pattern } from '../models/Pattern';
import { PatternProblem } from '../models/PatternProblem';
import { MasterProblem } from '../models/MasterProblem';

const difficultyMap: Record<string, string> = {
  Easy: 'Easy', Medium: 'Medium', Hard: 'Hard',
  Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard',
};

const patternMapping: Record<string, string> = {
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

async function getNextProblemId(): Promise<number> {
  const latest = await MasterProblem.findOne().sort({ problemId: -1 }).select('problemId').lean();
  return latest ? latest.problemId + 1 : 10001;
}

async function findOrCreateMasterProblem(title: string, difficulty: string, platform?: string, link?: string) {
  const titleKey = title.toLowerCase().trim().replace(/\s+/g, ' ');
  let mp = await MasterProblem.findOne({ titleKey });
  if (mp) {
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

  const links: Record<string, string> = {};
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
  console.log(`     [SEED-RISING] ➕ Created Master Problem: "${title}" (ID: ${nextId})`);
  return mp;
}

export async function runRisingBrainToPatternsSeeder() {
  console.log('[SEED-RISING] Starting RisingBrain to Patterns seeding...');
  
  // Resolve data path: backend/seed/data/risingBrain.json
  const filePath = path.join(__dirname, '..', '..', 'seed', 'data', 'risingBrain.json');
  if (!fs.existsSync(filePath)) {
    console.error(`[SEED-RISING] ❌ data file not found at: ${filePath}`);
    return;
  }

  const sheetData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`[SEED-RISING] Importing ${sheetData.steps.length} categories from "${sheetData.title}"...`);

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
      console.log(`[SEED-RISING] ✨ Created "Cyclic Sort" pattern under "Arrays" Category.`);
    }
  }

  let totalMappingsCreated = 0;
  let totalMappingsSkipped = 0;

  for (const step of sheetData.steps) {
    const stepTitle = step.title;
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
        console.warn(`[SEED-RISING] ⚠️ Pattern "${finalPatternTitle}" not found in DB! Skipping problem "${prob.title}"`);
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

  console.log(`[SEED-RISING] Complete! Created: ${totalMappingsCreated}, Skipped/Existing: ${totalMappingsSkipped}`);
}
