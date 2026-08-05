const treatmentApprovalService = require("./treatmentApproval.service");

const createTreatmentApproval = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const approval = await treatmentApprovalService.createTreatmentApproval(
      admissionId,
      req.user.id,
      req.user.role,
      req.body,
      req
    );

    res.status(201).json({
      status: "success",
      data: approval,
    });
  } catch (error) {
    next(error);
  }
};

const getTreatmentApprovals = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;

    const approvals = await treatmentApprovalService.getTreatmentApprovals(admissionId, {
      status: req.query.status,
      execution: req.query.execution,
    });

    res.status(200).json({
      status: "success",
      results: approvals.length,
      data: approvals,
    });
  } catch (error) {
    next(error);
  }
};

const decideTreatmentApproval = async (req, res, next) => {
  try {
    const { id } = req.params;

    const approval = await treatmentApprovalService.decideTreatmentApproval(
      id,
      req.user.id,
      req.body.approval_status,
      req
    );

    res.status(200).json({
      status: "success",
      data: approval,
    });
  } catch (error) {
    next(error);
  }
};

const executeTreatmentApproval = async (req, res, next) => {
  try {
    const { id } = req.params;

    const approval = await treatmentApprovalService.executeTreatmentApproval(
      id,
      req.user.id,
      req.body,
      req
    );

    res.status(200).json({
      status: "success",
      data: approval,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTreatmentApproval = async (req, res, next) => {
  try {
    const { id } = req.params;

    await treatmentApprovalService.deleteTreatmentApproval(id, req);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTreatmentApproval,
  getTreatmentApprovals,
  decideTreatmentApproval,
  executeTreatmentApproval,
  deleteTreatmentApproval,
};
