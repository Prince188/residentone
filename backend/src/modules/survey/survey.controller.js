const surveyService = require("./survey.service");

class SurveyController {
  async list(req, res, next) {
    try {
      const surveys = await surveyService.listForSociety(req.societyId, req.userId);
      res.json({ success: true, data: surveys });
    } catch (e) { next(e); }
  }
  async getById(req, res, next) {
    try {
      const survey = await surveyService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: survey });
    } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      const survey = await surveyService.create(req.societyId, req.userId, req.body);
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        pushNotificationService.sendPushToSociety({
          societyId: req.societyId,
          title: `📝 New Survey: ${req.body.title || 'Resident Survey'}`,
          body: "Tap to share your feedback.",
          data: { screen: "Surveys" },
        });
      } catch (_) {}
      res.status(201).json({ success: true, data: { id: survey._id, title: survey.title } });
    } catch (e) { next(e); }
  }
  async submit(req, res, next) {
    try {
      await surveyService.submit(req.societyId, req.params.id, req.userId, req.body.answers);
      const survey = await surveyService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: survey });
    } catch (e) { next(e); }
  }
  async close(req, res, next) {
    try {
      await surveyService.close(req.societyId, req.params.id);
      const survey = await surveyService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: survey });
    } catch (e) { next(e); }
  }
  async update(req, res, next) {
    try {
      await surveyService.update(req.societyId, req.params.id, req.body);
      const survey = await surveyService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: survey });
    } catch (e) { next(e); }
  }
  async reopen(req, res, next) {
    try {
      await surveyService.reopen(req.societyId, req.params.id, req.body?.endDate);
      const survey = await surveyService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: survey });
    } catch (e) { next(e); }
  }
  async exportExcel(req, res, next) {
    try {
      const buffer = await surveyService.generateExcelBuffer(req.societyId, req.params.id);
      const filename = `Survey_Responses_${req.params.id.slice(-6)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (e) { next(e); }
  }
  async remove(req, res, next) {
    try {
      await surveyService.deleteSurvey(req.societyId, req.params.id);
      res.json({ success: true, data: { message: "Deleted" } });
    } catch (e) { next(e); }
  }
}

module.exports = new SurveyController();
