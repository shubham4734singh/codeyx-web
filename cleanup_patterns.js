const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  const masterCol = db.collection('masterproblems');
  const patProbCol = db.collection('patternproblems');

  // Find all active master problems that have LeetCode or GFG links
  const allowedProbs = await masterCol.find({
    active: true,
    $or: [
      { 'links.leetcode': { $exists: true, $ne: '' } },
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg': { $exists: true, $ne: '' } }
    ]
  }, { projection: { problemId: 1 } }).toArray();

  const allowedIds = new Set(allowedProbs.map(p => p.problemId));
  console.log(`🎯 Allowed unique problemIds (LC or GFG): ${allowedIds.size}`);

  // Find all pattern problems currently linked
  const allPatProbs = await patProbCol.find({}).toArray();
  console.log(`📋 Total pattern problems currently in DB: ${allPatProbs.length}`);

  // Find which ones are NOT allowed (not on LeetCode or GFG)
  const notAllowed = allPatProbs.filter(pp => !allowedIds.has(pp.masterProblemId));
  console.log(`🚨 Pattern problems not on LeetCode or GFG: ${notAllowed.length}`);

  if (notAllowed.length > 0) {
    const idsToDelete = notAllowed.map(pp => pp._id);
    const deleteRes = await patProbCol.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`🧹 Successfully deleted ${deleteRes.deletedCount} pattern problems that are NOT on LeetCode or GFG!`);
  } else {
    console.log('✨ All pattern problems are already on LeetCode or GFG!');
  }

  // Count final total mappings
  const finalCount = await patProbCol.countDocuments({});
  const finalUnique = (await patProbCol.distinct('masterProblemId')).length;
  console.log(`\n🎉 Final Pattern Problems Mappings: ${finalCount}`);
  console.log(`🎉 Final Unique Problems in Patterns: ${finalUnique}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
