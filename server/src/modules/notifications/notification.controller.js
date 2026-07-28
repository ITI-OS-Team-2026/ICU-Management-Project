const service = require("./notification.service");
const catchAsync = require("../../utils/catchAsync");
const APIError = require("../../utils/APIError");

const getNotifications = catchAsync(async (req, res) => {
  const { status, limit } = req.query;
  
  const notifications = await service.getUserNotifications(req.user.id, {
    status,
    limit: limit ? parseInt(limit, 10) : 50,
  });

  res.status(200).json({
    status: "success",
    data: { notifications },
  });
});

const markAsRead = catchAsync(async (req, res, next) => {
  try {
    const notification = await service.markAsRead(req.params.id, req.user.id);
    res.status(200).json({
      status: "success",
      data: { notification },
    });
  } catch (err) {
    return next(new APIError(err.message, 404));
  }
});

module.exports = {
  getNotifications,
  markAsRead,
};
