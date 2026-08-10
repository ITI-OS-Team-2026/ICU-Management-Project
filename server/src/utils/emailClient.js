const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("./logger");

const transporter = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: Number(env.smtpPort) || 587,
      secure: Number(env.smtpPort) === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    })
  : null;

const verifyTransporter = async () => {
  if (!transporter) {
    logger.warn("SMTP email client is not configured (SMTP_HOST missing).");
    return false;
  }
  try {
    await transporter.verify();
    logger.info(`SMTP transporter verified successfully for host ${env.smtpHost}:${env.smtpPort}`);
    return true;
  } catch (err) {
    logger.error(`SMTP transporter verification failed (${env.smtpHost}:${env.smtpPort}): [${err.code || "ERR"}] ${err.message}`);
    return false;
  }
};

const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    logger.warn(`Email not configured — would have sent "${subject}" to ${to}`);
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email delivery failed for ${to}: [${err.code || "ERR"}] ${err.message}`);
    throw err;
  }
};

module.exports = { sendMail, verifyTransporter, transporter };
