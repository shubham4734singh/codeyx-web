const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  const masterCol = db.collection('masterproblems');

  // Find master problems where leetcode links contain spaces or look like GFG slugs
  const suspected = await masterCol.find({
    active: true,
    $or: [
      { 'links.leetcode': { $regex: /\s/ } }, // contains space
      { 'links.leetcode': { $regex: /[A-Z]/ } }, // contains capital letters
      { 'links.leetcode': { $regex: /_/ } }, // contains underscore
    ]
  }).toArray();

  console.log(`🔍 Found ${suspected.length} master problems with suspected invalid LeetCode links:`);
  
  suspected.forEach(p => {
    console.log(`- ID: ${p.problemId} | Title: "${p.title}" | Platform: ${p.platform}`);
    console.log(`  LeetCode link stored: "${p.links?.leetcode}"`);
    console.log(`  GFG link stored: "${p.links?.geeksforgeeks || p.links?.gfg}"`);
    console.log('----------------------------------------------------');
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
