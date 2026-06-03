// Run from: cd f:\Codeyx && node check_problems.js
const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const col = db.collection('masterproblems');
  const patternCol = db.collection('patternproblems');
  const sheetCol = db.collection('sheetproblems');

  const total = await col.countDocuments({ active: true });

  const hasAnyOfThree = await col.countDocuments({
    active: true,
    $or: [
      { 'links.leetcode':      { $exists: true, $ne: '' } },
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg':           { $exists: true, $ne: '' } },
      { 'links.codechef':      { $exists: true, $ne: '' } },
    ]
  });

  const lcCount  = await col.countDocuments({ active: true, 'links.leetcode': { $exists: true, $ne: '' } });
  const gfgCount = await col.countDocuments({ active: true, $or: [
    { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
    { 'links.gfg':           { $exists: true, $ne: '' } },
  ]});
  const ccCount  = await col.countDocuments({ active: true, 'links.codechef': { $exists: true, $ne: '' } });
  const cfCount  = await col.countDocuments({ active: true, 'links.codeforces': { $exists: true, $ne: '' } });

  const allThree = await col.countDocuments({
    active: true,
    'links.leetcode': { $exists: true, $ne: '' },
    $or: [{ 'links.geeksforgeeks': { $exists: true, $ne: '' } }, { 'links.gfg': { $exists: true, $ne: '' } }],
    'links.codechef': { $exists: true, $ne: '' },
  });

  const notOnAny = await col.countDocuments({
    active: true,
    $nor: [
      { 'links.leetcode':      { $exists: true, $ne: '' } },
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg':           { $exists: true, $ne: '' } },
      { 'links.codechef':      { $exists: true, $ne: '' } },
    ]
  });

  const diffBreakdown = await col.aggregate([
    { $match: { active: true, $or: [
      { 'links.leetcode': { $exists: true, $ne: '' } },
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg': { $exists: true, $ne: '' } },
      { 'links.codechef': { $exists: true, $ne: '' } },
    ]}},
    { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const inPatterns = (await patternCol.distinct('masterProblemId')).length;
  const inSheets   = (await sheetCol.distinct('masterProblemId')).length;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       CODEYX DATABASE — PROBLEM COVERAGE REPORT     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n📦  Total Active Problems in DB      : ${total}`);
  console.log(`🔗  Linked to Patterns               : ${inPatterns}`);
  console.log(`📋  Linked to DSA Sheets             : ${inSheets}`);
  console.log(`\n🎯  LeetCode OR GFG OR CodeChef      : ${hasAnyOfThree}  (${((hasAnyOfThree/total)*100).toFixed(1)}%)`);
  console.log(`   ❌  NOT on any of three            : ${notOnAny}  (${((notOnAny/total)*100).toFixed(1)}%)`);
  console.log(`\n📊  Per Platform:`);
  console.log(`   🟡  LeetCode                       : ${lcCount}`);
  console.log(`   🟢  GFG (GeeksforGeeks)            : ${gfgCount}`);
  console.log(`   🟤  CodeChef                       : ${ccCount}`);
  console.log(`   🔵  Codeforces                     : ${cfCount}`);
  console.log(`\n🔗  On ALL THREE (LC + GFG + CC)     : ${allThree}`);
  console.log(`\n📈  Difficulty (LC/GFG/CC problems):`);
  diffBreakdown.forEach(d => {
    const pct = hasAnyOfThree > 0 ? ((d.count/hasAnyOfThree)*100).toFixed(1) : 0;
    console.log(`   ${(d._id||'Unknown').padEnd(10)}: ${String(d.count).padStart(5)}  (${pct}%)`);
  });
  console.log('\n══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
