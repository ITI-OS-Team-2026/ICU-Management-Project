const diagnosisService = require("./diagnosis.service");

const createDiagnosis = async (req, res, next) => {
  try {
    const admissionId = req.params.id;
    const diagnosis = await diagnosisService.createDiagnosis(req, admissionId, req.body, req.user.id);
    res.status(201).json(diagnosis);
  } catch (error) {
    next(error);
  }
};

const getDiagnoses = async (req, res, next) => {
  try {
    const admissionId = req.params.id;
    const diagnoses = await diagnosisService.getDiagnoses(admissionId, req.query);
    res.status(200).json(diagnoses);
  } catch (error) {
    next(error);
  }
};

const updateDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await diagnosisService.updateDiagnosis(req, req.params.id, req.body, req.user.id);
    res.status(200).json(diagnosis);
  } catch (error) {
    next(error);
  }
};

const changeStatus = async (req, res, next) => {
  try {
    const diagnosis = await diagnosisService.changeStatus(req, req.params.id, req.body, req.user.id);
    res.status(200).json(diagnosis);
  } catch (error) {
    next(error);
  }
};

const deleteDiagnosis = async (req, res, next) => {
  try {
    await diagnosisService.deleteDiagnosis(req, req.params.id, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const acknowledgeDiagnosis = async (req, res, next) => {
  try {
    const acknowledgement = await diagnosisService.acknowledgeDiagnosis(req, req.params.id, req.user.id);
    res.status(201).json(acknowledgement);
  } catch (error) {
    next(error);
  }
};

const raiseConcern = async (req, res, next) => {
  try {
    const concern = await diagnosisService.raiseConcern(req, req.params.id, req.body, req.user.id);
    res.status(201).json(concern);
  } catch (error) {
    next(error);
  }
};

const respondToConcern = async (req, res, next) => {
  try {
    const concern = await diagnosisService.respondToConcern(req, req.params.id, req.body, req.user.id);
    res.status(200).json(concern);
  } catch (error) {
    next(error);
  }
};

const getOpenConcerns = async (req, res, next) => {
  try {
    const concerns = await diagnosisService.getOpenConcerns(req.params.id);
    res.status(200).json(concerns);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDiagnosis,
  getDiagnoses,
  updateDiagnosis,
  changeStatus,
  deleteDiagnosis,
  acknowledgeDiagnosis,
  raiseConcern,
  respondToConcern,
  getOpenConcerns,
};
