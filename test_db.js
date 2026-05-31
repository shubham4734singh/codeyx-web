const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = "mongodb+srv://codeyxAdmin:Ruchika7878@cluster0.bubjmca.mongodb.net/codeyx?retryWrites=true&w=majority&appName=Cluster0";

(async () => {
  let log = "";
  const print = (msg, obj = "") => {
    const line = msg + " " + (obj ? JSON.stringify(obj, null, 2) : "") + "\n";
    log += line;
    console.log(msg, obj);
  };

  try {
    print("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    print("Connected!");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    print("Collections:", collections.map(c => c.name));

    // Count platformstats
    const statsCount = await db.collection('platformstats').countDocuments();
    print("platformstats count:", statsCount);

    const stats = await db.collection('platformstats').find({}).limit(10).toArray();
    print("Sample platformstats:", stats.map(s => ({ userId: s.userId, platform: s.platform, username: s.username })));

    // Count users
    const usersCount = await db.collection('users').countDocuments();
    print("users count:", usersCount);

    const users = await db.collection('users').find({}).limit(10).toArray();
    print("Sample users:", users.map(u => ({ clerkUserId: u.clerkUserId, email: u.email, role: u.role })));

  } catch (err) {
    print("Error:", err.message);
  }

  fs.writeFileSync('db_check_output.txt', log);
  process.exit(0);
})();
