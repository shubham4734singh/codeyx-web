const mongoose = require('mongoose');
const fs = require('fs');

const URI = 'mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  try {
    await mongoose.connect(URI);
    const db = mongoose.connection.db;

    const catCount = await db.collection('patterncategories').countDocuments({});
    const patCount = await db.collection('patterns').countDocuments({});
    const patProbCount = await db.collection('patternproblems').countDocuments({});

    const result = {
      patternCategories: catCount,
      patterns: patCount,
      patternProblems: patProbCount
    };

    fs.writeFileSync('f:/Codeyx/db_status.json', JSON.stringify(result, null, 2));
    console.log("Wrote DB status to db_status.json:", result);
  } catch (err) {
    console.error(err);
    fs.writeFileSync('f:/Codeyx/db_status.json', JSON.stringify({ error: err.message }));
  } finally {
    await mongoose.disconnect();
  }
}
main();
