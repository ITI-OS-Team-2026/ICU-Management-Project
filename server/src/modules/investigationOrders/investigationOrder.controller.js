const investigationOrderService = require("./investigationOrder.service");

const createInvestigationOrder = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const order = await investigationOrderService.createInvestigationOrder(
      admissionId,
      req.body,
      req.user.id,
    );
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const getInvestigationOrders = async (req, res, next) => {
  try {
    const { id: admissionId } = req.params;
    const orders = await investigationOrderService.getInvestigationOrders(admissionId);
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const updateInvestigationOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await investigationOrderService.updateInvestigationOrder(id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvestigationOrder,
  getInvestigationOrders,
  updateInvestigationOrder,
};
