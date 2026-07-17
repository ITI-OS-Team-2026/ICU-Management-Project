const patientService = require("./patient.service");

const createPatient = async (req, res, next) => {
  try {
    const patient = await patientService.createPatient(req, req.body);
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

const getPatients = async (req, res, next) => {
  try {
    const result = await patientService.getPatients(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    res.status(200).json(patient);
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    await patientService.deletePatient(req, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const createAllergy = async (req, res, next) => {
  try {
    const allergy = await patientService.createAllergy(req, req.params.id, req.body);
    res.status(201).json(allergy);
  } catch (error) {
    next(error);
  }
};

const getAllergies = async (req, res, next) => {
  try {
    const allergies = await patientService.getAllergies(req.params.id);
    res.status(200).json(allergies);
  } catch (error) {
    next(error);
  }
};

const deleteAllergy = async (req, res, next) => {
  try {
    await patientService.deleteAllergy(req, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const createMedicalHistory = async (req, res, next) => {
  try {
    const history = await patientService.createMedicalHistory(req, req.params.id, req.body);
    res.status(201).json(history);
  } catch (error) {
    next(error);
  }
};

const getMedicalHistory = async (req, res, next) => {
  try {
    const history = await patientService.getMedicalHistory(req.params.id);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

const updateMedicalHistory = async (req, res, next) => {
  try {
    const history = await patientService.updateMedicalHistory(req, req.params.id, req.body);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  deletePatient,
  createAllergy,
  getAllergies,
  deleteAllergy,
  createMedicalHistory,
  getMedicalHistory,
  updateMedicalHistory
};
