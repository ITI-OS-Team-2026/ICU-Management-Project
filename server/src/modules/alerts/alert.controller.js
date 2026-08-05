const catchAsync = require('../../utils/catchAsync');
const alertService = require('./alert.service');

const getAdmissionAlerts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;
  const alerts = await alertService.getAlertsByAdmission(id, status);
  res.status(200).json({ status: 'success', data: alerts });
});

const getAllAlerts = catchAsync(async (req, res) => {
  const alerts = await alertService.getAllAlerts(req.query);
  res.status(200).json({ status: 'success', data: alerts });
});

const submitReview = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { review_notes, accepted } = req.body;
  
  const review = await alertService.submitReview(id, req.user.id, review_notes, accepted);
  res.status(200).json({ status: 'success', data: review });
});

const getReviews = catchAsync(async (req, res) => {
  const reviews = await alertService.getReviewsByAlert(req.params.id);
  res.status(200).json({ status: 'success', data: reviews });
});

module.exports = {
  getAdmissionAlerts,
  getAllAlerts,
  submitReview,
  getReviews
};
