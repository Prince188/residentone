const mongoose = require("mongoose");
const { connectDatabase } = require("../config/database");
const { ACCOUNT_ROLES } = require("../shared/types");

async function migrateUserRoleToArray() {
  await connectDatabase();

  const users = mongoose.connection.db.collection("users");
  const cursor = users.find({ role: { $not: { $type: "array" } } });
  let migrated = 0;
  let skipped = 0;

  for await (const user of cursor) {
    if (user.role === undefined || user.role === null) {
      await users.updateOne({ _id: user._id }, { $set: { role: ["resident"] } });
      migrated += 1;
      continue;
    }
    const role = String(user.role);
    if (!ACCOUNT_ROLES.includes(role)) {
      console.warn(`Skipping ${user.email}: unknown role "${role}"`);
      skipped += 1;
      continue;
    }
    await users.updateOne({ _id: user._id }, { $set: { role: [role] } });
    migrated += 1;
  }

  console.log(`Migrated ${migrated} user(s). Skipped ${skipped}.`);
  await mongoose.disconnect();
}

migrateUserRoleToArray().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
