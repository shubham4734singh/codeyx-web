const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const masterCol = db.collection('masterproblems');

  // Find all problems where links.leetcode contains a slash '/' or matches the GFG slug
  const probs = await masterCol.find({
    active: true,
    $and: [
      { 'links.leetcode': { $exists: true, $ne: '' } }
    ]
  }).toArray();

  console.log(`Checking ${probs.length} active problems with LeetCode links...`);

  let countWithSlash = 0;
  let countMatchingGfg = 0;
  const list = [];

  for (const p of probs) {
    const lc = p.links?.leetcode || '';
    const gfg = p.links?.geeksforgeeks || p.links?.gfg || '';

    const hasSlash = lc.includes('/');
    const matchesGfg = lc.toLowerCase().replace(/\/$/, '') === gfg.toLowerCase().replace(/\/$/, '');

    if (hasSlash || matchesGfg) {
      if (hasSlash) countWithSlash++;
      if (matchesGfg) countMatchingGfg++;
      list.push({
        id: p.problemId,
        title: p.title,
        lc,
        gfg,
        hasSlash,
        matchesGfg
      });
    }
  }

  console.log(`\nFound ${list.length} suspect problems:`);
  console.log(`- Contains slash in LeetCode field: ${countWithSlash}`);
  console.log(`- Matches GFG slug exactly: ${countMatchingGfg}`);

  list.slice(0, 20).forEach(x => {
    console.log(`- ID: ${x.id} | Title: "${x.title}"`);
    console.log(`  LC: "${x.lc}"`);
    console.log(`  GFG: "${x.gfg}"`);
    console.log('------------------------------------');
  });

  await mongoose.disconnect();
}
main();
