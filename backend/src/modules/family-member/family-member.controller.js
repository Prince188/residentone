const familyMemberService = require("./family-member.service");

class FamilyMemberController {
  async list(req, res, next) {
    try {
      const docs = await familyMemberService.list(req.societyId, req.userId, req.membership);
      res.json({ success: true, data: docs.map((d) => familyMemberService.map(d)) });
    } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      const doc = await familyMemberService.create(req.societyId, req.userId, req.membership, req.body);
      const populated = await doc.populate([{ path: "unitId", select: "label" }, { path: "addedBy", select: "name" }]);
      res.status(201).json({ success: true, data: familyMemberService.map(populated) });
    } catch (e) { next(e); }
  }
  async remove(req, res, next) {
    try {
      const doc = await familyMemberService.remove(req.societyId, req.params.id, req.userId, req.membership);
      res.json({ success: true, data: familyMemberService.map(doc) });
    } catch (e) { next(e); }
  }
}

module.exports = new FamilyMemberController();
