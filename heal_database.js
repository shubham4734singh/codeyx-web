const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

// Helper to convert problem title to LeetCode slug
function slugifyLeetcode(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')          // replace spaces with hyphens
    .replace(/-+/g, '-');          // remove consecutive hyphens
}

// Helper to extract GFG slug from raw link
function extractGfgSlug(link) {
  if (!link || !link.includes('geeksforgeeks.org')) return null;
  try {
    const url = new URL(link);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // GFG URLs are typically geeksforgeeks.org/problems/slug/1 or geeksforgeeks.org/slug
    const probIndex = pathParts.indexOf('problems');
    if (probIndex !== -1 && pathParts[probIndex + 1]) {
      return pathParts[probIndex + 1] + '/';
    }
    return pathParts[pathParts.length - 1] + '/';
  } catch {
    return null;
  }
}

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  const masterCol = db.collection('masterproblems');
  const patProbCol = db.collection('patternproblems');

  console.log('🔍 Healing MasterProblems platform links...');

  // Get all active master problems
  const probs = await masterCol.find({ active: true }).toArray();
  console.log(`Found ${probs.length} active problems in database.`);

  let leetHealed = 0;
  let gfgHealed = 0;

  for (const p of probs) {
    let updateFields = {};

    // 1. Heal LeetCode link
    // If it's a LeetCode platform problem and links.leetcode is empty/missing
    const currentLc = p.links?.leetcode || '';
    if ((p.platform?.toLowerCase() === 'leetcode' || !p.platform) && !currentLc) {
      const generatedSlug = slugifyLeetcode(p.title);
      updateFields['links.leetcode'] = generatedSlug;
      leetHealed++;
    }

    // 2. Heal GFG link
    // If the top-level link is GFG and links.geeksforgeeks or links.gfg is empty/missing
    const currentGfg = p.links?.geeksforgeeks || p.links?.gfg || '';
    if (p.link?.includes('geeksforgeeks.org') && !currentGfg) {
      const gfgSlug = extractGfgSlug(p.link);
      if (gfgSlug) {
        updateFields['links.geeksforgeeks'] = gfgSlug;
        updateFields['links.gfg'] = gfgSlug;
        gfgHealed++;
      }
    }

    // Apply updates if any
    if (Object.keys(updateFields).length > 0) {
      // Ensure the 'links' object exists
      await masterCol.updateOne(
        { _id: p._id },
        { $set: updateFields }
      );
    }
  }

  console.log(`\n🎉 Healing Results:`);
  console.log(`- LeetCode slugs auto-generated and healed: ${leetHealed}`);
  console.log(`- GFG slugs extracted and healed: ${gfgHealed}`);

  // 3. Re-sync patterns to keep only valid LC/GFG problems in patterns
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
    console.log(`🧹 Removed ${deleteRes.deletedCount} pattern mappings that are not on LeetCode/GFG.`);
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
