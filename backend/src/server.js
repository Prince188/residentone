const mongoose = require("mongoose");
const socketHelper = require("./socket");

// Centralized real-time update triggers for all models
mongoose.plugin((schema) => {
  schema.post("save", function (doc) {
    if (doc && doc.societyId) {
      const modelName = doc.constructor && doc.constructor.modelName;
      if (modelName) {
        socketHelper.emitToSociety(String(doc.societyId), `${modelName.toLowerCase()}:change`, {
          id: doc._id,
          action: "save",
        });
      }
    }
  });

  schema.post("findOneAndUpdate", function (doc) {
    if (doc && doc.societyId) {
      const modelName = (this.model && this.model.modelName) || (doc.constructor && doc.constructor.modelName);
      if (modelName) {
        socketHelper.emitToSociety(String(doc.societyId), `${modelName.toLowerCase()}:change`, {
          id: doc._id,
          action: "save",
        });
      }
    }
  });
});

const http = require("http");
const app = require("./app");
const { config } = require("./config");
const { connectDatabase } = require("./config/database");
const { initSocket } = require("./socket");
const logger = require("./config/logger");

async function cleanupOrphanedUnitReferences() {
  try {
    const { Unit } = require("./modules/unit/unit.model");
    const { User } = require("./modules/user/user.model");

    const unitsWithResidents = await Unit.find({
      $or: [{ ownerId: { $ne: null } }, { tenantId: { $ne: null } }],
    })
      .select("_id ownerId tenantId")
      .lean();

    if (!unitsWithResidents.length) return;

    const candidateIds = new Set();
    unitsWithResidents.forEach((u) => {
      if (u.ownerId) candidateIds.add(String(u.ownerId));
      if (u.tenantId) candidateIds.add(String(u.tenantId));
    });

    const existingUsers = await User.find({ _id: { $in: Array.from(candidateIds) } })
      .select("_id")
      .lean();
    const existingUserSet = new Set(existingUsers.map((u) => String(u._id)));

    const orphanedOwnerUnits = [];
    const orphanedTenantUnits = [];

    unitsWithResidents.forEach((u) => {
      if (u.ownerId && !existingUserSet.has(String(u.ownerId))) {
        orphanedOwnerUnits.push(u._id);
      }
      if (u.tenantId && !existingUserSet.has(String(u.tenantId))) {
        orphanedTenantUnits.push(u._id);
      }
    });

    if (orphanedOwnerUnits.length > 0) {
      await Unit.updateMany({ _id: { $in: orphanedOwnerUnits } }, { $set: { ownerId: null } });
      logger.info(`[Auto-heal] Cleaned up ${orphanedOwnerUnits.length} orphaned unit owner references`);
    }
    if (orphanedTenantUnits.length > 0) {
      await Unit.updateMany({ _id: { $in: orphanedTenantUnits } }, { $set: { tenantId: null } });
      logger.info(`[Auto-heal] Cleaned up ${orphanedTenantUnits.length} orphaned unit tenant references`);
    }
  } catch (err) {
    logger.error("Failed to run orphaned unit cleanup:", err);
  }
}

async function startServer() {
  await connectDatabase();
  await cleanupOrphanedUnitReferences();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    logger.info(`ResidentOne API running on port ${config.port}`);
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
