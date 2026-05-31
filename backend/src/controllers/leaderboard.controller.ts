import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { PlatformStats } from '../models/platformStats.model';
import { Profile } from '../models/profile.model';
import { User } from '../models/user.model';
import { getSocketIo } from '../socket';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║          🔒 CODEYX SCORE — LOCKED RANKING SYSTEM                        ║
// ║  DO NOT MODIFY buildUserEntry() without updating RANKING_SYSTEM.md      ║
// ║  Full spec: src/controllers/RANKING_SYSTEM.md                           ║
// ║  Max Raw Score = 105 pts | Final = (rawScore/105)×100 (1 decimal)       ║
// ║  Competitive 70pts | Developer 30pts | Profile Bonus 5pts               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function buildUserEntry(clerkUser: any, userStats: any[], userProfile?: any) {
    let totalSolved = 0;
    let leetcodeRating = 0;
    let codeforcesRating = 0;
    let codechefRating = 0;
    let geeksforgeeksRating = 0;
    let contestsCount = 0;
    let highestStreak = 0;
    const platformBreakdown: Record<string, { rating: number; solved: number; contests: number }> = {};

    userStats.forEach((s: any) => {
        const pRating  = s.rating     || 0;
        const pSolved  = s.totalSolved || 0;
        let   pContests = 0;

        if (s.platform === 'leetcode') {
            leetcodeRating = pRating;
            totalSolved += pSolved;
            if (s.stats?.contestAttend !== undefined) {
                pContests = s.stats.contestAttend;
            } else if (s.stats?.raw?.userContestRankingHistory) {
                pContests = (s.stats.raw.userContestRankingHistory || []).filter((c: any) => c.attended === true || c.rating > 0).length;
            } else if (Array.isArray(s.stats?.contests)) {
                pContests = s.stats.contests.length;
            }
        } else if (s.platform === 'codeforces') {
            codeforcesRating = pRating;
            totalSolved += pSolved;
            pContests = s.stats?.ratingCount || 0;
        } else if (s.platform === 'codechef') {
            codechefRating = pRating;
            totalSolved += pSolved;
            pContests = Array.isArray(s.stats?.contests) ? s.stats.contests.length : (parseInt(s.stats?.contests) || 0);
        } else if (s.platform === 'geeksforgeeks') {
            geeksforgeeksRating = pRating;
            totalSolved += pSolved;
            if (s.stats?.contests !== undefined) {
                pContests = typeof s.stats.contests === 'number' ? s.stats.contests : (parseInt(s.stats.contests) || 0);
            } else if (Array.isArray(s.stats?.contestsHistory)) {
                pContests = s.stats.contestsHistory.length;
            }
        }
        // github and codeyx don't add to competitive score

        if (s.stats?.streak && s.stats.streak > highestStreak) {
            highestStreak = s.stats.streak;
        }

        contestsCount += pContests;
        platformBreakdown[s.platform] = { rating: pRating, solved: pSolved, contests: pContests };
    });

    // ── 1. COMPETITIVE SCORE (0-70 pts) ─────────────────────────────────────
    // LeetCode (15 Points Max): Rating (10 pts) + Weighted Solved (5 pts)
    const leetcodeStats = userStats.find(s => s.platform === 'leetcode');
    const lcRatingPoints = Math.min(10, (leetcodeRating / 2200) * 10);
    const lcEasy   = leetcodeStats?.stats?.metadata?.extra?.easy   || leetcodeStats?.stats?.easy   || 0;
    const lcMedium = leetcodeStats?.stats?.metadata?.extra?.medium || leetcodeStats?.stats?.medium || 0;
    const lcHard   = leetcodeStats?.stats?.metadata?.extra?.hard   || leetcodeStats?.stats?.hard   || 0;
    const lcTotalSolved = leetcodeStats?.totalSolved || 0;
    // Use difficulty breakdown if available; fallback to totalSolved treated as Medium
    const lcWeightedSolved = (lcEasy + lcMedium + lcHard) > 0
        ? (lcEasy * 1) + (lcMedium * 3) + (lcHard * 6)
        : lcTotalSolved * 3;   // fallback: treat all as Medium
    const lcSolvedPoints = Math.min(5, (lcWeightedSolved / 1000) * 5);
    const lcScore = lcRatingPoints + lcSolvedPoints;

    // Codeforces (15 Points Max): Rating (12 pts) + Contest Activity (3 pts)
    const codeforcesStats = userStats.find(s => s.platform === 'codeforces');
    const cfRatingPoints = Math.min(12, (codeforcesRating / 2000) * 12);
    const cfContestsCount = codeforcesStats?.stats?.ratingCount || codeforcesStats?.stats?.contests || 0;
    const cfContestPoints = Math.min(3, (cfContestsCount / 30) * 3);
    const cfScore = cfRatingPoints + cfContestPoints;

    // CodeChef (10 Points Max): Rating (8 pts) + Contest Activity (2 pts)
    const codechefStats = userStats.find(s => s.platform === 'codechef');
    const ccRatingPoints = Math.min(8, (codechefRating / 2200) * 8);
    const ccContestsCount = Array.isArray(codechefStats?.stats?.contests) ? codechefStats.stats.contests.length : (parseInt(codechefStats?.stats?.contests) || 0);
    const ccContestPoints = Math.min(2, (ccContestsCount / 20) * 2);
    const ccScore = ccRatingPoints + ccContestPoints;

    // GeeksforGeeks (10 Points Max): Rating/Score (6 pts) + Solved Problems (4 pts)
    const geeksforgeeksStats = userStats.find(s => s.platform === 'geeksforgeeks');
    const gfgRatingPoints = Math.min(6, (geeksforgeeksRating / 1500) * 6);
    const gfgSolved = geeksforgeeksStats?.totalSolved || 0;
    const gfgSolvedPoints = Math.min(4, (gfgSolved / 300) * 4);
    const gfgScore = gfgRatingPoints + gfgSolvedPoints;

    // Overall Problem Solving (15 Points Max): Weighted unique solved problems across all coding platforms
    // CF solved defaults to medium, CC solved defaults to medium, GFG solved defaults to easy.
    const cfMediumSolved = codeforcesStats?.totalSolved || 0;
    const ccMediumSolved = codechefStats?.totalSolved || 0;
    // Use weighted breakdown if available, otherwise fall back to totalSolved × 3 (Medium)
    const lcWeightedForOverall = (lcEasy + lcMedium + lcHard) > 0
        ? (lcEasy * 1 + lcMedium * 3 + lcHard * 6)
        : (leetcodeStats?.totalSolved || 0) * 3;
    const totalWeightedSolved = lcWeightedForOverall + (cfMediumSolved * 3) + (ccMediumSolved * 3) + (gfgSolved * 1);
    const overallProblemSolvingScore = Math.min(15, (totalWeightedSolved / 2000) * 15);

    // Overall Contest Activity (5 Points Max)
    let overallContestScore = 0;
    if (contestsCount > 0 && contestsCount <= 5) overallContestScore = 1;
    else if (contestsCount >= 6 && contestsCount <= 10) overallContestScore = 2;
    else if (contestsCount >= 11 && contestsCount <= 20) overallContestScore = 3;
    else if (contestsCount >= 21 && contestsCount <= 30) overallContestScore = 4;
    else if (contestsCount > 30) overallContestScore = 5;

    const competitiveScore = lcScore + cfScore + ccScore + gfgScore + overallProblemSolvingScore + overallContestScore;

    // ── 2. DEVELOPER SCORE (0-30 pts) ────────────────────────────────────────
    const githubData = userStats.find(s => s.platform === 'github');
    const repos = githubData?.totalSolved || githubData?.stats?.totalSolved || githubData?.stats?.metadata?.repositoriesCount || 0;
    const stars = githubData?.stats?.starsNum || githubData?.stats?.stars || githubData?.stats?.metadata?.extra?.totalStars || 0;
    const commits = githubData?.stats?.metadata?.extra?.commitsCount || githubData?.stats?.metadata?.extra?.totalContributions || githubData?.stats?.totalCommits || githubData?.stats?.contributions || 0;

    // Projects: 0-15 pts — 1 pt per repo, max 15 repos needed for full score
    const projectScore = Math.min(15, repos);
    // GitHub Stars: 0-5 pts (1 pt per star, max 5)
    const starScore = Math.min(5, stars);
    // Contributions: 0-10 pts (normalized over 300 commits, max 10)
    const contributionScore = Math.min(10, (commits / 300) * 10);

    const developerScore = projectScore + starScore + contributionScore;

    // ── 3. PROFILE BONUS (+5 pts) ───────────────────────────────────────────
    const collegeBonus = (userProfile?.college?.length || 0) > 2 ? 2 : 0;
    const bioBonus     = (userProfile?.bio?.length || 0) > 20 ? 3 : 0;
    const profileBonus = collegeBonus + bioBonus;

    // ── FINAL CODEYX SCORE (0-100) ────────────────────────────────────────────
    const rawScore = competitiveScore + developerScore + profileBonus;
    const codeyxScore = Math.min(100, Math.round(((rawScore / 105) * 100) * 10) / 10);

    // ── RADAR STATS (normalized 0-100 for each axis) ─────────────────────────
    const maxRatingForContestAxis = Math.max(leetcodeRating, codeforcesRating, codechefRating, geeksforgeeksRating);
    const combinedRating = leetcodeRating + codeforcesRating + codechefRating + geeksforgeeksRating;
    const problemSolving = Math.min(100, Math.round((totalSolved / 500) * 100));
    const contestAxis    = Math.min(100, Math.round((maxRatingForContestAxis / 2200) * 100));
    const speed          = Math.min(100, Math.round((contestsCount / 25) * 100));
    const accuracy       = Math.min(100, Math.round((maxRatingForContestAxis / 2000) * 100));
    const consistency    = Math.min(100, Math.round((highestStreak / 100) * 100));

    // ── CONTEST RATING (platform-method weighted, 0–10000 scale) ─────────────
    // Each platform's rating normalized to 0-1 using their own max scale, then
    // weighted by platform prestige (mirrors how each site ranks its users):
    //   Codeforces 40%  (ELO-based, most rigorous)   → max 3500
    //   LeetCode   35%  (official contest rating)     → max 3500
    //   CodeChef   15%  (star-rated contest system)   → max 2500
    //   GFG        10%  (practice-contest hybrid)     → max 1500
    const cfNorm  = Math.min(1, codeforcesRating / 3500);
    const lcNorm  = Math.min(1, leetcodeRating   / 3500);
    const ccNorm  = Math.min(1, codechefRating   / 2500);
    const gfgNorm = Math.min(1, geeksforgeeksRating / 1500);
    const contestRating = Math.round(
        (cfNorm * 0.40 + lcNorm * 0.35 + ccNorm * 0.15 + gfgNorm * 0.10) * 10000
    );

    const externalPlatforms = Object.keys(platformBreakdown).filter(p => p !== 'codeyx');
    const hasConnected = externalPlatforms.length > 0;
    // hasData: true if any competitive platform data OR github has repos/commits
    const githubHasData = (repos > 0 || stars > 0 || commits > 0);
    const hasData = hasConnected && (totalSolved > 0 || combinedRating > 0 || githubHasData);

    // Friendly display name: prioritize Mongoose profile name, fallback to Clerk
    const firstName = clerkUser.firstName || '';
    const lastName  = clerkUser.lastName  || '';
    const clerkFullName = `${firstName} ${lastName}`.trim();
    const fullName  = userProfile?.name || clerkFullName || 'Anonymous Developer';
    
    const email     = (clerkUser.emailAddresses?.[0]?.emailAddress) || '';
    const emailPrefix = email ? email.split('@')[0] : null;
    
    // Strict DB username check with email prefix fallback
    const username = userProfile?.username || clerkUser.username || emailPrefix || null;
    const avatarUrl = clerkUser.imageUrl || clerkUser.profileImageUrl || '';

    const isPublic = userProfile?.publicSettings?.isPublic !== false;

    return {
        userId:    clerkUser.id,
        username,
        user:      fullName || username,
        rating:    codeyxScore,
        rawCombinedRating: combinedRating,
        contestRating,
        problems:  totalSolved,
        streak:    highestStreak,
        contests:  contestsCount,
        // bestRating: highest contest rating across all competitive platforms
        bestRating: Math.max(leetcodeRating, codeforcesRating, codechefRating, geeksforgeeksRating),
        winRate: 0, // kept for backwards compat — use bestRating instead
        avatarUrl,
        isVerified: false,
        hasConnected,
        hasData,
        isPublic,
        college:   userProfile?.college || '',
        // Filter out internal 'codeyx' platform from UI display
        platformBreakdown: Object.fromEntries(
            Object.entries(platformBreakdown).filter(([p]) => p !== 'codeyx')
        ),
        radarStats: hasData ? { problemSolving, speed, accuracy, consistency, contest: contestAxis } : null,
    };
}

// ─── GET /api/leaderboard ────────────────────────────────────────────────────
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        // 1. Fetch ALL Clerk users (source of truth)
        const clerkResponse = await clerkClient.users.getUserList({ limit: 500 });
        const clerkUsers = Array.isArray(clerkResponse) ? clerkResponse : (clerkResponse as any).data ?? clerkResponse;

        if (!clerkUsers || clerkUsers.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // 2. Fetch ALL platform stats from DB
        const allStats = await PlatformStats.find().lean();
        const statsByUser: Record<string, any[]> = {};
        allStats.forEach((s: any) => {
            if (!statsByUser[s.userId]) statsByUser[s.userId] = [];
            statsByUser[s.userId].push(s);
        });

        // Fetch ALL profiles from DB
        const allProfiles = await Profile.find().lean();
        const profilesByUser: Record<string, any> = {};
        allProfiles.forEach((p: any) => {
            profilesByUser[p.userId] = p;
        });

        // 3. Build leaderboard entries for every Clerk user
        const rawLeaderboardData = clerkUsers.map((cu: any) =>
            buildUserEntry(cu, statsByUser[cu.id] || [], profilesByUser[cu.id])
        );

        // Pass 2: Finalize usernames without any automatic changing/shifting
        const leaderboardData = rawLeaderboardData.map((u: any) => {
            const profile = profilesByUser[u.userId];
            if (profile?.username) {
                u.username = profile.username;
            }
            // Ensure username is never null. Fallback to a default name.
            if (!u.username) {
                // If email prefix failed, use a part of their user ID
                u.username = `user_${u.userId.substring(u.userId.length - 6)}`;
            }
            return u;
        });

        // 4. Sort: active coders (hasData=true) ALWAYS above profile-only users
        // Within each group sort by Codeyx Score DESC → problems DESC → rating DESC
        leaderboardData.sort((a: any, b: any) => {
            // Primary: users with platform data come before those without
            if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
            // Secondary: Codeyx Score DESC
            if (b.rating !== a.rating) return b.rating - a.rating;
            // Tertiary: problems solved DESC
            if (b.problems !== a.problems) return b.problems - a.problems;
            // Quaternary: combined rating DESC
            return b.rawCombinedRating - a.rawCombinedRating;
        });

        // 5. Assign rank badges
        const rankedUsers = leaderboardData.map((item: any, index: number) => {
            const rank = index + 1;
            let badge = 'shield', badgeColor = 'text-blue-500';
            if      (rank === 1) { badge = 'crown';   badgeColor = 'text-yellow-500'; }
            else if (rank === 2) { badge = 'crown';   badgeColor = 'text-purple-500'; }
            else if (rank === 3) { badge = 'crown';   badgeColor = 'text-[#FF8A00]'; }
            else if (rank <= 6)  { badge = 'diamond'; badgeColor = 'text-emerald-500'; }
            return { ...item, rank, badge, badgeColor };
        });

        // 6. Broadcast via Socket.io so all connected clients get real-time update
        try {
            const socketIo = getSocketIo();
            socketIo.emit('leaderboard_updated', { data: rankedUsers, updatedAt: new Date().toISOString() });
        } catch (_) { /* socket not ready, ignore */ }

        return res.json({ success: true, data: rankedUsers, updatedAt: new Date().toISOString() });
    } catch (err: any) {
        console.error('Leaderboard Fetch Error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error fetching leaderboard' });
    }
};

// ─── GET /api/leaderboard/user/:userId ───────────────────────────────────────
export const getUserLeaderboardProfile = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Fetch user directly from local DB for speed, fallback to Clerk if missing
        let clerkUser: any = await User.findOne({ clerkUserId: userId }).lean();
        
        if (!clerkUser) {
            const rawUser = await clerkClient.users.getUser(userId as string);
            if (!rawUser) return res.status(404).json({ success: false, message: 'User not found' });
            clerkUser = {
                id: rawUser.id,
                firstName: rawUser.firstName,
                lastName: rawUser.lastName,
                emailAddresses: rawUser.emailAddresses,
                username: rawUser.username,
                imageUrl: rawUser.imageUrl,
            };
        } else {
            clerkUser = {
                id: clerkUser.clerkUserId,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                emailAddresses: [{ emailAddress: clerkUser.email }],
                username: clerkUser.username,
                imageUrl: clerkUser.avatarUrl,
            };
        }

        const stats = await PlatformStats.find({ userId }).lean();
        const userProfile = await Profile.findOne({ userId }).lean();
        const entry = buildUserEntry(clerkUser, stats, userProfile);
        return res.json({ success: true, data: entry });
    } catch (err: any) {
        console.error('User Leaderboard Profile Error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ─── GET /api/leaderboard/debug ──────────────────────────────────────────────
export const debugLeaderboard = async (req: Request, res: Response) => {
    try {
        const clerkResponse = await clerkClient.users.getUserList({ limit: 100 });
        const clerkUsers = Array.isArray(clerkResponse) ? clerkResponse : (clerkResponse as any).data ?? clerkResponse;

        const stats = await PlatformStats.find({}, 'userId platform username totalSolved rating').lean();

        const clerkIds    = clerkUsers.map((u: any) => u.id);
        const statUserIds = [...new Set(stats.map((s: any) => s.userId))];
        const matched     = statUserIds.filter(id => clerkIds.includes(id));
        const unmatched   = statUserIds.filter(id => !clerkIds.includes(id));

        return res.json({
            success: true,
            clerkUsers: clerkUsers.map((u: any) => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.emailAddresses?.[0]?.emailAddress,
                username: u.username,
            })),
            platformStats: stats,
            matchedUserIds: matched,
            unmatchedStatUserIds: unmatched,
            summary: `${clerkUsers.length} Clerk users | ${stats.length} platform stats | ${unmatched.length} orphan stats`,
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
