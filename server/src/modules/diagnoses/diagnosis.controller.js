const diagnosisService = require("./diagnosis.service");

const createDiagnosis = async (req, res, next) => {
  try {
    const admissionId = req.params.id;
    const diagnosis = await diagnosisService.createDiagnosis(
      admissionId,
      req.body,
      req.user.id
    );
    res.status(201).json(diagnosis);
  } catch (error) {
    next(error);
  }
};

const getDiagnoses = async (req, res, next) => {
  try {
    const admissionId = req.params.id;
    const diagnoses = await diagnosisService.getDiagnoses(admissionId);
    res.status(200).json(diagnoses);
  } catch (error) {
    next(error);
  }
};

const updateDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await diagnosisService.updateDiagnosis(req.params.id, req.body, req.user.id);
    res.status(200).json(diagnosis);
  } catch (error) {
    next(error);
  }
};

const deleteDiagnosis = async (req, res, next) => {
  try {
    const id = req.params.id;
    await diagnosisService.deleteDiagnosis(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDiagnosis,
  getDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
};
