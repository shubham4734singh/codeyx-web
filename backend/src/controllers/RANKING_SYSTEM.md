# 🔒 CODEYX SCORE — LOCKED RANKING SPECIFICATION
# DO NOT MODIFY THIS SYSTEM WITHOUT EXPLICIT AUTHORIZATION
# Last locked: 2026-05-31 | File: leaderboard.controller.ts → buildUserEntry()

---

## ⚠️ WARNING
This file documents the **finalized, production-locked** Codeyx Score algorithm.
Any changes to `buildUserEntry()` in `leaderboard.controller.ts` MUST match this spec exactly.
Do NOT change denominators, weights, or logic without updating this file too.

---

## OVERVIEW

**Codeyx Score** = 0% to 100% (displayed as %)
**Formula:**  `(rawScore / 105) × 100`, rounded to 1 decimal place
**Max Raw Score:** 105 points

---

## STEP 1 — COMPETITIVE PROGRAMMING SCORE (Max 70 Points)

### LeetCode (Max 15 Points)
| Component       | Max Points | Formula                              |
|----------------|-----------|--------------------------------------|
| Rating Score   | 10 pts    | `min(10, (lcRating / 2200) * 10)`    |
| Weighted Solved| 5 pts     | `min(5, (lcWeighted / 1000) * 5)`    |

**Weighted Solved = (Easy × 1) + (Medium × 3) + (Hard × 6)**
- Easy, Medium, Hard counts read from: `stats.metadata.extra.easy/medium/hard`

**LeetCode Score = Rating Score + Weighted Solved Score**

---

### Codeforces (Max 15 Points)
| Component        | Max Points | Formula                                    |
|-----------------|-----------|---------------------------------------------|
| Rating Score    | 12 pts    | `min(12, (cfRating / 2000) * 12)`           |
| Contest Activity| 3 pts     | `min(3, (cfContests / 30) * 3)`             |

- cfContests read from: `stats.ratingCount`

**Codeforces Score = Rating Score + Contest Activity Score**

---

### CodeChef (Max 10 Points)
| Component        | Max Points | Formula                                    |
|-----------------|-----------|---------------------------------------------|
| Rating Score    | 8 pts     | `min(8, (ccRating / 2200) * 8)`             |
| Contest Activity| 2 pts     | `min(2, (ccContests / 20) * 2)`             |

- ccContests read from: `stats.contests` (array length or parsed int)

**CodeChef Score = Rating Score + Contest Activity Score**

---

### GeeksforGeeks (Max 10 Points)
| Component      | Max Points | Formula                                      |
|---------------|-----------|-----------------------------------------------|
| Rating/Score  | 6 pts     | `min(6, (gfgRating / 1500) * 6)`              |
| Solved Problems| 4 pts    | `min(4, (gfgSolved / 300) * 4)`               |

- gfgSolved read from: `totalSolved` field on PlatformStats document

**GFG Score = Rating Score + Solved Score**

---

### Overall Problem Solving (Max 15 Points)
Cross-platform weighted unique solved problems:

```
totalWeightedSolved =
  (lcEasy × 1 + lcMedium × 3 + lcHard × 6)   ← LeetCode difficulty-weighted
  + (cfSolved × 3)                              ← Codeforces → treated as Medium
  + (ccSolved × 3)                              ← CodeChef   → treated as Medium
  + (gfgSolved × 1)                             ← GFG        → treated as Easy

overallProblemSolvingScore = min(15, (totalWeightedSolved / 2000) * 15)
```

---

### Overall Contest Activity (Max 5 Points)
Total contests = sum of all platform contest counts

| Contests Count | Points |
|---------------|--------|
| 0             | 0      |
| 1–5           | 1      |
| 6–10          | 2      |
| 11–20         | 3      |
| 21–30         | 4      |
| 31+           | 5      |

---

### Competitive Score Total
```
competitiveScore = lcScore + cfScore + ccScore + gfgScore
                 + overallProblemSolvingScore + overallContestScore
```
**Max = 70 points**

---

## STEP 2 — DEVELOPER SCORE (Max 30 Points)

GitHub data read from PlatformStats where platform = 'github'

| Component     | Max Points | Formula                                      | Data Source                                         |
|--------------|-----------|-----------------------------------------------|-----------------------------------------------------|
| Projects     | 15 pts    | `min(15, repos)`  (1 pt per repo, max 15)     | `totalSolved` OR `stats.metadata.repositoriesCount` |
| Stars        | 5 pts     | `min(5, stars)`   (1 pt per star, max 5)      | `stats.starsNum` OR `stats.stars`                  |
| Contributions| 10 pts    | `min(10, (commits / 300) * 10)`               | `stats.metadata.extra.commitsCount`                 |

```
developerScore = projectScore + starScore + contributionScore
```
**Max = 30 points**

---

## STEP 3 — PROFILE BONUS (Max 5 Points)

| Condition                          | Points |
|-----------------------------------|--------|
| College set (length > 2 chars)    | +2     |
| Bio set (length > 20 chars)       | +3     |

```
profileBonus = collegeBonus + bioBonus
```
**Max = 5 points**

---

## STEP 4 — FINAL SCORE CALCULATION

```
rawScore     = competitiveScore + developerScore + profileBonus
codeyxScore  = min(100, round((rawScore / 105) * 100 * 10) / 10)
```

**Display:** `22.9%` (1 decimal place, capped at 100%)

---

## SORT ORDER (leaderboard ranking)

1. **hasData = true** users ALWAYS ranked above **hasData = false** users
2. Within group: sort by `rating` (Codeyx Score) DESC
3. Tiebreak: `problems` (total solved) DESC
4. Tiebreak: `rawCombinedRating` (sum of all platform ratings) DESC

```
hasData = true  when:
  - At least 1 platform is connected (externalPlatforms.length > 0)
  - AND (totalSolved > 0 OR combinedRating > 0 OR githubHasData)
```

---

## CONTEST LEADERBOARD RATING (Separate field: contestRating, 0–10000)

Weighted normalized contest rating using platform prestige:

| Platform    | Weight | Max Rating Used |
|------------|--------|-----------------|
| Codeforces | 40%    | 3500            |
| LeetCode   | 35%    | 3500            |
| CodeChef   | 15%    | 2500            |
| GFG        | 10%    | 1500            |

```
contestRating = round(
  (cfRating/3500 × 0.40 + lcRating/3500 × 0.35
   + ccRating/2500 × 0.15 + gfgRating/1500 × 0.10) × 10000
)
```

---

## 🔒 CHANGE POLICY

- Any modification to this algorithm requires updating BOTH:
  1. `leaderboard.controller.ts` → `buildUserEntry()` function
  2. This `RANKING_SYSTEM.md` file
- Denominators (2200, 2000, 1500, 300, etc.) are FIXED — do not change without re-analysis
- The 105-point max is FIXED — adding new components requires increasing this number
