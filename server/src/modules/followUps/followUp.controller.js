const followUpService = require("./followUp.service");


const createFollowUp = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const authorId = req.user.id;

    const followUp = await followUpService.createFollowUp(admissionId, authorId, req.body, req);

    res.status(201).json({
      status: "success",
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

const getFollowUps = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const followUps = await followUpService.getFollowUps(admissionId);

    res.status(200).json({
      status: "success",
      results: followUps.length,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
};

const deleteFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;

    await followUpService.deleteFollowUp(id, req);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFollowUp,
  getFollowUps,
  deleteFollowUp,
};
