const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const col = db.collection('masterproblems');

  const total = await col.countDocuments({ active: true });
  console.log(`Total active masterproblems: ${total}`);

  const catCol = db.collection('patterncategories');
  const catCount = await catCol.countDocuments({});
  console.log(`Total pattern categories: ${catCount}`);

  const patCol = db.collection('patterns');
  const patCount = await patCol.countDocuments({});
  console.log(`Total patterns: ${patCount}`);

  const patProbCol = db.collection('patternproblems');
  const patProbCount = await patProbCol.countDocuments({});
  console.log(`Total pattern problems mappings: ${patProbCount}`);


  // Count problems where links.leetcode has a value
  const lcCount = await col.countDocuments({
    active: true,
    'links.leetcode': { $exists: true, $ne: '' }
  });
  console.log(`LeetCode count: ${lcCount}`);

  // Count problems where links.geeksforgeeks has a value
  const gfgCount = await col.countDocuments({
    active: true,
    $or: [
      { 'links.geeksforgeeks': { $exists: true, $ne: '' } },
      { 'links.gfg': { $exists: true, $ne: '' } }
    ]
  });
  console.log(`GFG count: ${gfgCount}`);

  // Let's print 5 documents that have links.leetcode populated if any
  const sampleLC = await col.find({
    active: true,
    'links.leetcode': { $exists: true, $ne: '' }
  }).limit(5).toArray();

  console.log(`\nSample LeetCode problems found: ${sampleLC.length}`);
  sampleLC.forEach(p => {
    console.log(`- ${p.title} | LeetCode Link: "${p.links?.leetcode}"`);
  });

  await mongoose.disconnect();
}
main();
