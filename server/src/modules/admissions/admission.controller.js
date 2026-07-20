const admissionService = require("./admission.service");

const createAdmission = async (req, res, next) => {
  try {
    const admission = await admissionService.createAdmission(req, req.body);
    res.status(201).json(admission);
  } catch (error) {
    next(error);
  }
};

const getAdmissions = async (req, res, next) => {
  try {
    const result = await admissionService.getAdmissions(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getAdmissionById = async (req, res, next) => {
  try {
    const admission = await admissionService.getAdmissionById(req.params.id);
    res.status(200).json(admission);
  } catch (error) {
    next(error);
  }
};

const dischargeAdmission = async (req, res, next) => {
  try {
    const admission = await admissionService.dischargeAdmission(req, req.params.id);
    res.status(200).json(admission);
  } catch (error) {
    next(error);
  }
};

const archiveAdmission = async (req, res, next) => {
  try {
    await admissionService.archiveAdmission(req, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const assignNurse = async (req, res, next) => {
  try {
    const assignment = await admissionService.assignNurse(req, req.params.id, req.body);
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

const getAdmissionNurses = async (req, res, next) => {
  try {
    const nurses = await admissionService.getAdmissionNurses(req.params.id);
    res.status(200).json(nurses);
  } catch (error) {
    next(error);
  }
};

const unassignNurse = async (req, res, next) => {
  try {
    await admissionService.unassignNurse(req, req.params.id, req.params.nurseId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  dischargeAdmission,
  archiveAdmission,
  assignNurse,
  getAdmissionNurses,
  unassignNurse,
};
