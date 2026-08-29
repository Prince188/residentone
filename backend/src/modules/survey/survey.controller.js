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
  async remove(req, res, next) {
    try {
      await surveyService.deleteSurvey(req.societyId, req.params.id);
      res.json({ success: true, data: { message: "Deleted" } });
    } catch (e) { next(e); }
  }
}

module.exports = new SurveyController();
