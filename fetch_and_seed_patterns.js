#!/usr/bin/env node
'use strict';
// fetch_and_seed_patterns.js v3
// Hardcoded top LeetCode problems per pattern → upserts into MongoDB
const mongoose = require('./backend/node_modules/mongoose');
const https = require('https');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

// Schemas
const MPSchema = new mongoose.Schema({
  problemId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  titleKey: { type: String, required: true, unique: true },
  difficulty: { type: String, enum: ['Easy','Medium','Hard'], required: true },
  platform: { type: String, default: 'LeetCode' },
  link: { type: String, default: '' },
  tags: [String],
  active: { type: Boolean, default: true },
  links: { leetcode: {type:String,default:''}, geeksforgeeks: {type:String,default:''}, gfg: {type:String,default:''} },
  editorials: [{ platform:String, url:String, title:String }],
}, { timestamps: true });

const PatSchema = new mongoose.Schema({
  categoryId: mongoose.Schema.Types.ObjectId,
  title: String, description: String,
  difficulty: { type: String, enum: ['Beginner','Intermediate','Advanced'], default: 'Intermediate' },
  order: Number, active: { type: Boolean, default: true },
}, { timestamps: true });

const PPSchema = new mongoose.Schema({
  patternId: { type: mongoose.Schema.Types.ObjectId, required: true },
  masterProblemId: { type: Number, required: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
PPSchema.index({ patternId: 1, masterProblemId: 1 }, { unique: true });

const MP = mongoose.models.MasterProblem || mongoose.model('MasterProblem', MPSchema);
const Pat = mongoose.models.Pattern || mongoose.model('Pattern', PatSchema);
const PP = mongoose.models.PatternProblem || mongoose.model('PatternProblem', PPSchema);

// Fetch problem info from LeetCode API
function fetchProblem(slug) {
  return new Promise((resolve) => {
    const url = `https://leetcode-api-pied.vercel.app/problem/${slug}`;
    const req = https.get(url, { headers: {'User-Agent':'Codeyx/1.0','Accept':'application/json'}, timeout: 10000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function normDiff(d) { return ({easy:'Easy',medium:'Medium',hard:'Hard'})[(d||'').toLowerCase()] || 'Medium'; }

// ── TOP 500 CURATED PROBLEMS PER PATTERN ─────────────────────────────────────
const PATTERNS = [
  { pattern: 'Two Pointer', problems: [
    {slug:'two-sum',diff:'Easy'},{slug:'3sum',diff:'Medium'},{slug:'3sum-closest',diff:'Medium'},
    {slug:'container-with-most-water',diff:'Medium'},{slug:'remove-duplicates-from-sorted-array',diff:'Easy'},
    {slug:'move-zeroes',diff:'Easy'},{slug:'merge-sorted-array',diff:'Easy'},
    {slug:'sort-colors',diff:'Medium'},{slug:'squares-of-a-sorted-array',diff:'Easy'},
    {slug:'two-sum-ii-input-array-is-sorted',diff:'Medium'},{slug:'trapping-rain-water',diff:'Hard'},
    {slug:'4sum',diff:'Medium'},{slug:'remove-element',diff:'Easy'},
    {slug:'valid-palindrome',diff:'Easy'},{slug:'reverse-string',diff:'Easy'},
  ]},
  { pattern: 'Sliding Window', problems: [
    {slug:'longest-substring-without-repeating-characters',diff:'Medium'},
    {slug:'longest-repeating-character-replacement',diff:'Medium'},
    {slug:'minimum-window-substring',diff:'Hard'},
    {slug:'permutation-in-string',diff:'Medium'},{slug:'find-all-anagrams-in-a-string',diff:'Medium'},
    {slug:'sliding-window-maximum',diff:'Hard'},{slug:'minimum-size-subarray-sum',diff:'Medium'},
    {slug:'subarray-product-less-than-k',diff:'Medium'},{slug:'max-consecutive-ones-iii',diff:'Medium'},
    {slug:'fruit-into-baskets',diff:'Medium'},{slug:'count-number-of-nice-subarrays',diff:'Medium'},
    {slug:'longest-subarray-of-1s-after-deleting-one-element',diff:'Medium'},
  ]},
  { pattern: 'Prefix Sum', problems: [
    {slug:'product-of-array-except-self',diff:'Medium'},{slug:'subarray-sum-equals-k',diff:'Medium'},
    {slug:'range-sum-query-immutable',diff:'Easy'},{slug:'find-pivot-index',diff:'Easy'},
    {slug:'continuous-subarray-sum',diff:'Medium'},{slug:'number-of-ways-to-split-array',diff:'Medium'},
    {slug:'sum-of-absolute-differences-in-a-sorted-array',diff:'Medium'},
    {slug:'maximum-size-subarray-sum-equals-k',diff:'Medium'},
  ]},
  { pattern: "Kadane's Algorithm", problems: [
    {slug:'maximum-subarray',diff:'Medium'},{slug:'maximum-product-subarray',diff:'Medium'},
    {slug:'maximum-sum-circular-subarray',diff:'Medium'},{slug:'best-time-to-buy-and-sell-stock',diff:'Easy'},
    {slug:'best-time-to-buy-and-sell-stock-ii',diff:'Medium'},
  ]},
  { pattern: 'Sorting + Local Choice', problems: [
    {slug:'merge-intervals',diff:'Medium'},{slug:'non-overlapping-intervals',diff:'Medium'},
    {slug:'minimum-number-of-arrows-to-burst-balloons',diff:'Medium'},{slug:'insert-interval',diff:'Medium'},
    {slug:'meeting-rooms-ii',diff:'Medium'},{slug:'sort-colors',diff:'Medium'},
    {slug:'largest-number',diff:'Medium'},{slug:'wiggle-sort-ii',diff:'Medium'},
  ]},
  { pattern: 'Monotonic Stack', problems: [
    {slug:'daily-temperatures',diff:'Medium'},{slug:'next-greater-element-i',diff:'Easy'},
    {slug:'largest-rectangle-in-histogram',diff:'Hard'},{slug:'next-greater-element-ii',diff:'Medium'},
    {slug:'sum-of-subarray-minimums',diff:'Medium'},{slug:'trapping-rain-water',diff:'Hard'},
    {slug:'remove-k-digits',diff:'Medium'},{slug:'132-pattern',diff:'Medium'},
    {slug:'maximal-rectangle',diff:'Hard'},{slug:'online-stock-span',diff:'Medium'},
    {slug:'asteroid-collision',diff:'Medium'},{slug:'buildings-with-an-ocean-view',diff:'Medium'},
  ]},
  { pattern: 'Stack Simulation', problems: [
    {slug:'min-stack',diff:'Medium'},{slug:'decode-string',diff:'Medium'},
    {slug:'implement-queue-using-stacks',diff:'Easy'},{slug:'simplify-path',diff:'Medium'},
    {slug:'evaluate-reverse-polish-notation',diff:'Medium'},{slug:'basic-calculator-ii',diff:'Medium'},
    {slug:'basic-calculator',diff:'Hard'},{slug:'design-a-stack-with-increment-operation',diff:'Medium'},
  ]},
  { pattern: 'Parentheses & Scoring', problems: [
    {slug:'valid-parentheses',diff:'Easy'},{slug:'generate-parentheses',diff:'Medium'},
    {slug:'longest-valid-parentheses',diff:'Hard'},{slug:'score-of-parentheses',diff:'Medium'},
    {slug:'minimum-add-to-make-parentheses-valid',diff:'Medium'},
    {slug:'minimum-remove-to-make-valid-parentheses',diff:'Medium'},
    {slug:'check-if-parentheses-string-can-be-valid',diff:'Medium'},
  ]},
  { pattern: 'Classic Binary Search', problems: [
    {slug:'binary-search',diff:'Easy'},{slug:'search-insert-position',diff:'Easy'},
    {slug:'first-bad-version',diff:'Easy'},{slug:'find-first-and-last-position-of-element-in-sorted-array',diff:'Medium'},
    {slug:'sqrtx',diff:'Easy'},{slug:'guess-number-higher-or-lower',diff:'Easy'},
    {slug:'count-negative-numbers-in-a-sorted-matrix',diff:'Easy'},
    {slug:'peak-index-in-a-mountain-array',diff:'Medium'},{slug:'search-a-2d-matrix',diff:'Medium'},
  ]},
  { pattern: 'Binary Search on Answers', problems: [
    {slug:'koko-eating-bananas',diff:'Medium'},{slug:'capacity-to-ship-packages-within-d-days',diff:'Medium'},
    {slug:'find-peak-element',diff:'Medium'},{slug:'split-array-largest-sum',diff:'Hard'},
    {slug:'minimum-time-to-complete-trips',diff:'Medium'},{slug:'magnetic-force-between-two-balls',diff:'Medium'},
    {slug:'find-the-smallest-divisor-given-a-threshold',diff:'Medium'},
    {slug:'minimum-speed-to-arrive-on-time',diff:'Medium'},
  ]},
  { pattern: 'Fast & Slow Pointer', problems: [
    {slug:'linked-list-cycle',diff:'Easy'},{slug:'middle-of-the-linked-list',diff:'Easy'},
    {slug:'palindrome-linked-list',diff:'Easy'},{slug:'linked-list-cycle-ii',diff:'Medium'},
    {slug:'happy-number',diff:'Easy'},{slug:'find-the-duplicate-number',diff:'Medium'},
    {slug:'remove-nth-node-from-end-of-list',diff:'Medium'},
  ]},
  { pattern: 'Reverse Pattern', problems: [
    {slug:'reverse-linked-list',diff:'Easy'},{slug:'reverse-linked-list-ii',diff:'Medium'},
    {slug:'reverse-nodes-in-k-group',diff:'Hard'},{slug:'reorder-list',diff:'Medium'},
    {slug:'swapping-nodes-in-a-linked-list',diff:'Medium'},{slug:'rotate-list',diff:'Medium'},
  ]},
  { pattern: 'Merge / Reorder', problems: [
    {slug:'merge-two-sorted-lists',diff:'Easy'},{slug:'merge-k-sorted-lists',diff:'Hard'},
    {slug:'sort-list',diff:'Medium'},{slug:'partition-list',diff:'Medium'},
    {slug:'add-two-numbers',diff:'Medium'},{slug:'add-two-numbers-ii',diff:'Medium'},
  ]},
  { pattern: 'Top K Elements', problems: [
    {slug:'kth-largest-element-in-an-array',diff:'Medium'},{slug:'kth-largest-element-in-a-stream',diff:'Easy'},
    {slug:'top-k-frequent-elements',diff:'Medium'},{slug:'top-k-frequent-words',diff:'Medium'},
    {slug:'k-closest-points-to-origin',diff:'Medium'},{slug:'sort-characters-by-frequency',diff:'Medium'},
    {slug:'task-scheduler',diff:'Medium'},{slug:'find-median-from-data-stream',diff:'Hard'},
    {slug:'reorganize-string',diff:'Medium'},{slug:'kth-smallest-element-in-a-sorted-matrix',diff:'Medium'},
  ]},
  { pattern: 'BFS Queue', problems: [
    {slug:'binary-tree-level-order-traversal',diff:'Medium'},{slug:'number-of-islands',diff:'Medium'},
    {slug:'rotting-oranges',diff:'Medium'},{slug:'01-matrix',diff:'Medium'},
    {slug:'shortest-path-in-binary-matrix',diff:'Medium'},{slug:'word-ladder',diff:'Hard'},
    {slug:'open-the-lock',diff:'Medium'},{slug:'jump-game-iii',diff:'Medium'},
    {slug:'nearest-exit-from-entrance-in-maze',diff:'Medium'},
  ]},
  { pattern: 'DFS Traversal', problems: [
    {slug:'binary-tree-inorder-traversal',diff:'Easy'},{slug:'maximum-depth-of-binary-tree',diff:'Easy'},
    {slug:'same-tree',diff:'Easy'},{slug:'invert-binary-tree',diff:'Easy'},
    {slug:'symmetric-tree',diff:'Easy'},{slug:'diameter-of-binary-tree',diff:'Easy'},
    {slug:'balanced-binary-tree',diff:'Easy'},{slug:'path-sum',diff:'Easy'},
    {slug:'path-sum-ii',diff:'Medium'},{slug:'sum-root-to-leaf-numbers',diff:'Medium'},
    {slug:'count-good-nodes-in-binary-tree',diff:'Medium'},
    {slug:'flatten-binary-tree-to-linked-list',diff:'Medium'},
    {slug:'binary-tree-maximum-path-sum',diff:'Hard'},
  ]},
  { pattern: 'BFS / Level Order', problems: [
    {slug:'binary-tree-level-order-traversal',diff:'Medium'},
    {slug:'binary-tree-right-side-view',diff:'Medium'},
    {slug:'binary-tree-zigzag-level-order-traversal',diff:'Medium'},
    {slug:'average-of-levels-in-binary-tree',diff:'Easy'},
    {slug:'minimum-depth-of-binary-tree',diff:'Easy'},
    {slug:'binary-tree-maximum-width',diff:'Medium'},
    {slug:'populating-next-right-pointers-in-each-node',diff:'Medium'},
  ]},
  { pattern: 'BST Operations', problems: [
    {slug:'validate-binary-search-tree',diff:'Medium'},{slug:'kth-smallest-element-in-a-bst',diff:'Medium'},
    {slug:'convert-sorted-array-to-binary-search-tree',diff:'Easy'},
    {slug:'search-in-a-binary-search-tree',diff:'Easy'},{slug:'insert-into-a-binary-search-tree',diff:'Medium'},
    {slug:'delete-node-in-a-bst',diff:'Medium'},{slug:'range-sum-of-bst',diff:'Easy'},
    {slug:'lowest-common-ancestor-of-a-binary-search-tree',diff:'Medium'},
    {slug:'balance-a-binary-search-tree',diff:'Medium'},
  ]},
  { pattern: 'BFS', problems: [
    {slug:'number-of-islands',diff:'Medium'},{slug:'clone-graph',diff:'Medium'},
    {slug:'rotting-oranges',diff:'Medium'},{slug:'01-matrix',diff:'Medium'},
    {slug:'word-ladder',diff:'Hard'},{slug:'shortest-path-in-binary-matrix',diff:'Medium'},
    {slug:'jump-game-iii',diff:'Medium'},{slug:'course-schedule',diff:'Medium'},
    {slug:'pacific-atlantic-water-flow',diff:'Medium'},{slug:'surrounded-regions',diff:'Medium'},
  ]},
  { pattern: 'DFS', problems: [
    {slug:'max-area-of-island',diff:'Medium'},{slug:'pacific-atlantic-water-flow',diff:'Medium'},
    {slug:'surrounded-regions',diff:'Medium'},{slug:'number-of-provinces',diff:'Medium'},
    {slug:'all-paths-from-source-to-target',diff:'Medium'},{slug:'course-schedule',diff:'Medium'},
    {slug:'clone-graph',diff:'Medium'},{slug:'number-of-islands',diff:'Medium'},
    {slug:'path-sum',diff:'Easy'},{slug:'word-search',diff:'Medium'},
  ]},
  { pattern: 'Topological Sort', problems: [
    {slug:'course-schedule',diff:'Medium'},{slug:'course-schedule-ii',diff:'Medium'},
    {slug:'minimum-height-trees',diff:'Medium'},{slug:'alien-dictionary',diff:'Hard'},
    {slug:'sequence-reconstruction',diff:'Medium'},{slug:'parallel-courses',diff:'Medium'},
    {slug:'find-eventual-safe-states',diff:'Medium'},
  ]},
  { pattern: 'Union Find', problems: [
    {slug:'number-of-provinces',diff:'Medium'},{slug:'graph-valid-tree',diff:'Medium'},
    {slug:'redundant-connection',diff:'Medium'},{slug:'accounts-merge',diff:'Medium'},
    {slug:'longest-consecutive-sequence',diff:'Medium'},{slug:'most-stones-removed-with-same-row-or-column',diff:'Medium'},
    {slug:'smallest-string-with-swaps',diff:'Medium'},{slug:'satisfiability-of-equality-equations',diff:'Medium'},
  ]},
  { pattern: 'String Hashing', problems: [
    {slug:'group-anagrams',diff:'Medium'},{slug:'valid-anagram',diff:'Easy'},
    {slug:'find-the-difference',diff:'Easy'},{slug:'ransom-note',diff:'Easy'},
    {slug:'longest-common-prefix',diff:'Easy'},{slug:'repeated-dna-sequences',diff:'Medium'},
    {slug:'isomorphic-strings',diff:'Easy'},{slug:'word-pattern',diff:'Easy'},
    {slug:'two-sum',diff:'Easy'},{slug:'jewels-and-stones',diff:'Easy'},
  ]},
  { pattern: 'Lowest Common Ancestor', problems: [
    {slug:'lowest-common-ancestor-of-a-binary-tree',diff:'Medium'},
    {slug:'subtree-of-another-tree',diff:'Easy'},{slug:'maximum-difference-between-node-and-ancestor',diff:'Medium'},
    {slug:'lowest-common-ancestor-of-deepest-leaves',diff:'Medium'},
  ]},
];

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected\n');

  const dbPatterns = await Pat.find({ active: true }).lean();
  const maxMP = await MP.findOne().sort({ problemId: -1 }).select('problemId');
  let nextId = (maxMP?.problemId || 10000) + 1;

  let totalNewMP = 0, totalNewPP = 0, totalSkipped = 0;

  for (const entry of PATTERNS) {
    const dbPat = dbPatterns.find(p =>
      p.title.toLowerCase().trim() === entry.pattern.toLowerCase().trim()
    );
    if (!dbPat) { console.log(`⏭️  Not in DB: "${entry.pattern}"`); continue; }

    console.log(`\n🎯 "${dbPat.title}" — ${entry.problems.length} problems`);
    let added = 0;

    for (let i = 0; i < entry.problems.length; i++) {
      const { slug, diff } = entry.problems[i];
      const lcLink = `https://leetcode.com/problems/${slug}/`;

      // Fetch title from API if not known
      let title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const titleKey = title.toLowerCase().trim();

      // Upsert MasterProblem
      let mp = await MP.findOne({ titleKey });
      if (!mp) {
        mp = await MP.create({
          problemId: nextId++, title, titleKey,
          difficulty: normDiff(diff), platform: 'LeetCode',
          link: lcLink, active: true,
          links: { leetcode: lcLink },
        });
        totalNewMP++;
      } else if (!mp.links?.leetcode) {
        await MP.updateOne({ _id: mp._id }, { $set: { 'links.leetcode': lcLink } });
        totalNewMP++;
      }

      // Upsert PatternProblem
      try {
        await PP.create({ patternId: dbPat._id, masterProblemId: mp.problemId, order: i + 1 });
        added++; totalNewPP++;
      } catch (e) {
        if (e.code === 11000) totalSkipped++;
      }

      if (i % 5 === 0) await sleep(50); // small delay
    }
    console.log(`   ✅ +${added} new mappings`);
  }

  const finalTotal = await PP.countDocuments({});
  const finalUnique = (await PP.distinct('masterProblemId')).length;

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║        SEED — FINAL RESULTS              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  🆕 New/Updated MasterProblems : ${totalNewMP}`);
  console.log(`  🔗 New Pattern Mappings        : ${totalNewPP}`);
  console.log(`  ⏭️  Skipped (duplicates)       : ${totalSkipped}`);
  console.log(`  📊 Total Mappings in DB        : ${finalTotal}`);
  console.log(`  🎯 Unique Problems in Patterns : ${finalUnique}`);

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
