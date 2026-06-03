import { Request, Response } from 'express';
import { PatternCategory } from '../models/PatternCategory';
import { Pattern } from '../models/Pattern';
import { PatternProblem } from '../models/PatternProblem';
import { MasterProblem } from '../models/MasterProblem';
import { UserProgress } from '../models/UserProgress';
import { ApiResponse } from '../utils/ApiResponse';

// --- In-Memory Cache for Static Pattern Data ---
let cachedCategories: any = null;
let cachedPatterns: any = null;
let cachedPatternProblems: any = null;
let lastCacheTime = 0;
const CACHE_TTL = 0; // Temporarily disabled for debugging

async function getCachedReferenceData() {
  const now = Date.now();
  if (cachedCategories && cachedPatterns && cachedPatternProblems && (now - lastCacheTime < CACHE_TTL)) {
    return [cachedCategories, cachedPatterns, cachedPatternProblems];
  }
  const [cats, pats, pProbs] = await Promise.all([
    PatternCategory.find({ active: true }).select('title description icon order').sort({ order: 1 }).lean(),
    Pattern.find({ active: true }).select('categoryId title description difficulty order').sort({ order: 1 }).lean(),
    PatternProblem.find({}).select('patternId masterProblemId').lean()
  ]);
  
  console.log(`[DEBUG] DB Query results -> Categories: ${cats.length}, Patterns: ${pats.length}, PatternProblems: ${pProbs.length}`);

  cachedCategories = cats;
  cachedPatterns = pats;
  cachedPatternProblems = pProbs;
  lastCacheTime = now;
  return [cats, pats, pProbs];
}

// Build difficulty breakdown map: patternId → { easy, medium, hard, easySolved, mediumSolved, hardSolved }
async function getDifficultyBreakdown(
  patternProblems: any[],
  solvedSet?: Set<number>
): Promise<Map<string, { easy: number; medium: number; hard: number; easySolved: number; mediumSolved: number; hardSolved: number }>> {
  const allMpIds = [...new Set(patternProblems.map(pp => pp.masterProblemId))];
  const masterProbs = await MasterProblem.find({ problemId: { $in: allMpIds }, active: true })
    .select('problemId difficulty').lean();
  const diffMap = new Map<number, string>(); // problemId → difficulty
  for (const mp of masterProbs) diffMap.set(mp.problemId, mp.difficulty);

  const result = new Map<string, { easy: number; medium: number; hard: number; easySolved: number; mediumSolved: number; hardSolved: number }>();
  for (const pp of patternProblems) {
    const pid = pp.patternId.toString();
    if (!result.has(pid)) result.set(pid, { easy: 0, medium: 0, hard: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 });
    const diff = (diffMap.get(pp.masterProblemId) || '').toLowerCase();
    const entry = result.get(pid)!;
    const isSolved = solvedSet ? solvedSet.has(pp.masterProblemId) : false;
    if (diff === 'easy')   { entry.easy++;   if (isSolved) entry.easySolved++; }
    else if (diff === 'medium') { entry.medium++; if (isSolved) entry.mediumSolved++; }
    else if (diff === 'hard')   { entry.hard++;   if (isSolved) entry.hardSolved++; }
  }
  return result;
}

// Platform link breakdown (LeetCode / GFG) per pattern
async function getPlatformLinkBreakdown(patternProblems: any[]): Promise<Map<string, { leetCount: number; gfgCount: number }>> {
  const allMpIds = [...new Set(patternProblems.map(pp => pp.masterProblemId))];
  const masterProbs = await MasterProblem.find({ problemId: { $in: allMpIds }, active: true })
    .select('problemId links').lean();
  const linkMap = new Map<number, { leet: boolean; gfg: boolean }>();
  for (const mp of masterProbs) {
    const hasLeet = !!(mp.links?.leetcode);
    const hasGfg = !!(mp.links?.geeksforgeeks || mp.links?.gfg);
    linkMap.set(mp.problemId, { leet: hasLeet, gfg: hasGfg });
  }
  const result = new Map<string, { leetCount: number; gfgCount: number }>();
  for (const pp of patternProblems) {
    const pid = pp.patternId.toString();
    if (!result.has(pid)) result.set(pid, { leetCount: 0, gfgCount: 0 });
    const linkInfo = linkMap.get(pp.masterProblemId) || { leet: false, gfg: false };
    const entry = result.get(pid)!;
    if (linkInfo.leet) entry.leetCount++;
    if (linkInfo.gfg) entry.gfgCount++;
  }
  return result;
}

// ---------------------------------------------------------------------------
// GET /api/patterns/categories
// Returns all categories with their patterns (no progress)
// ---------------------------------------------------------------------------
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const [categories, patterns, patternProblems] = await getCachedReferenceData();
    const diffBreakdown = await getDifficultyBreakdown(patternProblems);
    const platformBreakdown = await getPlatformLinkBreakdown(patternProblems);

    const problemsByPattern = new Map<string, number>();
    for (const pp of patternProblems) {
      const patIdStr = pp.patternId.toString();
      problemsByPattern.set(patIdStr, (problemsByPattern.get(patIdStr) || 0) + 1);
    }

    const patternsByCategory = new Map<string, any[]>();
    for (const pat of patterns) {
      const catIdStr = pat.categoryId.toString();
      if (!patternsByCategory.has(catIdStr)) {
        patternsByCategory.set(catIdStr, []);
      }
      patternsByCategory.get(catIdStr)!.push(pat);
    }

    const data = [];
    let globalTotal = 0;
    let globalEasy = 0, globalMedium = 0, globalHard = 0;
    let globalLeet = 0, globalGfg = 0;

    for (const cat of categories) {
      const catPatterns = patternsByCategory.get(cat._id.toString()) || [];

      const patternsWithCounts = [];
      let categoryTotal = 0;
      let catEasy = 0, catMedium = 0, catHard = 0;
      let catLeet = 0, catGfg = 0;

      for (const pat of catPatterns) {
        const count = problemsByPattern.get(pat._id.toString()) || 0;
        const db = diffBreakdown.get(pat._id.toString()) || { easy: 0, medium: 0, hard: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 };
        const plat = platformBreakdown.get(pat._id.toString()) || { leetCount: 0, gfgCount: 0 };
        categoryTotal += count;
        catEasy += db.easy; catMedium += db.medium; catHard += db.hard;
        catLeet += plat.leetCount; catGfg += plat.gfgCount;

        patternsWithCounts.push({
          _id: pat._id,
          title: pat.title,
          description: pat.description,
          difficulty: pat.difficulty,
          order: pat.order,
          totalProblems: count,
          easyCount: db.easy,
          mediumCount: db.medium,
          hardCount: db.hard,
          leetCount: plat.leetCount,
          gfgCount: plat.gfgCount,
        });
      }

      globalTotal += categoryTotal;
      globalEasy += catEasy; globalMedium += catMedium; globalHard += catHard;
      globalLeet += catLeet; globalGfg += catGfg;

      data.push({
        _id: cat._id,
        title: cat.title,
        description: cat.description,
        icon: cat.icon,
        order: cat.order,
        totalProblems: categoryTotal,
        easyCount: catEasy,
        mediumCount: catMedium,
        hardCount: catHard,
        leetCount: catLeet,
        gfgCount: catGfg,
        patterns: patternsWithCounts,
      });
    }

    const meta = {
      totalProblems: globalTotal,
      easyCount: globalEasy,
      mediumCount: globalMedium,
      hardCount: globalHard,
      leetCount: globalLeet,
      gfgCount: globalGfg,
    };

    return res.status(200).json(new ApiResponse(200, { categories: data, meta }));
  } catch (error: any) {
    console.error('[patterns:categories] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/patterns/categories/progress
// Returns categories with patterns + per-user solved/total counts
// ---------------------------------------------------------------------------
export const getCategoriesWithProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [categories, patterns, patternProblems] = await getCachedReferenceData();
    const diffBreakdown = await getDifficultyBreakdown(patternProblems);

    const problemsByPattern = new Map<string, number[]>();
    const allMpIds: number[] = [];
    for (const pp of patternProblems) {
      const patIdStr = pp.patternId.toString();
      if (!problemsByPattern.has(patIdStr)) {
        problemsByPattern.set(patIdStr, []);
      }
      problemsByPattern.get(patIdStr)!.push(pp.masterProblemId);
      allMpIds.push(pp.masterProblemId);
    }

    const patternsByCategory = new Map<string, any[]>();
    for (const pat of patterns) {
      const catIdStr = pat.categoryId.toString();
      if (!patternsByCategory.has(catIdStr)) {
        patternsByCategory.set(catIdStr, []);
      }
      patternsByCategory.get(catIdStr)!.push(pat);
    }

    const solvedProgress = await UserProgress.find({
      userId,
      solved: true,
    }).select('problemId').lean();

    const solvedSet = new Set(solvedProgress.map(up => up.problemId));
    const diffSolvedBreakdown = await getDifficultyBreakdown(patternProblems, solvedSet);
    // Also compute platform link counts (LeetCode & GFG) per pattern
    const platformBreakdown = await getPlatformLinkBreakdown(patternProblems);

    const data = [];
    let globalTotal = 0, globalSolved = 0;
    let globalEasy = 0, globalMedium = 0, globalHard = 0;
    let globalEasySolved = 0, globalMediumSolved = 0, globalHardSolved = 0;
    let globalLeet = 0, globalGfg = 0;

    for (const cat of categories) {
      const catPatterns = patternsByCategory.get(cat._id.toString()) || [];

      const patternsWithProgress = [];
      let categorySolved = 0;
      let categoryTotal = 0;
      let catEasy = 0, catMedium = 0, catHard = 0;
      let catEasySolved = 0, catMediumSolved = 0, catHardSolved = 0;
      let catLeet = 0, catGfg = 0;

      for (const pat of catPatterns) {
        const mpIds = problemsByPattern.get(pat._id.toString()) || [];
        const total = mpIds.length;
        const db = diffSolvedBreakdown.get(pat._id.toString()) || { easy: 0, medium: 0, hard: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 };

        let solved = 0;
        if (total > 0) {
          solved = mpIds.filter((id: number) => solvedSet.has(id)).length;
        }

        categorySolved += solved;
        categoryTotal += total;
        catEasy += db.easy; catMedium += db.medium; catHard += db.hard;
        catEasySolved += db.easySolved; catMediumSolved += db.mediumSolved; catHardSolved += db.hardSolved;

        const plat = platformBreakdown.get(pat._id.toString()) || { leetCount: 0, gfgCount: 0 };
        catLeet += plat.leetCount;
        catGfg += plat.gfgCount;

        patternsWithProgress.push({
          _id: pat._id,
          title: pat.title,
          description: pat.description,
          difficulty: pat.difficulty,
          order: pat.order,
          totalProblems: total,
          solvedProblems: solved,
          progressPercentage: total > 0 ? Math.round((solved / total) * 100) : 0,
          easyCount: db.easy,
          mediumCount: db.medium,
          hardCount: db.hard,
          easySolved: db.easySolved,
          mediumSolved: db.mediumSolved,
          hardSolved: db.hardSolved,
          leetCount: plat.leetCount,
          gfgCount: plat.gfgCount,
        });
      }

      globalTotal += categoryTotal; globalSolved += categorySolved;
      globalEasy += catEasy; globalMedium += catMedium; globalHard += catHard;
      globalEasySolved += catEasySolved; globalMediumSolved += catMediumSolved; globalHardSolved += catHardSolved;
      globalLeet += catLeet; globalGfg += catGfg;

      data.push({
        _id: cat._id,
        title: cat.title,
        description: cat.description,
        icon: cat.icon,
        order: cat.order,
        totalProblems: categoryTotal,
        solvedProblems: categorySolved,
        progressPercentage: categoryTotal > 0 ? Math.round((categorySolved / categoryTotal) * 100) : 0,
        easyCount: catEasy,
        mediumCount: catMedium,
        hardCount: catHard,
        easySolved: catEasySolved,
        mediumSolved: catMediumSolved,
        hardSolved: catHardSolved,
        leetCount: catLeet,
        gfgCount: catGfg,
        patterns: patternsWithProgress,
      });
    }

    // Attach global summary as first item (meta field)
    const meta = {
      totalProblems: globalTotal,
      solvedProblems: globalSolved,
      progressPercentage: globalTotal > 0 ? Math.round((globalSolved / globalTotal) * 100) : 0,
      easyCount: globalEasy, easySolved: globalEasySolved,
      mediumCount: globalMedium, mediumSolved: globalMediumSolved,
      hardCount: globalHard, hardSolved: globalHardSolved,
      leetCount: globalLeet, gfgCount: globalGfg,
    };

    return res.status(200).json(new ApiResponse(200, { categories: data, meta }));
  } catch (error: any) {
    console.error('[patterns:categories:progress] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/patterns/:patternId
// Returns a single pattern with ALL its problems (full details)
// ---------------------------------------------------------------------------
export const getPatternDetail = async (req: Request, res: Response) => {
  try {
    const { patternId } = req.params;
    const userId = (req as any).auth?.userId;

    const pattern = await Pattern.findById(patternId).lean();
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Pattern not found' });
    }

    const category = await PatternCategory.findById(pattern.categoryId).lean();

    const patternProblems = await PatternProblem.find({ patternId })
      .sort({ order: 1 })
      .lean();

    const mpIds = patternProblems.map(pp => pp.masterProblemId);
    const masterProblems = await MasterProblem.find({ problemId: { $in: mpIds }, active: true }).lean();

    let leetCount = 0;
    let gfgCount = 0;
    for (const mp of masterProblems) {
      if (mp.links?.leetcode) leetCount++;
      if (mp.links?.geeksforgeeks || mp.links?.gfg) gfgCount++;
    }

    const mpMap = new Map<number, typeof masterProblems[0]>();
    for (const mp of masterProblems) {
      mpMap.set(mp.problemId, mp);
    }

    let userProgressMap = new Map<number, boolean>();
    if (userId) {
      const progressEntries = await UserProgress.find({
        userId,
        problemId: { $in: mpIds },
        solved: true,
      }).lean();
      for (const entry of progressEntries) {
        userProgressMap.set(entry.problemId, true);
      }
    }

    const problems = patternProblems.map(pp => {
      const mp = mpMap.get(pp.masterProblemId);
      if (!mp) return null;
      return {
        problemId: mp.problemId,
        name: mp.title,
        difficulty: mp.difficulty,
        platform: mp.platform,
        link: mp.link,
        links: mp.links || {},
        youtubeUrl: mp.youtubeUrl || '',
        articleUrl: mp.articleUrl || '',
        videos: mp.videos || [],
        editorials: mp.editorials || [],
        tags: mp.tags || [],
        solved: userProgressMap.has(mp.problemId) || false,
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);

    const totalProblems = problems.length;
    const solvedProblems = problems.filter(p => p.solved).length;

    return res.status(200).json(
      new ApiResponse(200, {
        pattern: {
          _id: pattern._id,
          title: pattern.title,
          description: pattern.description,
          difficulty: pattern.difficulty,
          order: pattern.order,
          leetCount,
          gfgCount,
        },
        category: category ? {
          _id: category._id,
          title: category.title,
          icon: category.icon,
        } : null,
        totalProblems,
        solvedProblems,
        progressPercentage: totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0,
        problems,
      })
    );
  } catch (error: any) {
    console.error('[patterns:detail] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/patterns/stats
// Returns aggregated analytics: solved by category, by difficulty, weak patterns
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// GET /api/patterns/progress/:patternId
// Returns per-user progress for a single pattern (lightweight, no problems)
// ---------------------------------------------------------------------------
export const getPatternProgress = async (req: Request, res: Response) => {
  try {
    const { patternId } = req.params;
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const pattern = await Pattern.findById(patternId).lean();
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Pattern not found' });
    }

    const category = await PatternCategory.findById(pattern.categoryId).select('title icon').lean();
    const patternProblems = await PatternProblem.find({ patternId }).lean();
    const mpIds = patternProblems.map(pp => pp.masterProblemId);
    const total = mpIds.length;

    let solved = 0;
    if (total > 0) {
      solved = await UserProgress.countDocuments({
        userId,
        problemId: { $in: mpIds },
        solved: true,
      });
    }

    return res.status(200).json(
      new ApiResponse(200, {
        patternId: pattern._id,
        patternTitle: pattern.title,
        category: category ? { title: category.title, icon: category.icon } : null,
        difficulty: pattern.difficulty,
        totalProblems: total,
        solvedProblems: solved,
        progressPercentage: total > 0 ? Math.round((solved / total) * 100) : 0,
      })
    );
  } catch (error: any) {
    console.error('[patterns:progress] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/patterns/stats
// Returns aggregated analytics: solved by category, by difficulty, weak patterns
// ---------------------------------------------------------------------------
export const getPatternStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [categories, patterns, patternProblems] = await getCachedReferenceData();

    const problemsByPattern = new Map<string, number[]>();
    for (const pp of patternProblems) {
      const patIdStr = pp.patternId.toString();
      if (!problemsByPattern.has(patIdStr)) {
        problemsByPattern.set(patIdStr, []);
      }
      problemsByPattern.get(patIdStr)!.push(pp.masterProblemId);
    }

    const patternsByCategory = new Map<string, any[]>();
    for (const pat of patterns) {
      const catIdStr = pat.categoryId.toString();
      if (!patternsByCategory.has(catIdStr)) {
        patternsByCategory.set(catIdStr, []);
      }
      patternsByCategory.get(catIdStr)!.push(pat);
    }

    const solvedProgress = await UserProgress.find({
      userId,
      solved: true,
    }).select('problemId').lean();

    const solvedSet = new Set(solvedProgress.map(up => up.problemId));

    const categoryStats = [];
    let totalSolved = 0;
    let totalProblems = 0;
    const difficultyBreakdown: Record<string, { total: number; solved: number }> = {};
    const weakPatterns: Array<{ title: string; solved: number; total: number; percentage: number }> = [];

    for (const cat of categories) {
      const catPatterns = patternsByCategory.get(cat._id.toString()) || [];
      let catSolved = 0;
      let catTotal = 0;

      for (const pat of catPatterns) {
        const mpIds = problemsByPattern.get(pat._id.toString()) || [];
        const total = mpIds.length;
        catTotal += total;

        if (!difficultyBreakdown[pat.difficulty]) {
          difficultyBreakdown[pat.difficulty] = { total: 0, solved: 0 };
        }
        difficultyBreakdown[pat.difficulty].total += total;

        let solved = 0;
        if (total > 0) {
          solved = mpIds.filter((id: number) => solvedSet.has(id)).length;
          difficultyBreakdown[pat.difficulty].solved += solved;
        }
        catSolved += solved;

        const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
        if (pct < 50 && total > 0) {
          weakPatterns.push({ title: pat.title, solved, total, percentage: pct });
        }
      }

      totalSolved += catSolved;
      totalProblems += catTotal;
      categoryStats.push({
        title: cat.title,
        icon: cat.icon,
        solved: catSolved,
        total: catTotal,
        percentage: catTotal > 0 ? Math.round((catSolved / catTotal) * 100) : 0,
      });
    }

    weakPatterns.sort((a, b) => a.percentage - b.percentage);

    return res.status(200).json(
      new ApiResponse(200, {
        overallProgress: {
          solved: totalSolved,
          total: totalProblems,
          percentage: totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0,
        },
        byCategory: categoryStats,
        byDifficulty: difficultyBreakdown,
        weakPatterns,
      })
    );
  } catch (error: any) {
    console.error('[patterns:stats] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/patterns/analytics
// Returns FULL pattern analytics: stats, streaks, charts, heatmap, patterns
// ---------------------------------------------------------------------------
export const getPatternAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [categories, allPatterns, allPatternProblems] = await getCachedReferenceData();
    const [userProgress, masterProblems] = await Promise.all([
      UserProgress.find({ userId, solved: true }).select('problemId solvedAt').lean(),
      MasterProblem.find({ active: true }).select('problemId title difficulty').lean(),
    ]);

    const mpMap = new Map<number, typeof masterProblems[0]>();
    for (const mp of masterProblems) mpMap.set(mp.problemId, mp);

    const solvedSet = new Set<number>();
    const solvedEntries: Array<{ problemId: number; solvedAt: Date | null }> = [];
    for (const up of userProgress) {
      solvedSet.add(up.problemId);
      solvedEntries.push({ problemId: up.problemId, solvedAt: up.solvedAt });
    }

    const patternProblemsMap = new Map<string, number[]>();
    for (const pp of allPatternProblems) {
      const id = pp.patternId.toString();
      if (!patternProblemsMap.has(id)) patternProblemsMap.set(id, []);
      patternProblemsMap.get(id)!.push(pp.masterProblemId);
    }

    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      for (const pat of allPatterns) {
        if (pat.categoryId.toString() === cat._id.toString()) {
          categoryMap.set(pat._id.toString(), cat.title);
        }
      }
    }

    const patternStats: any[] = [];
    let totalProblems = 0;
    let totalSolved = 0;
    const difficultySolved: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    const difficultyTotal: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    const weakPatterns: any[] = [];
    const strongPatterns: any[] = [];

    for (const pat of allPatterns) {
      const patId = pat._id.toString();
      const mpIds = patternProblemsMap.get(patId) || [];
      const total = mpIds.length;
      const solved = mpIds.filter(id => solvedSet.has(id)).length;
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

      totalProblems += total;
      totalSolved += solved;

      const easyS = mpIds.filter(id => mpMap.get(id)?.difficulty === 'Easy' && solvedSet.has(id)).length;
      const medS = mpIds.filter(id => mpMap.get(id)?.difficulty === 'Medium' && solvedSet.has(id)).length;
      const hardS = mpIds.filter(id => mpMap.get(id)?.difficulty === 'Hard' && solvedSet.has(id)).length;
      const easyT = mpIds.filter(id => mpMap.get(id)?.difficulty === 'Easy').length;
      const medT = mpIds.filter(id => mpMap.get(id)?.difficulty === 'Medium').length;
      const hardT = mpIds.filter(id => mpMap.get(id)?.difficulty === 'Hard').length;

      difficultySolved.Easy += easyS;
      difficultySolved.Medium += medS;
      difficultySolved.Hard += hardS;
      difficultyTotal.Easy += easyT;
      difficultyTotal.Medium += medT;
      difficultyTotal.Hard += hardT;

      const patternSolvedEntries = solvedEntries
        .filter(e => mpIds.includes(e.problemId))
        .sort((a, b) => new Date(b.solvedAt || 0).getTime() - new Date(a.solvedAt || 0).getTime());

      patternStats.push({
        patternId: pat._id,
        patternTitle: pat.title,
        categoryTitle: categoryMap.get(patId) || '',
        difficulty: pat.difficulty,
        totalProblems: total,
        solvedProblems: solved,
        remainingProblems: total - solved,
        completionPercentage: pct,
        easySolved: easyS,
        mediumSolved: medS,
        hardSolved: hardS,
        easyTotal: easyT,
        mediumTotal: medT,
        hardTotal: hardT,
        lastSolved: patternSolvedEntries.length > 0 ? patternSolvedEntries[0].solvedAt : null,
      });

      if (pct < 30 && total > 0) weakPatterns.push({ patternId: pat._id, title: pat.title, solved, total, percentage: pct });
      if (pct > 80 && total > 0) strongPatterns.push({ patternId: pat._id, title: pat.title, solved, total, percentage: pct });
    }

    const dates = solvedEntries
      .filter(e => e.solvedAt)
      .map(e => { const d = new Date(e.solvedAt!); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })
      .sort((a, b) => b - a);

    const uniqueDates = [...new Set(dates)];
    let currentStreak = 0;
    let longestStreak = 0;

    if (uniqueDates.length > 0) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayTime = todayStart.getTime();
      const latestDate = uniqueDates[0];
      const gap = Math.round((todayTime - latestDate) / (1000 * 60 * 60 * 24));

      if (gap <= 1) {
        currentStreak = 1;
        let idx = 0;
        for (let i = 1; i < uniqueDates.length; i++) {
          if (Math.round((uniqueDates[idx] - uniqueDates[i]) / (1000 * 60 * 60 * 24)) === 1) {
            currentStreak++; idx = i;
          } else break;
        }
      }

      longestStreak = 1; let tmp = 1;
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        if (Math.round((uniqueDates[i] - uniqueDates[i + 1]) / (1000 * 60 * 60 * 24)) === 1) {
          tmp++; longestStreak = Math.max(longestStreak, tmp);
        } else tmp = 1;
      }
    }

    const now = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(now); d.setDate(d.getDate() - n);
      return d;
    };
    const countForDay = (d: Date) => {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const end = start + 86400000;
      return solvedEntries.filter(e => {
        if (!e.solvedAt) return false;
        const t = new Date(e.solvedAt).getTime();
        return t >= start && t < end;
      }).length;
    };

    const weeklyProgress = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      weeklyProgress.push({ date: d.toISOString().split('T')[0], solved: countForDay(d) });
    }

    const monthlyProgress = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      monthlyProgress.push({ date: d.toISOString().split('T')[0], solved: countForDay(d) });
    }

    const heatmapData = [];
    for (let i = 364; i >= 0; i--) {
      const d = daysAgo(i);
      heatmapData.push({ date: d.toISOString().split('T')[0], count: countForDay(d) });
    }

    const recentSolved = await UserProgress.aggregate([
      { $match: { userId, solved: true, solvedAt: { $ne: null } } },
      { $sort: { solvedAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'masterproblems',
          localField: 'problemId',
          foreignField: 'problemId',
          as: 'problem',
        },
      },
      { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } },
      { $project: { problemId: 1, solvedAt: 1, title: '$problem.title', difficulty: '$problem.difficulty', _id: 0 } },
    ]);

    const earliest = dates.length > 0 ? Math.min(...dates) : Date.now();
    const daysSince = Math.max(1, Math.round((Date.now() - earliest) / (1000 * 60 * 60 * 24)));
    const avgProblemsPerDay = Math.round((totalSolved / daysSince) * 10) / 10;

    const patternsCompleted = patternStats.filter(p => p.completionPercentage >= 100).length;
    const totalPatterns = allPatterns.length;

    return res.status(200).json(
      new ApiResponse(200, {
        totalSolved,
        totalProblems,
        completionPercentage: totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0,
        patternsCompleted,
        totalPatterns,
        difficultySolved,
        difficultyTotal,
        currentStreak,
        longestStreak,
        avgProblemsPerDay,
        weeklyProgress,
        monthlyProgress,
        patternStats,
        weakPatterns,
        strongPatterns,
        recentSolved,
        heatmapData,
      })
    );
  } catch (error: any) {
    console.error('[patterns:analytics] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
