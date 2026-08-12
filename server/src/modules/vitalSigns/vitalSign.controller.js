const vitalSignService = require("./vitalSign.service");

const createVitalSign = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const data = req.body;
    const userId = req.user.id;

    const vitalSign = await vitalSignService.logVitalSign(req, admissionId, data, userId);

    res.status(201).json(vitalSign);
  } catch (error) {
    next(error);
  }
};

const getVitalSigns = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const query = req.query; // { from, to, limit }

    const vitalSigns = await vitalSignService.getVitalSigns(admissionId, query);

    res.status(200).json(vitalSigns);
  } catch (error) {
    next(error);
  }
};

const updateVitalSign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const userId = req.user.id;

    const updatedVitalSign = await vitalSignService.updateVitalSign(req, id, data, userId);

    res.status(200).json(updatedVitalSign);
  } catch (error) {
    next(error);
  }
};

const deleteVitalSign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await vitalSignService.deleteVitalSign(req, id, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVitalSign,
  getVitalSigns,
  updateVitalSign,
  deleteVitalSign,
};
