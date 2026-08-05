const medicationService = require("./medication.service");

// =======================
// PRESCRIPTIONS
// =======================

const createMedication = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const medication = await medicationService.prescribeMedication(req, admissionId, req.body, req.user.id);
    res.status(201).json(medication);
  } catch (error) {
    next(error);
  }
};

const getMedications = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const medications = await medicationService.getMedications(admissionId, req.query);
    res.status(200).json(medications);
  } catch (error) {
    next(error);
  }
};

const getMar = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const mar = await medicationService.getMar(admissionId, req.query);
    res.status(200).json(mar);
  } catch (error) {
    next(error);
  }
};

const updateMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await medicationService.updateMedication(req, id, req.body, req.user.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteMedication = async (req, res, next) => {
  try {
    const { id } = req.params;
    await medicationService.discontinueMedication(req, id, req.body, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// =======================
// ADMINISTRATIONS (eMAR)
// =======================

const logAdministration = async (req, res, next) => {
  try {
    const { id: medicationId } = req.params;
    const administration = await medicationService.logAdministration(
      req,
      medicationId,
      req.body,
      req.user.id
    );
    res.status(201).json(administration);
  } catch (error) {
    next(error);
  }
};

const getAdministrations = async (req, res, next) => {
  try {
    const { id: medicationId } = req.params;
    const administrations = await medicationService.getAdministrations(medicationId);
    res.status(200).json(administrations);
  } catch (error) {
    next(error);
  }
};

const updateAdministration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await medicationService.updateAdministration(req, id, req.body, req.user.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteAdministration = async (req, res, next) => {
  try {
    const { id } = req.params;
    await medicationService.deleteAdministration(req, id, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMedication,
  getMedications,
  getMar,
  updateMedication,
  deleteMedication,
  logAdministration,
  getAdministrations,
  updateAdministration,
  deleteAdministration,
};
