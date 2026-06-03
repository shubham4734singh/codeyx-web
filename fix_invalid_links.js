const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  const masterCol = db.collection('masterproblems');
  const patProbCol = db.collection('patternproblems');

  // 1. Find master problems where LeetCode slug is clearly malformed (contains spaces, backslashes, etc.)
  const cursor = masterCol.find({
    active: true,
    $or: [
      { 'links.leetcode': { $regex: /\s/ } }, // contains space
      { 'links.leetcode': { $regex: /[A-Z]/ } }, // contains uppercase letters (LeetCode slugs are always lowercase)
      { 'links.leetcode': { $regex: /[\\{}[\]]/ } }, // contains brackets or braces
    ]
  });

  const suspected = await cursor.toArray();
  console.log(`\n🔍 Found ${suspected.length} master problems with malformed LeetCode links.`);

  let clearedCount = 0;
  for (const p of suspected) {
    const wrongSlug = p.links?.leetcode || '';
    
    // Clear the invalid LeetCode link
    await masterCol.updateOne(
      { _id: p._id },
      { $set: { 'links.leetcode': '' } }
    );
    clearedCount++;
    console.log(`🧹 Cleared invalid LeetCode link for: "${p.title}" (Was: "${wrongSlug}")`);
  }

  console.log(`\n✅ Cleared ${clearedCount} malformed LeetCode links from masterproblems.`);

  // 2. Now run the patterns cleanup to delete pattern mappings for any problems that no longer have a valid LeetCode or GFG link!
  console.log('\n🧹 Performing clean-up of pattern mappings...');
  const allowedProbs = await masterCol.find({
    active: true,
    $or: [
      { 'links.leetcode': { $exists: true, $ne: '' } },
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg': { $exists: true, $ne: '' } }
    ]
  }, { projection: { problemId: 1 } }).toArray();

  const allowedIds = new Set(allowedProbs.map(p => p.problemId));

  const allPatProbs = await patProbCol.find({}).toArray();
  const toDelete = allPatProbs.filter(pp => !allowedIds.has(pp.masterProblemId));

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(pp => pp._id);
    const deleteRes = await patProbCol.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`🧹 Successfully removed ${deleteRes.deletedCount} pattern problem mappings that had invalid/missing platform links!`);
  } else {
    console.log('✨ All pattern problem mappings are valid and on correct platforms!');
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
