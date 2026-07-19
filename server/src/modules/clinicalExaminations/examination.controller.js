const examinationService = require("./examination.service");

const createExamination = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const data = req.body;
    const examinerId = req.user.id;

    const examination = await examinationService.createExamination(admissionId, examinerId, data);

    res.status(201).json(examination);
  } catch (error) {
    next(error);
  }
};

const getExaminations = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const examinations = await examinationService.getExaminations(admissionId);

    res.status(200).json(examinations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExamination,
  getExaminations
};
