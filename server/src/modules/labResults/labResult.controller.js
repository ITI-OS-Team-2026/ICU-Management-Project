const labResultService = require("./labResult.service");

const createLabResult = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const labResult = await labResultService.createLabResult(
      req,
      admissionId,
      req.body,
      req.user.id,
    );
    res.status(201).json(labResult);
  } catch (error) {
    next(error);
  }
};

const getLabResults = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const labResults = await labResultService.getLabResults(admissionId, req.query);
    res.status(200).json(labResults);
  } catch (error) {
    next(error);
  }
};

const deleteLabResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await labResultService.deleteLabResult(req, id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLabResult,
  getLabResults,
  deleteLabResult,
};
