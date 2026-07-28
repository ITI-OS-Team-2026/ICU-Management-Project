const service = require("./notification.service");
const catchAsync = require("../../utils/catchAsync");
const APIError = require("../../utils/APIError");
const prisma = require("../../utils/prismaClient");

const summonDoctor = catchAsync(async (req, res, next) => {
  const { id: admissionId } = req.params;
  const { doctorId, reason } = req.body || {};
  
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: { patient: true, bed: true, doctor: true }
  });

  if (!admission) {
    return next(new APIError("Admission not found", 404));
  }

  const targetDoctorId = doctorId || admission.doctorId;
  if (!targetDoctorId) {
    return next(new APIError("No doctor specified for this admission", 400));
  }

  let message = `Nurse ${req.user.firstName} ${req.user.lastName} requires your presence for Patient ${admission.patient.name} in Bed ${admission.bed.bed_number}`;
  if (reason && reason.trim()) {
    message += `. Reason: ${reason}`;
  }
  
  const notification = await service.createNotification({
    userId: targetDoctorId,
    title: "Urgent: Nurse Summons",
    message,
  });

  res.status(200).json({
    status: "success",
    data: { notification }
  });
});

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
  summonDoctor,
};
