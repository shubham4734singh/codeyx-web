const mongoose = require('./backend/node_modules/mongoose');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  
  // List all collections
  const collections = await db.listCollections().toArray();
  console.log('Collections in database:', collections.map(c => c.name));

  const masterCol = db.collection('masterproblems');
  const patProbCol = db.collection('patternproblems');

  // Count raw documents
  const totalRaw = await masterCol.countDocuments({});
  const totalActive = await masterCol.countDocuments({ active: true });
  console.log(`Total problems in 'masterproblems': ${totalRaw} (Active: ${totalActive})`);

  const hasLeetcode = await masterCol.countDocuments({
    'links.leetcode': { $exists: true, $ne: '' }
  });
  console.log(`Problems with 'links.leetcode' not empty: ${hasLeetcode}`);

  const sample = await masterCol.findOne({ 'links.leetcode': { $exists: true, $ne: '' } });
  if (sample) {
    console.log('Sample problem links:', JSON.stringify(sample.links, null, 2));
  } else {
    console.log('No problem with links.leetcode found! Let\'s print a raw sample:');
    const rawSample = await masterCol.findOne({});
    console.log('Raw sample:', JSON.stringify(rawSample, null, 2));
  }

  const finalCount = await patProbCol.countDocuments({});
  console.log(`Total pattern problems currently: ${finalCount}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
});
