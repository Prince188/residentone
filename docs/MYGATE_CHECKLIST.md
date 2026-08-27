# MyGate vs ResidentOne - Feature Checklist (Tick What You Built)

> **How to use:** Tick ` [x]` when ResidentOne has the feature live in `main`. Leave ` [ ]` if pending/planned. This file mirrors `MYGATE_FEATURES.md` (250+ features, source https://mygate.com/offerings/) but with checkbox for tracking.
> **Legend:** `- [ ]` = Not built | `- [x]` = Built & live | Add note after `//` if partial

**Instructions:** In VS Code/Markdown preview, click checkbox or edit to `- [x]`. Commit weekly to track parity.

**Progress:** Update counts manually or run `grep -c "\[x\]" MYGATE_CHECKLIST.md`

---

## 1. Accounting ERP (~60 features)

**Billing Setup:**
- [ ] Multiple charge types (per sq ft, fixed, slab, consumption-based)
- [ ] Automated accounting system with ready-to-use templates
- [x] Unlimited billing heads (ResidentOne: maintenance cycles flexible // basic `maintenance.model.js:4-41`)
- [ ] Group invoicing (multiple charges + different GST rates in one bill)
- [ ] Targeted invoicing (by tower, block, owner vs tenant, flat type)
- [ ] Custom invoice format (logo, header/footer, pagination)
- [ ] Custom invoicing sequence (prefixes, numbering)
- [ ] E-invoicing with dynamic UPI QR code
- [ ] Recurring invoices (auto monthly/quarterly)
- [ ] Automatic scheduled invoicing (date/period based)
- [ ] Auto charge calculation (by size, type, consumption)
- [ ] Bulk upload (invoices/credits)
- [ ] Customisation (GST toggle line-item level, item-wise credit/discount/GST)

**Penalties & Advances:**
- [ ] Interest and penalties (configurable flat/%/step)
- [ ] Fine options (rate/amount/%, slab fines, Mumbai fine system)
- [ ] Flexible penalty setup + auto-reversal of fine
- [ ] Advance account (multiple advance types)
- [ ] Settlement from advance (auto)
- [ ] Arrears (single total or broken-down)
- [ ] Automation for defaulters (flag + reminders + restrict amenity)

**Payments & Reconciliation:**
- [ ] Multiple app payment options (UPI, cards, VPA, foreign cards, RuPay/Diners/Amex)
- [ ] Least transaction charges (optimised)
- [x] Partial payment options // ResidentOne: manual pay/unpay per unit `maintenance.routes.js:40-48` (admin only, no partial split)
- [ ] Credit notes & discounts
- [ ] Payment intimation (offline EFT/cheque/cash)
- [x] Auto reconciliation // partial: `MaintenancePayment` marks paid, no bank statement auto-match
- [ ] Reconciliation exception report
- [ ] Cash payment reconciliation
- [ ] Auto bank reconciliation via custom statement fields
- [ ] Multi-bank support (different banks per bill type)
- [ ] Purchases flow (requisition -> RFQ -> PO -> expense -> approval -> inventory receipt)
- [ ] Budget (monthly/quarterly/annual + variance)

**Ledgers & Vouchers:**
- [ ] General ledger (assets/liabilities/income/expenses)
- [ ] General payments (petty cash)
- [ ] General receipts (misc income)
- [ ] Chart of accounts (hierarchy)
- [ ] Journal vouchers (debit/credit + editable + canceled review)
- [ ] Fixed deposit tracker (interest, maturity, bank)
- [ ] Security deposit tracking (amenity/move-in)
- [ ] Cash and bank transfers
- [ ] Uploads/downloads (bulk daily transactions)
- [ ] Accounts migration
- [ ] Easy Tally export (sync)

**Residents View:**
- [x] App dues statement // ResidentOne: `/maintenance` + `/dues` shows cycle amount/dueDate/status
- [x] App account statement // `MaintenancePage.js` + `SocietyDuesPage.js` viewable
- [x] Auto dues receipts // `receiptNo` field exists `maintenance.model.js:64-66` manual
- [ ] Prepaid meters integration (14+ brands: El-Measure, Secure, WaterOn + real-time usage + failure logs)
- [ ] Offline intimation via app/email/SMS
- [ ] Reminders (push/SMS/email for pending)
- [ ] Dues reports (society-wide, bill-specific, head-wise)
- [ ] Collection reports (flat/bill/head-wise)
- [ ] Advance collection report
- [ ] Dues+advance+security deposit report (period filter)
- [ ] Income & expense reports with charts
- [ ] TDS report
- [ ] GST report (input/output)
- [ ] Trial balance (accrued income/provisions)
- [ ] Balance sheet (Schedule VI & N)
- [ ] Day book (all payments/receipts/vouchers per day)
- [x] Defaulters list // partial: overdue status `late_paid/overdue` + filter chips

**Additional ERP:**
- [ ] Schedule reports (auto email)
- [ ] Expense booking with GST/TDS + admin approval + paid/unpaid vendor reports
- [ ] Audit-ready trails + detailed audit logs (who approved/edited) + MIS/SLA/TAT summaries

---

## 2. Payment Infrastructure
- [ ] Payment modes: UPI, net banking, cards, RuPay/Diners/Amex, VPA, wallets
- [ ] Gateways: Razorpay, Cashfree
- [ ] Foreign cards support (NRI owners)
- [x] App & web dashboard payments // partial: web dashboard manual, no gateway
- [ ] Auto bank reconciliation + financial operations team
- [ ] Payment types: maintenance, security deposits, sinking fund, staff salaries
- [ ] Settlement timelines (prompt to society account)

## 3. Communications
- [ ] Group creation (custom groups by function/hobby)
- [ ] Email and SMS (to groups/all, real-time delivery incl. DND)
- [ ] Group email (auto group email IDs)
- [ ] Opinion polls
- [ ] Secret polls (elections/sensitive)
- [ ] Election poll (secure digital elections)
- [ ] Surveys
- [ ] Meeting (organize + digitally record minutes rich text)
- [ ] Personal documents (private to flat + admin only)
- [ ] Society documents (all)
- [ ] Management documents (RWA only)
- [ ] Flat-wise & society-wise docs (access control: resident/block/flat, Document Vault)
- [x] Notice board // ResidentOne: `notice.model.js` + `NoticesPage.js` targeted not yet (society-wide only)
- [ ] Email campaigns (bulk)
- [ ] Push notifications (instant)
- [ ] Resident calling (in-app, masked directory)
- [ ] Tasks (create/assign/monitor staff tasks)
- [ ] Bulk SMS/email delivery reports
- [x] Community directory // `DirectoryPage.js:51` done
- [ ] Masked directory (privacy)
- [ ] Classifieds/chat between residents
- [ ] Discussion forum

## 4. Amenities Module (23 features)
- [ ] Amenity management (add free/paid)
- [ ] Capacity control (max concurrent)
- [ ] Group-wise usage limit (club similar)
- [ ] Usage control (per flat limits)
- [ ] Location-based grouping
- [ ] Slot addition (unlimited)
- [ ] Start time customisation
- [ ] Block booking (weekly/monthly/yearly)
- [ ] Cool-down period (gap)
- [ ] Maintenance closure (block during maintenance)
- [ ] Holiday calendar (per amenity)
- [ ] Differential pricing (prime hours)
- [ ] Add-ons (tables/chairs)
- [ ] BNPL (book now pay later)
- [ ] Approval process (for free amenities)
- [ ] User blacklisting
- [ ] Defaulter blocking (dues > threshold)
- [ ] Cancellation limits
- [ ] Cancellation charges
- [ ] Invites (friends/co-players)
- [ ] Companion management (T&C)
- [ ] Integrated check-in/check-out (clubhouse guard device)
- [ ] Resident notifications (cancelled slot available)
> **Note:** All above = placeholder `AmenitiesPage.js:3` title only

## 5. Digital Helpdesk (14 features)
- [ ] Service requests (category, description, photos)
- [ ] Status tracking (in progress/on hold/resolved/reopen)
- [ ] Department control (plumbing/electrical/housekeeping)
- [ ] Category/sub-category control
- [ ] Complaint staff roster (assign by category/dept)
- [ ] Manual/auto assignment (workload based, reassign)
- [ ] Auto escalation (if SLA missed, up to 4-level matrix)
- [ ] SLA definition per category (e.g., 24h)
- [ ] Reopening ticket
- [ ] Defaulter status (block new request if dues pending)
- [ ] Reports: avg closure time
- [ ] Reports: category-wise
- [ ] Reports: tower-wise (SLA compliance)
- [ ] Ratings & comments (resident feedback)
- [ ] Escalation matrix
- [ ] Saarthi Helpdesk App (staff side)
- [ ] AI-driven support assistant
- [ ] Helpdesk analytics + downloadable reports + ETAs/SLAs
> **Note:** `ComplaintsPage.js:3` title only today

## 6. Asset & Inventory Management
- [ ] Member management (add/remove RWA members)
- [ ] General & member ledger differentiation
- [ ] Staff management (add/remove, assign dept)
- [ ] Staff attendance management (shifts, facial selfie, anomaly detection, reports)
- [ ] Vendor master (dept, bank, contact)
- [ ] Vendor reporting (by service)
- [ ] Vendor performance tracking + contracts + AMCs + documents & SLAs
- [ ] Expense booking
- [ ] Purchase requisition
- [ ] Purchase approval (multi-level by dept/amount)
- [ ] Purchase order (to vendor)
- [ ] Non-member management (shops, yoga teacher)
- [ ] Non-member dues & receipts + alerts
- [ ] Asset master (description, location)
- [ ] Asset categorisation (control categories, assign staff)
- [ ] AMC reminder (periodic)
- [ ] Asset reports (location/year/model/manufacturer/qty/price)
- [ ] Inventory master (location, stock qty, price)
- [ ] Stock updating & usage tracking (replenish by min levels)
- [ ] Inventory reports (society & tower level) + custodians/dept tracking

## 7. Security Features for Residents
- [ ] Pre-approvals (guests, delivery, cab, child exit)
- [ ] Spot entry approvals (guard push/IVR call, one-tap approve)
- [ ] Visitor overstay alert (delivery/cab flat count + duration)
- [ ] Guest invitations (via phonebook/SMS/WhatsApp QR/numeric pass)
- [ ] Recurring invite (daily new OTP)
- [ ] Leave-at-gate (authorize guard, photo, OTP)
- [ ] Mandatory leave-at-gate enforcement
- [ ] Invite requests (to visit friend in another MyGate society)
- [ ] Visit code requests (pre-approval to other society)
- [ ] Child safety alert (instant when child exits)
- [ ] Daily help access (unique passcode per maid/driver/cook, instant notify)
- [ ] Daily help attendance (timings, monthly, punctuality rating)
- [ ] Timing-based search (find maid afternoon/cooks morning)
- [ ] Daily help payments (advances/monthly via UPI)
- [ ] Panic button / SOS
- [ ] Emergency alert (to guards + 3 emergency contacts, community-wide)
- [ ] Emergency contacts (up to 3) // UI `EmergencyContactsPage.js` title only
- [ ] Local services marketplace (verified plumbers/maids with ratings)
- [ ] Delivery & cab management (multiple flats visit tracking)
- [ ] QR/digital pass based entry + OTP scanner

## 8. Security Features for Admins
- [ ] Visitor overstay alert (admin view)
- [ ] Utility vehicle tracking (water tanker/diesel/garbage logged real-time)
- [ ] Material gatepass (digital for items in/out, voice command)
- [ ] App & IVR authentication (notification -> IVR fallback)
- [ ] Guard patrolling (routes defined, QR/NFC checkpoints)
- [ ] Reporting suite: visitor logs
- [ ] Reporting suite: vehicle movement logs
- [ ] Reporting suite: gatepass records
- [ ] Reporting suite: investigation pages
- [ ] Reporting suite: empty flats visit logs

## 9. Security Features for Guards (Dedicated Guard App)
- [ ] Group visitor entry (labour/contractor crew, each photo)
- [ ] Frequent visitor handling (school bus/milkman/tanker fast category)
- [ ] Vendor access (via spot approvals, push/IVR)
- [ ] Photo capture (mandatory per policy)
- [ ] Resident ID (unique code per family member)
- [ ] Utility vehicle tracking (guard side)
- [ ] Multi-tier check-in (main gate + tower level)
- [ ] Guard patrolling (QR/NFC)
- [ ] Guard-to-guard calling (main <-> tower <-> clubhouse)
- [ ] Temperature & mask capture (logged, visible to residents)
- [ ] SpO2 readings
- [ ] Voice command entry
- [ ] Parallel processing (enter next while waiting approval)
- [ ] E-intercom (primary/secondary numbers, IVR offline)
- [ ] Offline guard mode (logs locally, sync later with conflict flag)
- [ ] Multilingual support (Hindi, Kannada, Gujarati)
- [ ] Validation queue (incoming requests with photo Approve/Reject)
- [ ] QR/OTP scanner + manual pass entry
- [ ] Quick search (passcode/flat/name/vehicle)
- [ ] Photo at entry/exit
- [ ] Checkout prompt + Visitors Inside list (overdue highlight)
- [ ] Manual override (reason mandatory, auto-notify admin)
- [ ] Whitelist/blacklist (delivery partners/banned)
- [ ] Recurring visitor templates (allowed days/windows/max daily)
- [ ] Gate routing (category->gate, block-level)
- [ ] Dues lock (auto-block if dues > threshold)
- [ ] Pass types (single/multi-day/group/event/parking)
- [ ] Data retention policy
- [ ] Notifications config (push/SMS/email)
> **Note:** ResidentOne: `socket/index.js` scaffold only, no guard app

## 10. Vehicle & Parking Management
- [ ] Visitor vehicle logging (last 4 digits)
- [x] Vehicle owner lookup // partial: `VehiclesPage.js:19` lookup via `user.vehicles[]` strings, not ANPR
- [ ] Resident parking allocation (digital per flat limits)
- [ ] Visitor parking capacity (define total, guard sees free)
- [x] Resident vehicle updates // `user.model.js:43-45` vehicles array + `ProfilePage` editable (partial)
- [ ] Boom barrier & ANPR integrations (multiple providers)

## 11. Admin Dashboard
- [x] Society management hub // `society.model.js` + admin routes `society.routes.js:23-74`
- [x] Resident management (owners/tenants/family) // `membership` + `unit` modules done
- [ ] Service provider management (daily helpers, staff, maintenance teams)
- [ ] Staff attendance management (shifts, detailed reports)
- [ ] Tenant management (rental agreements, tenure, docs)
- [ ] Digital move-in/move-out (verify dues/rules/approvals, request via app)
- [ ] Custom dashboard (configurable modules per stakeholder)
- [ ] Reporting suite (visitor/vehicle/gatepass/empty flats/finance/collections/helpdesk/facility)
- [x] Admin app controls (approve registrations from app) // `AdminSocietiesPage.js` + approve/reject/suspend
- [ ] Selfie attendance (facial)
- [ ] Masked directory (guards call without seeing numbers)
- [x] Multi-flat management // `membership.my-societies` + `society.store.js` society switcher
- [x] Notice board // done
- [ ] Move-in/out access (resident initiated)
- [ ] Email campaigns
- [ ] Push notifications

## 12. Admin Roles & Access Control (10 roles + custom)
- [x] Cluster admin // partial: ResidentOne multi-society switcher `society.context.middleware.js` (advantage: any user multi-society, not just admin)
- [x] Society admin / super_admin // `shared/types/index.js:1-11` + `auth.middleware.js`
- [ ] View-only admin (see all, no edit/download)
- [ ] Manager (view with some fields masked, accounting+communication, no download)
- [ ] Accountant (accounting only)
- [ ] Helpdesk manager (service requests only)
- [ ] Treasurer (full accounting + assets + inventory)
- [ ] Utility manager (all communication)
- [ ] Auditor (view reports, no edits)
- [ ] Custom role (tailored view/full for selected modules)
- [ ] Role-based dashboards, masked fields, download controls
- [ ] Multi-level approval chains (expenses/vendor payments/budgets)

## 13. Pet Directory
- [ ] Pet profile (name/gender/breed/vaccination)
- [ ] Vaccination status
- [ ] Vaccination reminders
- [ ] Pet directory (browse all pets)
- [ ] Admin view (track pet logs & vaccination records)

## 14. Marketplace & eCommerce Infra
- [ ] Buy/sell marketplace (secure pre-loved goods)
- [ ] Post classifieds (description/images/price)
- [ ] Search & filters (price/age/item type)
- [ ] Chat support (no number exchange)
- [ ] Real estate marketplace (rent/PG/sell listings)
- [ ] Real estate search & filters (neighbourhood/type/price/config/society)
- [ ] E-commerce store (resident small business)
- [ ] Catalog management (descriptions/pricing/stock)
- [ ] Order management (auto invoice + status/delivery updates)
- [ ] Built-in payment gateway (cards/UPI/net banking)

## 15. Integrations & Partnerships
- [ ] Boom barrier providers (multiple)
- [ ] Prepaid meter brands (El-Measure, Secure, WaterOn, Radius, WeGot, Enlog, 14 companies)
- [ ] Tally (perfect sync)
- [ ] Cab services (airport/city rentals)
- [ ] Diagnostics (lab tests/medicines)
- [ ] Home services (cleaning/repairs)
- [ ] IoT (CCTV, turnstiles, smart locks `shop.mygate.com`, biometric, QR/NFC tags)

## 16. Data Security and Privacy
- [ ] Virtual private cloud (AWS VPC)
- [ ] Encryption (TLS in motion/at rest), no public IPs, VPN tunnel + 2FA
- [x] Gate privacy // partial: tenant isolation `tenant.plugin.js` ensures society data isolation
- [ ] Estate privacy with number masking (OTP verified dashboard/download)
- [ ] Certifications: ISO 27001:2022, GDPR, PDP/DPDP compliant, NDA, privacy logs
- [ ] Compliance: DPDP & GDPR fully compliant, no data sharing
- [ ] Penetration testing (ethical hackers)
- [ ] Disaster recovery (backup, 99%+ uptime)
- [x] Role-based access // `requireRole` done
- [x] Audit logs // basic via `logger.js` morgan/pino, not detailed trail yet
- [ ] Data retention policies (purpose-limited)

## 17. Interfaces
- [ ] Guard App (root-locked smartphone per society, offline-capable, minimal UI)
- [x] Resident App // `frontend/src` React web app (iOS/Android pending Phase 7)
- [x] Admin App // `AdminSocietiesPage.js` etc (web admin done)
- [x] MC/FM Dashboard // `dashboard/society.routes.js` web dashboard done
- [ ] Custom app controls

## 18. Services & Trainings
- [ ] Guard training (lifetime, unlimited)
- [ ] On-ground support (500 professionals)
- [ ] Account management (onsite+online) + relationship managers
- [ ] Customer Support (AI assistant + human managers)

## 19. COVID Safety Features (Legacy)
- [ ] Smart eye attendance (facial contactless)
- [ ] Temperature & mask info + SpO2 readings
- [ ] Resident entry/exit tracking for tracing
- [ ] Vendor at gate alerts + leave-at-gate / mandatory leave-at-gate
- [ ] Covid protect (safety controls + city health updates)
- [ ] Quarantine at home (tag flats)

## 20. Resident App Extras (Google Play)
- [x] Society & Home Payments // manual mark paid done, gateway pending
- [ ] Book Amenities in Real Time (gym/clubhouse/courts, duration/pricing/cancellation)
- [ ] Helpdesk & Maintenance Requests (raise with photos/notes, notifications, history)
- [ ] Domestic Help Management (find verified, ratings/history/availability, attendance, UPI payments)
- [ ] Visitor & Delivery Management (tap approve via push, Leave at Gate OTP)
- [x] Community Communication & Directory // notices+directory done
- [ ] Local & Home Services (electricians/plumbers, transparent pricing, reviews, marketplace)

**For RWAs - Best ERP Tools:**
- [ ] Accounting & Billing (auto bills, defaulter lists, dues breakdown, real-time collection dashboard, bank+Tally)
- [ ] Helpdesk & Complaint Resolution (SLA+auto-escalation, assign staff/vendors, reports)
- [ ] Staff & Vendor Oversight (attendance logs, ratings/contracts/AMCs/documents)
- [ ] Document Vault (AGM minutes/bylaws/notices, access by resident/block/flat)
- [ ] Polling & Surveys (secret ballot for AGMs, participation tracking)
- [ ] Community Dashboard (overview payments/complaints/security/visitor logs for MC/RWA/FM/accountants/auditors)

---

## Summary Progress Tracker

| Module | Total | Built | Pending |
|---|---|---|---|
| 1. Accounting ERP | 59 | ~6 | 53 |
| 2. Payment Infra | 7 | 1 | 6 |
| 3. Communications | 24 | 2 | 22 |
| 4. Amenities | 23 | 0 | 23 |
| 5. Helpdesk | 18 | 0 | 18 |
| 6. Asset & Inventory | 20 | 0 | 20 |
| 7. Security Resident | 20 | 0 | 20 |
| 8. Security Admin | 10 | 0 | 10 |
| 9. Security Guard | 28 | 0 | 28 |
| 10. Vehicle Parking | 6 | 2 | 4 |
| 11. Admin Dashboard | 14 | 5 | 9 |
| 12. Roles & Access | 12 | 2 | 10 |
| 13. Pet Directory | 5 | 0 | 5 |
| 14. Marketplace | 10 | 0 | 10 |
| 15. Integrations | 7 | 0 | 7 |
| 16. Security Privacy | 11 | 3 | 8 |
| 17. Interfaces | 5 | 3 | 2 |
| 18. Services | 4 | 0 | 4 |
| 19. COVID | 6 | 0 | 6 |
| 20. Resident Extras | 13 | 2 | 11 |
| **TOTAL** | **~302** | **~26** | **~276** |

> Update this file as you ship: change `- [ ]` to `- [x]` and update counts. ResidentOne current strength: Multi-society tenant isolation `tenant.plugin.js:1` + society approval flow `society.routes.js:37-55` + unit invite links `unit.routes.js:16-23` + maintenance cycle tracking - unique vs MyGate Cluster Admin.

---
*Generated from `MYGATE_FEATURES.md` for tick-tracking. Keep both files in sync.*

### Update 2026-08-27 - Complaints Module DONE
- [x] Service requests (category/description) complaint.model.js:12-26`n- [x] Status tracking (open/in_progress/on_hold/resolved/closed/reopened) complaint.service.js:11`n- [x] Category control + Department control complaint.validation.js`n- [x] Public/Private visibility toggle isPublic - user choice ComplaintsPage.js`n- [x] Private = only owner + admin, Public = all society members complaint.service.js:42-61`n
