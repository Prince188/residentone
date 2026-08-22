const mongoose = require("mongoose");
const { connectDatabase } = require("../config/database");
const { User } = require("../modules/user/user.model");
const { Society } = require("../modules/society/society.model");
const { Unit } = require("../modules/unit/unit.model");
const { Membership } = require("../modules/membership/membership.model");

const DEMO_EMAIL = "rahul@example.com";
const ADMIN_EMAIL = "admin@residentone.com";

async function seed() {
  await connectDatabase();

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: "Rahul Sharma",
      email: DEMO_EMAIL,
      phone: "+919800000001",
      passwordHash: "Password@123",
    });
  }

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: "ResidentOne Admin",
      email: ADMIN_EMAIL,
      phone: "+919800000000",
      passwordHash: "Password@123",
      role: "super_admin",
    });
    console.log(`Seeded super admin: ${ADMIN_EMAIL} / Password@123`);
  }

  const societySpecs = [
    {
      name: "Green Valley Residency",
      address: "12 Green Valley Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      unit: { propertyType: "flat", label: "Flat A-204", block: "A", floor: "2", doorNo: "204" },
    },
    {
      name: "Sunrise Heights",
      address: "45 Sunrise Lane",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411002",
      unit: { propertyType: "row_house", label: "Row House R-12", block: null, floor: null, doorNo: "R-12" },
    },
    {
      name: "Royal Enclave",
      address: "8 Royal Enclave Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      unit: { propertyType: "flat", label: "Flat B-301", block: "B", floor: "3", doorNo: "301" },
    },
  ];

  for (const spec of societySpecs) {
    let society = await Society.findOne({ name: spec.name });
    if (!society) {
      society = await Society.create({
        ...spec,
        status: "active",
        source: "manual",
      });
    } else if (!society.status || society.status !== "active") {
      society.status = "active";
      society.source = society.source || "manual";
      await society.save();
    }

    let unit = await Unit.findOne({ societyId: society._id, label: spec.unit.label });
    if (!unit) {
      unit = await Unit.create({ ...spec.unit, societyId: society._id });
    }

    const membership = await Membership.findOneAndUpdate(
      { userId: user._id, societyId: society._id },
      { role: "owner", isActive: true, $addToSet: { units: unit._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Seeded: ${society.name} -> ${unit.label} (membership ${membership._id})`);
  }

  const pendingSpec = {
    name: "Green Valley CHS",
    societyType: "apartment",
    address: "7 Green Valley Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
    totalUnits: 120,
    contactPersonName: "Priya Deshmukh",
    contactPhone: "+919812345678",
    contactEmail: "priya@greenvalleychs.in",
  };

  let pendingSociety = await Society.findOne({ name: pendingSpec.name, status: "pending" });
  if (!pendingSociety) {
    pendingSociety = await Society.create({
      ...pendingSpec,
      status: "pending",
      source: "public_registration",
    });
    console.log(`Seeded pending registration: ${pendingSociety.name} (${pendingSociety._id})`);
  }

  await mongoose.disconnect();
  console.log("Seed complete. Login with rahul@example.com / Password@123");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
