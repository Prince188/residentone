const mongoose = require("mongoose");

function tenantPlugin(schema) {
  schema.add({
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      index: true,
    },
  });

  const autoFilter = async function () {
    if (this.getFilter && !this.getFilter().societyId && !this._skipTenantFilter) {
      this.where({ societyId: { $exists: true, $ne: null } });
    }
  };

  schema.pre("find", autoFilter);
  schema.pre("findOne", autoFilter);
  schema.pre("findOneAndUpdate", autoFilter);
  schema.pre("findOneAndDelete", autoFilter);
  schema.pre("countDocuments", autoFilter);
  schema.pre("aggregate", async function () {
    const firstStage = this.pipeline()[0];
    if (!firstStage?.$match?.societyId) {
      this.pipeline().unshift({
        $match: { societyId: { $exists: true, $ne: null } },
      });
    }
  });
}

module.exports = { tenantPlugin };
