import { Request, Response } from 'express';
import { MasterProblem } from '../models/MasterProblem';
import { PatternProblem } from '../models/PatternProblem';
import { Pattern } from '../models/Pattern';
import { SheetProblem } from '../models/SheetProblem';
import { UserProgress } from '../models/UserProgress';
import { ApiResponse } from '../utils/ApiResponse';

// ---------------------------------------------------------------------------
// GET /api/problems/stats
// Returns complete breakdown of all unique problems in the DB (no auth needed)
// ---------------------------------------------------------------------------
export const getDbStats = async (req: Request, res: Response) => {
  try {
    const [total, active] = await Promise.all([
      MasterProblem.countDocuments({}),
      MasterProblem.countDocuments({ active: true }),
    ]);

    // By difficulty
    const byDifficulty = await MasterProblem.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // By primary platform
    const byPlatform = await MasterProblem.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Platform link availability counts
    const [hasLeetcode, hasGfg, hasCodechef, hasCodeforces, hasCodingNinjas] = await Promise.all([
      MasterProblem.countDocuments({ 'links.leetcode': { $exists: true, $ne: '' } }),
      MasterProblem.countDocuments({ $or: [
        { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
        { 'links.gfg': { $exists: true, $ne: '' } },
      ]}),
      MasterProblem.countDocuments({ 'links.codechef': { $exists: true, $ne: '' } }),
      MasterProblem.countDocuments({ 'links.codeforces': { $exists: true, $ne: '' } }),
      MasterProblem.countDocuments({ 'links.codingninjas': { $exists: true, $ne: '' } }),
    ]);

    // Problems linked to at least one pattern
    const linkedToPatternIds = await PatternProblem.distinct('masterProblemId');
    const inPatterns = linkedToPatternIds.length;

    // Problems linked to at least one DSA sheet
    const linkedToSheetIds = await SheetProblem.distinct('masterProblemId');
    const inSheets = linkedToSheetIds.length;

    // Pattern count
    const patternCount = await Pattern.countDocuments({ active: true });

    return res.status(200).json(new ApiResponse(200, {
      total,
      active,
      inPatterns,
      inSheets,
      patternCount,
      byDifficulty: Object.fromEntries(byDifficulty.map(d => [d._id || 'Unknown', d.count])),
      byPlatform: Object.fromEntries(byPlatform.map(p => [p._id || 'Unknown', p.count])),
      platformLinks: {
        leetcode: hasLeetcode,
        geeksforgeeks: hasGfg,
        codechef: hasCodechef,
        codeforces: hasCodeforces,
        codingninjas: hasCodingNinjas,
      },
    }));
  } catch (error: any) {
    console.error('[problems:stats] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getProblemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problemId = parseInt(String(id), 10);
    if (isNaN(problemId)) {
      return res.status(400).json({ success: false, message: 'Invalid problem ID' });
    }

    const problem = await MasterProblem.findOne({ problemId, active: true }).lean();
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    // Find which patterns this problem belongs to
    const patternProblems = await PatternProblem.find({
      masterProblemId: problemId,
    }).lean();
    const patternIds = patternProblems.map(pp => pp.patternId);
    const patterns = await Pattern.find({ _id: { $in: patternIds }, active: true })
      .select('title difficulty order categoryId')
      .populate('categoryId', 'title')
      .lean();

    // Populate may not type-cast, so cast safely
    const patternList = patterns.map((p: any) => ({
      patternId: p._id,
      title: p.title,
      difficulty: p.difficulty,
      category: p.categoryId?.title || '',
    }));

    // Find which sheets this problem belongs to
    const sheetProblems = await SheetProblem.find({
      masterProblemId: problemId,
    }).lean();

    return res.status(200).json(
      new ApiResponse(200, {
        problemId: problem.problemId,
        title: problem.title,
        difficulty: problem.difficulty,
        platform: problem.platform,
        link: problem.link,
        links: problem.links || {},
        youtubeUrl: problem.youtubeUrl || '',
        articleUrl: problem.articleUrl || '',
        videos: problem.videos || [],
        editorials: problem.editorials || [],
        tags: problem.tags || [],
        companies: problem.companies || [],
        patterns: patternList,
        sheetCount: sheetProblems.length,
      })
    );
  } catch (error: any) {
    console.error('[problems:getById] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
