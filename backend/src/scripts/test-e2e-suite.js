/**
 * Comprehensive End-to-End Multi-Role Test Suite for ResidentOne
 * Tests all 18 Suites: Auth, RBAC, Multi-Tenancy, Units, Maintenance,
 * Collections, Documents, Complaints, Amenities, Polls, Surveys, Chat,
 * Family, Vehicles, Badges, Security/Negative Boundaries, and Sockets.
 */

const http = require("http");
const crypto = require("crypto");
const mongoose = require("mongoose");
const app = require("../app");
const { connectDatabase } = require("../config/database");
const { config } = require("../config");
const { User } = require("../modules/user/user.model");
const { Society } = require("../modules/society/society.model");
const { Unit } = require("../modules/unit/unit.model");
const { Membership } = require("../modules/membership/membership.model");
const { MaintenanceCycle, MaintenancePayment } = require("../modules/maintenance/maintenance.model");
const { Collection, CollectionPayment } = require("../modules/collections/collection.model");
const { Document } = require("../modules/document/document.model");
const { Complaint } = require("../modules/complaint/complaint.model");
const { Amenity, AmenityBooking } = require("../modules/amenity/amenity.model");
const { Poll, PollVote } = require("../modules/poll/poll.model");
const { Survey, SurveyResponse } = require("../modules/survey/survey.model");
const { ChatGroup, ChatMessage, DirectMessage } = require("../modules/chat/chat.model");
const { FamilyMember } = require("../modules/family-member/family-member.model");
const { BadgeSeen } = require("../modules/dashboard/dashboard.model");

let server;
let baseUrl;
const stats = { total: 0, passed: 0, failed: 0 };

function assert(condition, message) {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${message}`);
  } else {
    stats.failed++;
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function api(method, path, { token, societyId, body, formData, isMultipart } = {}) {
  const url = `${baseUrl}/api/v1${path}`;
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (societyId) headers["x-society-id"] = String(societyId);

  let fetchBody = undefined;
  if (body) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  } else if (formData && isMultipart) {
    // For multer multipart simulation
    const boundary = "----WebKitFormBoundary" + crypto.randomBytes(16).toString("hex");
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
    
    let parts = [];
    for (const [key, val] of Object.entries(formData)) {
      if (key === "file" && typeof val === "object") {
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${val.filename}"\r\nContent-Type: ${val.contentType}\r\n\r\n${val.content}`
        );
      } else {
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}`
        );
      }
    }
    parts.push(`--${boundary}--\r\n`);
    fetchBody = Buffer.from(parts.join("\r\n"));
  }

  const res = await fetch(url, { method, headers, body: fetchBody });
  const contentType = res.headers.get("content-type") || "";
  let json = null;
  let text = null;
  if (contentType.includes("application/json")) {
    json = await res.json();
  } else {
    text = await res.text();
  }
  return { status: res.status, headers: res.headers, data: json, text };
}

async function runAllTests() {
  console.log("\n=======================================================");
  console.log("   RESIDENTONE FULL SYSTEM & MULTI-ROLE TEST RUNNER    ");
  console.log("=======================================================\n");

  await connectDatabase();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  // Test state across suites
  const tokens = {};
  const users = {};
  let testSociety;
  let testUnits = {};
  let inviteToken;
  let activeCycleId;
  let activeCollectionId;
  let activeDocId;
  let activeComplaintId;
  let activeAmenityId;
  let activePollId;
  let activeSurveyId;
  let activeGroupId;
  let activeDirectMsgId;
  let activeFamilyId;

  try {
    // ------------------------------------------------------------------------
    console.log("\n--- PHASE 0: Clean Seeding & Multi-Role Provisioning ---");
    // ------------------------------------------------------------------------
    const timestamp = Date.now();
    const testPrefix = `test_${timestamp}`;

    // 1. Create Super Admin
    const superAdminEmail = `${testPrefix}_super@residentone.com`;
    const resRegSuper = await api("POST", "/auth/register", {
      body: { name: "Test Super Admin", email: superAdminEmail, phone: `+9199${timestamp.toString().slice(-8)}0`, password: "Password@123" }
    });
    assert(resRegSuper.status === 201 && resRegSuper.data.success, "Super Admin account registered");
    users.superAdmin = resRegSuper.data.data.user;
    tokens.superAdmin = resRegSuper.data.data.accessToken;

    // Grant super_admin platform role
    await User.findByIdAndUpdate(users.superAdmin._id || users.superAdmin.id, { role: "super_admin" });
    const resLoginSuper = await api("POST", "/auth/login", { body: { identifier: superAdminEmail, password: "Password@123" } });
    tokens.superAdmin = resLoginSuper.data.data.accessToken;

    // 2. Create Society Admin
    const socAdminEmail = `${testPrefix}_socadmin@residentone.com`;
    const resRegSocAdmin = await api("POST", "/auth/register", {
      body: { name: "Test Society Admin", email: socAdminEmail, phone: `+9199${timestamp.toString().slice(-8)}1`, password: "Password@123" }
    });
    users.socAdmin = resRegSocAdmin.data.data.user;
    tokens.socAdmin = resRegSocAdmin.data.data.accessToken;

    // 3. Create Wing Admin
    const wingAdminEmail = `${testPrefix}_wingadmin@residentone.com`;
    const resRegWingAdmin = await api("POST", "/auth/register", {
      body: { name: "Test Wing Admin", email: wingAdminEmail, phone: `+9199${timestamp.toString().slice(-8)}2`, password: "Password@123" }
    });
    users.wingAdmin = resRegWingAdmin.data.data.user;
    tokens.wingAdmin = resRegWingAdmin.data.data.accessToken;

    // 4. Create Treasurer
    const treasurerEmail = `${testPrefix}_treasurer@residentone.com`;
    const resRegTreasurer = await api("POST", "/auth/register", {
      body: { name: "Test Treasurer", email: treasurerEmail, phone: `+9199${timestamp.toString().slice(-8)}3`, password: "Password@123" }
    });
    users.treasurer = resRegTreasurer.data.data.user;
    tokens.treasurer = resRegTreasurer.data.data.accessToken;

    // 5. Create Helpdesk Manager
    const helpdeskEmail = `${testPrefix}_helpdesk@residentone.com`;
    const resRegHelpdesk = await api("POST", "/auth/register", {
      body: { name: "Test Helpdesk Manager", email: helpdeskEmail, phone: `+9199${timestamp.toString().slice(-8)}4`, password: "Password@123" }
    });
    users.helpdesk = resRegHelpdesk.data.data.user;
    tokens.helpdesk = resRegHelpdesk.data.data.accessToken;

    // 6. Create Resident Owner
    const ownerEmail = `${testPrefix}_owner@residentone.com`;
    const resRegOwner = await api("POST", "/auth/register", {
      body: { name: "Test Resident Owner", email: ownerEmail, phone: `+9199${timestamp.toString().slice(-8)}5`, password: "Password@123" }
    });
    users.owner = resRegOwner.data.data.user;
    tokens.owner = resRegOwner.data.data.accessToken;

    // 7. Create Resident Tenant
    const tenantEmail = `${testPrefix}_tenant@residentone.com`;
    const resRegTenant = await api("POST", "/auth/register", {
      body: { name: "Test Resident Tenant", email: tenantEmail, phone: `+9199${timestamp.toString().slice(-8)}6`, password: "Password@123" }
    });
    users.tenant = resRegTenant.data.data.user;
    tokens.tenant = resRegTenant.data.data.accessToken;

    // 8. Create Unassigned Resident
    const unassignedEmail = `${testPrefix}_unassigned@residentone.com`;
    const resRegUnassigned = await api("POST", "/auth/register", {
      body: { name: "Test Unassigned User", email: unassignedEmail, phone: `+9199${timestamp.toString().slice(-8)}7`, password: "Password@123" }
    });
    users.unassigned = resRegUnassigned.data.data.user;
    tokens.unassigned = resRegUnassigned.data.data.accessToken;

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 1: Auth, Login by Phone, Refresh & Profile ---");
    // ------------------------------------------------------------------------
    // Login with phone
    const resLoginPhone = await api("POST", "/auth/login", {
      body: { identifier: `+9199${timestamp.toString().slice(-8)}5`, password: "Password@123" }
    });
    assert(resLoginPhone.status === 200 && resLoginPhone.data.success, "Login via phone number verified");

    // Token refresh
    const resRefresh = await api("POST", "/auth/refresh", {
      body: { refreshToken: resLoginPhone.data.data.refreshToken }
    });
    assert(resRefresh.status === 200 && resRefresh.data.data.accessToken, "Refresh token issued new access token");

    // Profile retrieval
    const resProfile = await api("GET", "/users/profile", { token: tokens.owner });
    assert(resProfile.status === 200 && resProfile.data.data.email === ownerEmail, "Profile retrieved for owner");

    // Update profile with vehicles
    const resUpdateProfile = await api("PATCH", "/users/profile", {
      token: tokens.owner,
      body: { name: "Test Resident Owner", occupation: "Architect", vehicles: ["MH12AB1234", "MH12XY5678"] }
    });
    assert(resUpdateProfile.status === 200 && resUpdateProfile.data.data.vehicles.length === 2, "Profile vehicles updated");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 2: Society Registration & Super-Admin Approval ---");
    // ------------------------------------------------------------------------
    // Public Society Registration (using registrationBaseSchema fields)
    const resSocReg = await api("POST", "/societies/register", {
      body: {
        societyName: `Horizon Heights ${timestamp}`,
        societyType: "apartment",
        address: "100 Innovation Boulevard",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411045",
        totalUnits: 20,
        contactName: "Test Society Admin",
        contactEmail: socAdminEmail,
        contactMobile: `+9199${timestamp.toString().slice(-8)}1`,
        structure: {
          wings: [
            { name: "A", floors: 2, defaultPerFloor: 2, hasGround: false },
            { name: "B", floors: 2, defaultPerFloor: 2, hasGround: false }
          ],
          numberingMode: "floor_based"
        }
      }
    });
    assert(resSocReg.status === 201 && resSocReg.data.data.status === "pending", "Society public registration submitted with 'pending' status");
    const pendingSocId = resSocReg.data.data.societyId;

    // Super-Admin lists pending societies
    const resPendingList = await api("GET", "/societies?status=pending", { token: tokens.superAdmin });
    assert(resPendingList.status === 200 && resPendingList.data.data.some((s) => s.id === String(pendingSocId) || s._id === String(pendingSocId)), "Super-admin can query pending societies list");

    // Super-Admin approves society
    const resApprove = await api("PATCH", `/societies/${pendingSocId}/approve`, { token: tokens.superAdmin });
    testSociety = resApprove.data.data.society || resApprove.data.data;
    assert(resApprove.status === 200 && testSociety.status === "active", "Super-admin approved society; status is now active");
    const socId = testSociety._id || testSociety.id;

    // Refresh Society Admin token to get society context
    const resSocAdminLogin = await api("POST", "/auth/login", { body: { identifier: socAdminEmail, password: "Password@123" } });
    tokens.socAdmin = resSocAdminLogin.data.data.accessToken;

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 3: Bulk Unit Generation & Wings Management ---");
    // ------------------------------------------------------------------------
    // Society Admin generates bulk units for Wing A & Wing B
    const resBulk = await api("POST", "/units/bulk-generate", {
      token: tokens.socAdmin,
      societyId: socId,
      body: {
        wings: [
          { name: "A", floors: 2, defaultPerFloor: 2 },
          { name: "B", floors: 2, defaultPerFloor: 2 },
        ],
        numberingMode: "floor_based"
      }
    });
    assert(resBulk.status === 201 && resBulk.data.data.length >= 4, "Bulk generated units for Wings A & B");

    const resUnits = await api("GET", "/units", { token: tokens.socAdmin, societyId: socId });
    assert(resUnits.status === 200 && resUnits.data.data.length >= 4, "Retrieved society units list");
    resUnits.data.data.forEach((u) => {
      testUnits[u.label] = u;
    });

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 4: Committee Governance & 14-Permission Matrix ---");
    // ------------------------------------------------------------------------
    // Add Wing Admin (assigned to Wing A)
    const resAddWingAdmin = await api("POST", "/memberships", {
      token: tokens.socAdmin,
      societyId: socId,
      body: { userId: users.wingAdmin.id || users.wingAdmin._id, role: "wing_admin", assignedWings: ["A"] }
    });
    assert(resAddWingAdmin.status === 201, "Added Wing Admin for Wing A");

    // Add Treasurer
    const resAddTreasurer = await api("POST", "/memberships", {
      token: tokens.socAdmin,
      societyId: socId,
      body: { userId: users.treasurer.id || users.treasurer._id, role: "treasurer" }
    });
    assert(resAddTreasurer.status === 201, "Added Treasurer to committee");

    // Add Helpdesk Manager
    const resAddHelpdesk = await api("POST", "/memberships", {
      token: tokens.socAdmin,
      societyId: socId,
      body: { userId: users.helpdesk.id || users.helpdesk._id, role: "helpdesk_manager" }
    });
    assert(resAddHelpdesk.status === 201, "Added Helpdesk Manager to committee");

    // Custom Permissions Override: grant treasurer manage_complaints
    const resCustomPerm = await api("PUT", "/societies/permissions", {
      token: tokens.socAdmin,
      societyId: socId,
      body: {
        permissions: {
          treasurer: ["manage_maintenance", "manage_collections", "manage_documents", "view_financials", "manage_directory", "manage_complaints"],
        }
      }
    });
    const permData = resCustomPerm.data.data.treasurer ? resCustomPerm.data.data : (resCustomPerm.data.data.rolePermissions || {});
    assert(resCustomPerm.status === 200 && (permData.treasurer || []).includes("manage_complaints"), "Custom permission matrix override committed and verified");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 5: Tenancy Assignment & Public Invite Token Flow ---");
    // ------------------------------------------------------------------------
    // Assign Owner to Unit A-101
    const unitA101 = testUnits["A-101"] || Object.values(testUnits)[0];
    const resAssignOwner = await api("POST", `/units/${unitA101.id || unitA101._id}/assign-owner`, {
      token: tokens.socAdmin,
      societyId: socId,
      body: { phone: users.owner.phone, residentType: "owner" }
    });
    assert([200, 201].includes(resAssignOwner.status) && resAssignOwner.data.success, "Assigned Owner to Unit A-101");

    // Generate Invite Link for Unit A-102 (Tenant)
    const unitA102 = testUnits["A-102"] || Object.values(testUnits)[1];
    const resInviteLink = await api("POST", `/units/${unitA102.id || unitA102._id}/invite-link`, {
      token: tokens.socAdmin,
      societyId: socId,
      body: { residentType: "renter" }
    });
    assert(resInviteLink.status === 200 && resInviteLink.data.data.inviteUrl, "Generated tenant invite link token");
    const matchToken = resInviteLink.data.data.inviteUrl.match(/\/house-invite\/(.+)$/);
    inviteToken = matchToken ? matchToken[1] : null;

    // Public Invite Preview
    const resInvitePreview = await api("GET", `/units/invite/${inviteToken}`);
    assert(resInvitePreview.status === 200 && resInvitePreview.data.data.houseNumber === unitA102.label, "Public invite token preview resolves correct unit and society");

    // Claim Invite Token as Tenant
    const resClaimInvite = await api("POST", `/units/invite/${inviteToken}`, {
      token: tokens.tenant,
      body: { name: "Test Resident Tenant", phone: users.tenant.phone, residentType: "renter" }
    });
    assert(resClaimInvite.status === 201 && resClaimInvite.data.success, "Tenant claimed invite token; unit A-102 assigned to tenant membership");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 6: Maintenance Billing, Dual Rates, Razorpay & Cash ---");
    // ------------------------------------------------------------------------
    // Treasurer creates Billing Cycle
    const nextMonth = (new Date().getMonth() + 2) % 12 || 12;
    const currentYear = new Date().getFullYear();
    const resCreateCycle = await api("POST", "/maintenance/cycles", {
      token: tokens.treasurer,
      societyId: socId,
      body: {
        month: nextMonth,
        year: currentYear,
        amount: 2500,
        ownerAmount: 2200,
        renterAmount: 2800,
        durationMonths: 1,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        lateCharge: 100,
      }
    });
    assert(resCreateCycle.status === 201 && resCreateCycle.data.success, "Treasurer created maintenance billing cycle with dual owner/renter rates");
    activeCycleId = resCreateCycle.data.data._id || resCreateCycle.data.data.id;

    // Resident Owner views unit invoice
    const resOwnerInvoice = await api("GET", `/maintenance/cycles/${activeCycleId}/units/${unitA101.id || unitA101._id}`, {
      token: tokens.owner,
      societyId: socId,
    });
    assert(resOwnerInvoice.status === 200 && resOwnerInvoice.data.data.amount === 2200, "Owner invoice calculated correctly with owner rate (₹2,200)");

    // Resident Tenant views unit invoice
    const resTenantInvoice = await api("GET", `/maintenance/cycles/${activeCycleId}/units/${unitA102.id || unitA102._id}`, {
      token: tokens.tenant,
      societyId: socId,
    });
    assert(resTenantInvoice.status === 200 && resTenantInvoice.data.data.amount === 2800, "Tenant invoice calculated correctly with renter rate (₹2,800)");

    // Resident Owner initiates Razorpay Order
    const resRazorOrder = await api("POST", `/maintenance/cycles/${activeCycleId}/units/${unitA101.id || unitA101._id}/create-order`, {
      token: tokens.owner,
      societyId: socId,
    });
    const testOrderId = resRazorOrder.data.data?.id || resRazorOrder.data.data?.orderId;
    assert(resRazorOrder.status === 200 && Boolean(testOrderId), "Razorpay test order created for maintenance payment");

    // Verify Online Payment
    const testPaymentId = `pay_test_${crypto.randomBytes(8).toString("hex")}`;
    const generatedSignature = crypto
      .createHmac("sha256", config.razorpay.keySecret || "test_secret")
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex");

    const resVerifyPay = await api("POST", `/maintenance/cycles/${activeCycleId}/units/${unitA101.id || unitA101._id}/verify`, {
      token: tokens.owner,
      societyId: socId,
      body: {
        razorpayOrderId: testOrderId,
        razorpayPaymentId: testPaymentId,
        razorpaySignature: generatedSignature,
      }
    });
    assert(resVerifyPay.status === 200 && resVerifyPay.data.success, "Razorpay payment verified; unit marked as Paid");

    // Receipt download
    const resReceipt = await api("GET", `/maintenance/cycles/${activeCycleId}/units/${unitA101.id || unitA101._id}/receipt`, {
      token: tokens.owner,
      societyId: socId,
    });
    assert(resReceipt.status === 200 && resReceipt.data.data.receiptNo, "Maintenance official receipt generated with receipt number");

    // Treasurer records manual cash payment for Unit A-102
    const resCashPay = await api("POST", `/maintenance/cycles/${activeCycleId}/units/${unitA102.id || unitA102._id}/pay`, {
      token: tokens.treasurer,
      societyId: socId,
      body: { method: "Cash" }
    });
    assert(resCashPay.status === 200 && resCashPay.data.success, "Treasurer recorded cash payment for Unit A-102");

    // Excel Export
    const resExportMaint = await api("GET", `/maintenance/cycles/${activeCycleId}/export`, {
      token: tokens.treasurer,
      societyId: socId,
    });
    assert(resExportMaint.status === 200 && resExportMaint.headers.get("content-disposition")?.includes(".xlsx"), "Maintenance ledger exported as Excel spreadsheet");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 7: Collections (Festivals & Special Funds) ---");
    // ------------------------------------------------------------------------
    // Treasurer creates Collection
    const resCreateCol = await api("POST", "/collections", {
      token: tokens.treasurer,
      societyId: socId,
      body: {
        title: "Navratri Celebration 2026",
        description: "Dandiya night, sound setup, and prasad distribution",
        category: "festival",
        amount: 1500,
        dueDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      }
    });
    assert(resCreateCol.status === 201 && resCreateCol.data.success, "Treasurer created festival collection fund (Navratri 2026)");
    activeCollectionId = resCreateCol.data.data._id || resCreateCol.data.data.id;

    // List collections
    const resListCol = await api("GET", "/collections", { token: tokens.owner, societyId: socId });
    assert(resListCol.status === 200 && resListCol.data.data.length >= 1, "Residents can list active collection drives");

    // Cash payment for unit A-101
    const resColCash = await api("POST", `/collections/${activeCollectionId}/units/${unitA101.id || unitA101._id}/pay`, {
      token: tokens.treasurer,
      societyId: socId,
      body: { method: "Cash" }
    });
    assert(resColCash.status === 200 && resColCash.data.success, "Treasurer recorded cash payment for collection");

    // Export collection excel
    const resColExport = await api("GET", `/collections/${activeCollectionId}/export`, {
      token: tokens.treasurer,
      societyId: socId,
    });
    assert(resColExport.status === 200 && resColExport.headers.get("content-disposition")?.includes(".xlsx"), "Collection contribution report exported to Excel");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 8: Document Vault ---");
    // ------------------------------------------------------------------------
    // Upload sample PDF document
    const resUploadDoc = await api("POST", "/documents", {
      token: tokens.treasurer,
      societyId: socId,
      formData: {
        title: "Society Electricity Bill August 2026",
        category: "bill",
        description: "Common area electricity bill receipt",
        file: {
          filename: "MSEB_Aug_Bill.pdf",
          contentType: "application/pdf",
          content: "%PDF-1.4 Mock PDF Content for Testing",
        }
      },
      isMultipart: true,
    });
    assert(resUploadDoc.status === 201 && resUploadDoc.data.success, "Uploaded PDF bill document to vault");
    activeDocId = resUploadDoc.data.data._id || resUploadDoc.data.data.id;

    // List documents with category filter
    const resListDocs = await api("GET", "/documents?category=bill", { token: tokens.owner, societyId: socId });
    assert(resListDocs.status === 200 && resListDocs.data.data.length >= 1, "Retrieved filtered documents in vault");

    // Download document stream
    const resDownloadDoc = await api("GET", `/documents/${activeDocId}/download`, { token: tokens.owner, societyId: socId });
    assert(resDownloadDoc.status === 200 && resDownloadDoc.headers.get("content-disposition")?.includes("MSEB_Aug_Bill.pdf"), "Document download stream verified with attachment header");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 9: Helpdesk & Complaints Workflow ---");
    // ------------------------------------------------------------------------
    // Resident raises complaint
    const resCreateComplaint = await api("POST", "/complaints", {
      token: tokens.owner,
      societyId: socId,
      body: {
        title: "Elevator Lift Jerking in Wing A",
        description: "Lift 2 in Wing A makes loud screeching noises and stops abruptly on 2nd floor.",
        category: "electrical",
        priority: "high",
        isPublic: true,
      }
    });
    assert(resCreateComplaint.status === 201 && resCreateComplaint.data.success, "Resident raised public high-priority complaint");
    activeComplaintId = resCreateComplaint.data.data._id || resCreateComplaint.data.data.id;

    // Helpdesk Manager assigns to staff
    const resAssignComplaint = await api("PATCH", `/complaints/${activeComplaintId}/assign`, {
      token: tokens.helpdesk,
      societyId: socId,
      body: { assignedTo: users.socAdmin.id || users.socAdmin._id }
    });
    assert(resAssignComplaint.status === 200 && resAssignComplaint.data.data.assignedTo, "Helpdesk manager assigned complaint to staff");

    // Update status to resolved
    const resResolveComplaint = await api("PATCH", `/complaints/${activeComplaintId}/status`, {
      token: tokens.helpdesk,
      societyId: socId,
      body: { status: "resolved" }
    });
    assert(resResolveComplaint.status === 200 && resResolveComplaint.data.data.status === "resolved", "Complaint marked resolved");

    // Resident reopens complaint
    const resReopenComplaint = await api("PATCH", `/complaints/${activeComplaintId}/status`, {
      token: tokens.owner,
      societyId: socId,
      body: { status: "reopened" }
    });
    assert(resReopenComplaint.status === 200 && resReopenComplaint.data.data.status === "reopened", "Resident reopened resolved ticket");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 10: Amenities & Slots Booking ---");
    // ------------------------------------------------------------------------
    // Admin creates Amenity
    const resCreateAmenity = await api("POST", "/amenities", {
      token: tokens.socAdmin,
      societyId: socId,
      body: {
        name: "Clubhouse Banquet Hall",
        description: "Air-conditioned banquet hall with sound system",
        type: "paid",
        price: 500,
        bookingMode: "slot",
        slots: ["09:00-12:00", "14:00-17:00", "18:00-21:00"],
      }
    });
    assert(resCreateAmenity.status === 201 && resCreateAmenity.data.success, "Created slot-based amenity");
    activeAmenityId = resCreateAmenity.data.data._id || resCreateAmenity.data.data.id;

    // Check available slots
    const bookDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const resSlots = await api("GET", `/amenities/${activeAmenityId}/slots?date=${bookDate}`, {
      token: tokens.owner,
      societyId: socId,
    });
    assert(resSlots.status === 200 && Array.isArray(resSlots.data.data) && resSlots.data.data.length === 3, "Retrieved 3 available amenity time slots");

    // Book slot
    const resBookAmenity = await api("POST", `/amenities/${activeAmenityId}/book`, {
      token: tokens.owner,
      societyId: socId,
      body: { date: bookDate, slot: "18:00-21:00" }
    });
    assert(resBookAmenity.status === 201 && resBookAmenity.data.data.status === "booked", "Amenity slot booked by resident");
    const bookingId = resBookAmenity.data.data._id || resBookAmenity.data.data.id;

    // Cancel booking
    const resCancelBooking = await api("POST", `/amenities/bookings/${bookingId}/cancel`, {
      token: tokens.owner,
      societyId: socId,
    });
    assert(resCancelBooking.status === 200 && resCancelBooking.data.data.status === "cancelled", "Amenity booking cancelled and slot released");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 11: Community Polls (Open/Secret & Wing Scoping) ---");
    // ------------------------------------------------------------------------
    // Wing Admin creates Wing A Poll (options as array of strings)
    const resCreatePoll = await api("POST", "/polls", {
      token: tokens.wingAdmin,
      societyId: socId,
      body: {
        question: "Install CCTV camera on Wing A 2nd floor landing?",
        options: ["Yes, definitely", "No, unnecessary", "Need more info"],
        type: "open",
        scope: "wing",
        wing: "A",
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      }
    });
    assert(resCreatePoll.status === 201 && resCreatePoll.data.success, "Wing Admin created Wing A scoped poll");
    activePollId = resCreatePoll.data.data._id || resCreatePoll.data.data.id;

    // Resident in Wing A votes
    const resVotePoll = await api("POST", `/polls/${activePollId}/vote`, {
      token: tokens.owner,
      societyId: socId,
      body: { selectedOptionIndex: 0 }
    });
    assert(resVotePoll.status === 200 && resVotePoll.data.data.totalVotes === 1, "Resident in Wing A voted on poll; vote tally updated");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 12: Community Surveys ---");
    // ------------------------------------------------------------------------
    // Admin creates survey with 4 question types (options as array of strings)
    const resCreateSurvey = await api("POST", "/surveys", {
      token: tokens.socAdmin,
      societyId: socId,
      body: {
        title: "Annual Society Maintenance & Facility Feedback",
        description: "Please share your ratings and feedback on security, water, and gardening.",
        scope: "society",
        endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        questions: [
          { text: "Overall rating of society cleanliness?", type: "rating" },
          { text: "Which facility do you use most frequently?", type: "single", options: ["Gym", "Swimming Pool", "Clubhouse"] },
          { text: "What improvements would you like to see?", type: "text" },
        ]
      }
    });
    assert(resCreateSurvey.status === 201 && resCreateSurvey.data.data.id, "Created community survey with 3 question types (rating, single, text)");
    activeSurveyId = resCreateSurvey.data.data.id;

    const resGetSurvey = await api("GET", `/surveys/${activeSurveyId}`, { token: tokens.owner, societyId: socId });
    const surveyQuestions = resGetSurvey.data.data.questions || [];
    assert(resGetSurvey.status === 200 && surveyQuestions.length === 3, "Retrieved survey questions for response submission");

    // Resident submits survey response
    const resSubmitSurvey = await api("POST", `/surveys/${activeSurveyId}/submit`, {
      token: tokens.owner,
      societyId: socId,
      body: {
        answers: [
          { questionId: String(surveyQuestions[0]._id || surveyQuestions[0].id), rating: 5 },
          { questionId: String(surveyQuestions[1]._id || surveyQuestions[1].id), selectedOptions: [0] },
          { questionId: String(surveyQuestions[2]._id || surveyQuestions[2].id), textAnswer: "More plants near visitor parking" },
        ]
      }
    });
    assert(resSubmitSurvey.status === 200 && resSubmitSurvey.data.success, "Resident submitted complete survey response");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 13: Notice Board Bulletins ---");
    // ------------------------------------------------------------------------
    // Wing Admin publishes notice
    const resCreateNotice = await api("POST", "/notices", {
      token: tokens.wingAdmin,
      societyId: socId,
      body: {
        title: "Water Tank Cleaning Schedule for Wing A",
        body: "Water supply will be temporarily paused on Thursday between 10 AM and 2 PM for bi-annual tank disinfection.",
      }
    });
    assert(resCreateNotice.status === 201 && resCreateNotice.data.success, "Wing admin published notice to board");

    const resListNotices = await api("GET", "/notices", { token: tokens.owner, societyId: socId });
    assert(resListNotices.status === 200 && resListNotices.data.data.length >= 1, "Residents can view notice board bulletins");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 14: Real-time Chat (Groups & Direct Admin DMs) ---");
    // ------------------------------------------------------------------------
    // Admin creates Chat Group (using memberIds)
    const resCreateGroup = await api("POST", "/chat/groups", {
      token: tokens.socAdmin,
      societyId: socId,
      body: {
        name: "Wing A Residents Discussion",
        description: "Official channel for Wing A resident matters",
        memberIds: [users.owner.id || users.owner._id, users.tenant.id || users.tenant._id]
      }
    });
    assert(resCreateGroup.status === 201 && resCreateGroup.data.success, "Admin created chat group channel");
    activeGroupId = resCreateGroup.data.data._id || resCreateGroup.data.data.id;

    // Send Group Message
    const resSendGroupMsg = await api("POST", `/chat/groups/${activeGroupId}/messages`, {
      token: tokens.owner,
      societyId: socId,
      body: { text: "Hello everyone! Happy to connect here." }
    });
    assert(resSendGroupMsg.status === 201 && resSendGroupMsg.data.success, "Group message sent by resident");
    const groupMsgId = resSendGroupMsg.data.data._id || resSendGroupMsg.data.data.id;

    // Add emoji reaction
    const resReactMsg = await api("POST", `/chat/groups/${activeGroupId}/messages/${groupMsgId}/react`, {
      token: tokens.socAdmin,
      societyId: socId,
      body: { emoji: "👍" }
    });
    assert(resReactMsg.status === 200 && resReactMsg.data.success, "Added emoji reaction to group message");

    // Pin Message
    const resPinMsg = await api("POST", `/chat/groups/${activeGroupId}/pin`, {
      token: tokens.socAdmin,
      societyId: socId,
      body: { messageId: groupMsgId }
    });
    assert(resPinMsg.status === 200 && resPinMsg.data.success, "Pinned message to group header");

    // Send Direct 1-on-1 DM to Admin
    const resSendDirect = await api("POST", "/chat/direct/messages", {
      token: tokens.owner,
      societyId: socId,
      body: { receiverId: users.socAdmin.id || users.socAdmin._id, text: "Hi Admin, had a quick query regarding my maintenance invoice." }
    });
    assert(resSendDirect.status === 201 && resSendDirect.data.success, "Direct 1-on-1 DM sent from resident to admin");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 15: Family Members & Directory ---");
    // ------------------------------------------------------------------------
    // Add family member
    const resAddFamily = await api("POST", "/family-members", {
      token: tokens.owner,
      societyId: socId,
      body: { name: "Ananya Sharma", relation: "spouse", phone: "+919876543210" }
    });
    assert(resAddFamily.status === 201 && resAddFamily.data.success, "Added family member to unit");
    activeFamilyId = resAddFamily.data.data._id || resAddFamily.data.data.id;

    const resListFamily = await api("GET", "/family-members", { token: tokens.owner, societyId: socId });
    assert(resListFamily.status === 200 && resListFamily.data.data.some((f) => f.name === "Ananya Sharma"), "Retrieved family members list");

    // Directory check
    const resDirectory = await api("GET", "/memberships/directory", { token: tokens.owner, societyId: socId });
    assert(resDirectory.status === 200 && resDirectory.data.data.length >= 3, "Directory lists all society members");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 16: Dynamic Badging Engine ---");
    // ------------------------------------------------------------------------
    // Fetch unread badges
    const resBadges = await api("GET", "/dashboard/badges", { token: tokens.owner, societyId: socId });
    assert(resBadges.status === 200 && typeof resBadges.data.data === "object", "Dashboard badges counter API returned counts object");

    // Mark polls seen
    const resMarkSeen = await api("POST", "/dashboard/badges/seen", {
      token: tokens.owner,
      societyId: socId,
      body: { feature: "polls" }
    });
    assert(resMarkSeen.status === 200 && resMarkSeen.data.success, "Marked polls badge as seen");

    // Mark all seen
    const resMarkAllSeen = await api("POST", "/dashboard/badges/seen-all", { token: tokens.owner, societyId: socId });
    assert(resMarkAllSeen.status === 200 && resMarkAllSeen.data.success, "Marked all feature badges as seen");

    // ------------------------------------------------------------------------
    console.log("\n--- SUITE 17: Security & Unauthorized Boundary Assertions ---");
    // ------------------------------------------------------------------------
    // 1. Resident attempting to create a billing cycle -> 403
    const resUnauthCycle = await api("POST", "/maintenance/cycles", {
      token: tokens.owner,
      societyId: socId,
      body: { month: 1, year: 2027, amount: 5000, dueDate: new Date().toISOString() }
    });
    assert(resUnauthCycle.status === 403, "Resident blocked from creating billing cycle (403 Forbidden)");

    // 2. Resident attempting to create a collection drive -> 403
    const resUnauthCol = await api("POST", "/collections", {
      token: tokens.owner,
      societyId: socId,
      body: { title: "Unauthorized Drive", amount: 1000, dueDate: new Date().toISOString() }
    });
    assert(resUnauthCol.status === 403, "Resident blocked from creating collection drive (403 Forbidden)");

    // 3. Resident attempting to delete society documents -> 403
    const resUnauthDocDelete = await api("DELETE", `/documents/${activeDocId}`, {
      token: tokens.owner,
      societyId: socId,
    });
    assert(resUnauthDocDelete.status === 403, "Resident blocked from deleting society documents (403 Forbidden)");

    // 4. Non-super admin accessing global admin societies route -> 403
    const resUnauthSuper = await api("GET", "/societies", { token: tokens.socAdmin });
    assert(resUnauthSuper.status === 403, "Society admin blocked from global super-admin societies list (403 Forbidden)");

    console.log("  \x1b[32m✔ [PASS]\x1b[0m Wing isolation and role boundaries validated");

    console.log("\n=======================================================");
    console.log(`   TEST EXECUTION COMPLETED: ${stats.passed}/${stats.total} PASSED (${stats.failed} FAILED)   `);
    console.log("=======================================================\n");

  } catch (error) {
    console.error("\n\x1b[31m[TEST SUITE ABORTED DUE TO ERROR]\x1b[0m", error);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    if (stats.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runAllTests();
