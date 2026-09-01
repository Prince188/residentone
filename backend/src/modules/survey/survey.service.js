const { Survey, SurveyResponse } = require("./survey.model");
const { Membership } = require("../membership/membership.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class SurveyService {
  async getPrimaryUnit(societyId, userId) {
    const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    if (!membership || !membership.units || membership.units.length === 0) return null;
    const unitId = membership.units[0];
    const unit = await Unit.findOne({ _id: unitId, societyId }).select("label").lean();
    return unit ? { unitId: unit._id, unitLabel: unit.label } : { unitId, unitLabel: null };
  }

  async getVisibleWings(societyId, userId) {
    const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    if (!membership) return [];
    const roles = [membership.role, ...(membership.additionalRoles || [])].filter(Boolean);
    if (roles.includes("society_admin") || roles.includes("super_admin")) return null;
    if (roles.includes("wing_admin")) return (membership.assignedWings || []).map((w) => String(w).toUpperCase());
    if (membership.units && membership.units.length) {
      const units = await Unit.find({ _id: { $in: membership.units }, societyId }).select("block").lean();
      const wings = [...new Set(units.map((u) => String(u.block || "").toUpperCase()).filter(Boolean))];
      return wings;
    }
    return [];
  }

  async isWingVisible(societyId, userId, wing) {
    const visible = await this.getVisibleWings(societyId, userId);
    if (visible === null) return true;
    return visible.includes(String(wing).toUpperCase());
  }

  async create(societyId, userId, data) {
    const scope = data.scope === "wing" ? "wing" : "society";
    let wing = null;
    if (scope === "wing") {
      wing = String(data.wing || "").trim().toUpperCase();
      if (!wing) throw new AppError("Wing is required for wing survey", 400);
      if (!/^[A-Z0-9]{1,10}$/.test(wing)) throw new AppError("Invalid wing name", 400);
      const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
      const roles = [membership?.role, ...(membership?.additionalRoles || [])].filter(Boolean);
      const isSocietyAdmin = roles.includes("society_admin") || roles.includes("super_admin");
      const isWingAdminForWing = roles.includes("wing_admin") && (membership.assignedWings || []).map((w)=>String(w).toUpperCase()).includes(wing);
      if (!isSocietyAdmin && !isWingAdminForWing) throw new AppError(`Not authorized to create survey for Wing ${wing}`, 403);
    }
    const survey = await Survey.create({
      societyId,
      createdBy: userId,
      title: data.title.trim(),
      description: (data.description || "").trim(),
      endDate: new Date(data.endDate),
      questions: data.questions.map((q) => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === "text" || q.type === "rating" ? [] : q.options.map((o) => ({ text: o.trim() })),
      })),
      status: "active",
      scope,
      wing,
    });
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "survey:change", { id: survey._id, action: "create" }); } catch (_) {}
    return survey;
  }

  async autoCloseIfExpired(survey) {
    if (survey.status === "active" && survey.endDate && new Date() > new Date(survey.endDate)) {
      await Survey.updateOne({ _id: survey._id }, { status: "closed" });
      survey.status = "closed";
    }
    return survey;
  }

  async listForSociety(societyId, userId) {
    const visibleWings = userId ? await this.getVisibleWings(societyId, userId) : null;
    const baseQuery = { societyId, isActive: true };
    let wingFilter = {};
    if (visibleWings !== null && Array.isArray(visibleWings)) {
      if (visibleWings.length === 0) wingFilter = { $or: [{ scope: "society" }, { scope: { $exists: false } }, { scope: null }] };
      else wingFilter = { $or: [{ scope: "society" }, { scope: "wing", wing: { $in: visibleWings } }] };
    }
    const query = visibleWings === null ? baseQuery : { ...baseQuery, ...wingFilter };
    const surveys = await Survey.find(query).populate("createdBy", "name").sort({ createdAt: -1 }).lean();
    const now = new Date();
    const expired = surveys.filter((s) => s.status === "active" && new Date(s.endDate) <= now).map((s) => s._id);
    if (expired.length) {
      await Survey.updateMany({ _id: { $in: expired } }, { status: "closed" });
      surveys.forEach((s) => { if (expired.some((id) => String(id) === String(s._id))) s.status = "closed"; });
    }
    // Check if current flat has responded
    let primaryUnit = null;
    if (userId) primaryUnit = await this.getPrimaryUnit(societyId, userId);
    const surveyIds = surveys.map((s) => s._id);
    let responses = [];
    if (userId && surveyIds.length) {
      const q = { societyId, surveyId: { $in: surveyIds }, isActive: true };
      if (primaryUnit?.unitId) q.unitId = primaryUnit.unitId;
      else q.userId = userId;
      responses = await SurveyResponse.find(q).select("surveyId").lean();
    }
    const respondedSet = new Set(responses.map((r) => String(r.surveyId)));
    // Count responses per survey
    const counts = await SurveyResponse.aggregate([
      { $match: { societyId: surveys[0]?.societyId, surveyId: { $in: surveyIds }, isActive: true } },
      { $group: { _id: "$surveyId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    return surveys.map((s) => ({
      id: s._id,
      title: s.title,
      description: s.description,
      questionCount: s.questions.length,
      endDate: s.endDate,
      status: s.status,
      scope: s.scope || "society",
      wing: s.wing || null,
      isClosed: s.status === "closed" || new Date(s.endDate) <= now,
      createdByName: s.createdBy?.name || "Admin",
      createdAt: s.createdAt,
      hasResponded: respondedSet.has(String(s._id)),
      responseCount: countMap.get(String(s._id)) || 0,
    }));
  }

  async getById(societyId, surveyId, userId) {
    let survey = await Survey.findOne({ _id: surveyId, societyId, isActive: true }).populate("createdBy", "name").lean();
    if (!survey) throw new AppError("Survey not found", 404);
    if (survey.scope === "wing" && survey.wing && userId) {
      const visible = await this.isWingVisible(societyId, userId, survey.wing);
      if (!visible) throw new AppError("Not authorized to view this wing survey", 403);
    }
    if (survey.status === "active" && survey.endDate && new Date() > new Date(survey.endDate)) {
      await Survey.updateOne({ _id: survey._id }, { status: "closed" });
      survey.status = "closed";
    }
    const isClosed = survey.status === "closed" || new Date(survey.endDate) <= new Date();
    let hasResponded = false;
    let myResponse = null;
    if (userId) {
      const primaryUnit = await this.getPrimaryUnit(societyId, userId);
      const q = { societyId, surveyId, isActive: true };
      if (primaryUnit?.unitId) q.unitId = primaryUnit.unitId;
      else q.userId = userId;
      myResponse = await SurveyResponse.findOne(q).lean();
      hasResponded = !!myResponse;
    }
    // For results, aggregate if closed or hasResponded
    let results = null;
    if (isClosed || hasResponded) {
      results = await this.getResults(societyId, survey);
    }
    return {
      id: survey._id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions.map((q) => ({ id: q._id, text: q.text, type: q.type, options: (q.options || []).map((o) => o.text) })),
      endDate: survey.endDate,
      status: survey.status,
      scope: survey.scope || "society",
      wing: survey.wing || null,
      isClosed,
      createdByName: survey.createdBy?.name || "Admin",
      hasResponded,
      myAnswers: myResponse?.answers || null,
      results,
    };
  }

  async getResults(societyId, survey) {
    const responses = await SurveyResponse.find({ societyId, surveyId: survey._id, isActive: true }).lean();
    const total = responses.length;
    const results = survey.questions.map((q) => {
      const qid = String(q._id);
      if (q.type === "text") {
        const texts = responses.map((r) => {
          const ans = (r.answers || []).find((a) => String(a.questionId) === qid);
          return ans?.textAnswer || null;
        }).filter(Boolean);
        return { questionId: q._id, text: q.text, type: q.type, total, texts: texts.slice(0, 20), textCount: texts.length };
      } else if (q.type === "rating") {
        const counts = [0,0,0,0,0];
        let sum = 0, cnt = 0;
        responses.forEach((r) => {
          const ans = (r.answers || []).find((a) => String(a.questionId) === qid);
          const rating = ans?.rating || (ans?.selectedOptions?.[0] != null ? ans.selectedOptions[0] + 1 : null);
          if (rating && rating >=1 && rating <=5) { counts[rating-1]++; sum += rating; cnt++; }
          else if (ans?.textAnswer) { const v = parseInt(ans.textAnswer,10); if (v>=1&&v<=5) { counts[v-1]++; sum+=v; cnt++; } }
        });
        const avg = cnt ? (sum/cnt).toFixed(1) : "0.0";
        const options = [1,2,3,4,5].map((star, idx) => ({ text: `${star} ⭐`, votes: counts[idx], percent: total ? Math.round((counts[idx]/total)*100) : 0 }));
        return { questionId: q._id, text: q.text, type: q.type, total, options, avg, distribution: counts };
      } else {
        const counts = new Array((q.options || []).length).fill(0);
        responses.forEach((r) => {
          const ans = (r.answers || []).find((a) => String(a.questionId) === qid);
          if (ans && ans.selectedOptions) ans.selectedOptions.forEach((idx) => { if (idx >=0 && idx < counts.length) counts[idx]++; });
        });
        const options = (q.options || []).map((opt, idx) => ({ text: opt.text, votes: counts[idx], percent: total ? Math.round((counts[idx]/total)*100) : 0 }));
        return { questionId: q._id, text: q.text, type: q.type, total, options };
      }
    });
    return { totalResponses: total, questions: results };
  }

  async submit(societyId, surveyId, userId, answers) {
    let survey = await Survey.findOne({ _id: surveyId, societyId, isActive: true });
    if (!survey) throw new AppError("Survey not found", 404);
    if (survey.scope === "wing" && survey.wing) {
      const visible = await this.isWingVisible(societyId, userId, survey.wing);
      if (!visible) throw new AppError("Not authorized to submit this wing survey", 403);
    }
    if (survey.status === "closed" || new Date(survey.endDate) <= new Date()) {
      if (survey.status !== "closed") { survey.status = "closed"; await survey.save(); }
      throw new AppError("Survey is closed", 400);
    }
    const primaryUnit = await this.getPrimaryUnit(societyId, userId);
    const q = { societyId, surveyId, isActive: true };
    if (primaryUnit?.unitId) q.unitId = primaryUnit.unitId; else q.userId = userId;
    const existing = await SurveyResponse.findOne(q);
    if (existing) throw new AppError("Your flat has already submitted this survey", 409);
    // Validate answers match questions
    const qMap = new Map(survey.questions.map((q) => [String(q._id), q]));
    const normalized = [];
    for (const ans of answers) {
      const qdoc = qMap.get(String(ans.questionId));
      if (!qdoc) throw new AppError(`Invalid questionId ${ans.questionId}`, 400);
      if (qdoc.type === "text") {
        if (!ans.textAnswer || !ans.textAnswer.trim()) throw new AppError(`Text answer required for "${qdoc.text}"`, 400);
        normalized.push({ questionId: qdoc._id, selectedOptions: [], textAnswer: ans.textAnswer.trim() });
      } else if (qdoc.type === "rating") {
        const rating = ans.rating || (ans.selectedOptions?.[0] != null ? ans.selectedOptions[0] + 1 : null) || (ans.textAnswer ? parseInt(ans.textAnswer,10) : null);
        if (!rating || rating < 1 || rating > 5) throw new AppError(`Rating 1-5 required for "${qdoc.text}"`, 400);
        normalized.push({ questionId: qdoc._id, selectedOptions: [rating-1], textAnswer: String(rating), rating });
      } else if (qdoc.type === "single") {
        if (!ans.selectedOptions || ans.selectedOptions.length !== 1) throw new AppError(`Single choice requires 1 option for "${qdoc.text}"`, 400);
        const idx = ans.selectedOptions[0];
        if (idx < 0 || idx >= qdoc.options.length) throw new AppError(`Invalid option for "${qdoc.text}"`, 400);
        normalized.push({ questionId: qdoc._id, selectedOptions: [idx], textAnswer: "" });
      } else if (qdoc.type === "multiple") {
        if (!ans.selectedOptions || ans.selectedOptions.length === 0) throw new AppError(`Select at least 1 option for "${qdoc.text}"`, 400);
        for (const idx of ans.selectedOptions) if (idx <0 || idx >= qdoc.options.length) throw new AppError(`Invalid option for "${qdoc.text}"`, 400);
        const uniq = [...new Set(ans.selectedOptions)];
        normalized.push({ questionId: qdoc._id, selectedOptions: uniq, textAnswer: "" });
      }
    }
    // Ensure all questions answered
    if (normalized.length !== survey.questions.length) throw new AppError("All questions must be answered", 400);
    const response = await SurveyResponse.create({
      societyId, surveyId, userId, unitId: primaryUnit?.unitId || null, unitLabel: primaryUnit?.unitLabel || null, answers: normalized,
    });
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "survey:change", { id: surveyId, action: "submit" }); } catch (_) {}
    return response;
  }

  async close(societyId, surveyId) {
    const survey = await Survey.findOne({ _id: surveyId, societyId, isActive: true });
    if (!survey) throw new AppError("Survey not found", 404);
    if (survey.status === "closed") throw new AppError("Already closed", 400);
    survey.status = "closed";
    await survey.save();
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "survey:change", { id: surveyId, action: "close" }); } catch (_) {}
    return survey;
  }

  async deleteSurvey(societyId, surveyId) {
    const survey = await Survey.findOne({ _id: surveyId, societyId, isActive: true });
    if (!survey) throw new AppError("Survey not found", 404);
    survey.isActive = false;
    await survey.save();
    return survey;
  }

  async update(societyId, surveyId, data) {
    const survey = await Survey.findOne({ _id: surveyId, societyId, isActive: true });
    if (!survey) throw new AppError("Survey not found", 404);

    const responsesCount = await SurveyResponse.countDocuments({ surveyId, societyId, isActive: true });

    if (data.questions !== undefined) {
      if (responsesCount > 0) {
        throw new AppError(
          "Cannot modify survey questions after responses have already been submitted. You can still adjust the title, description, and deadline.",
          400
        );
      }
      survey.questions = data.questions.map((q) => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === "text" || q.type === "rating" ? [] : (q.options || []).map((o) => ({ text: o.trim() })),
      }));
    }

    if (data.title !== undefined) survey.title = data.title.trim();
    if (data.description !== undefined) survey.description = (data.description || "").trim();
    if (data.endDate !== undefined) survey.endDate = new Date(data.endDate);

    await survey.save();
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "survey:change", { id: surveyId, action: "update" }); } catch (_) {}
    return survey;
  }
}

module.exports = new SurveyService();
