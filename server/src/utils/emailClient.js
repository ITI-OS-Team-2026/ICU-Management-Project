const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("./logger");

const transporter = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    })
  : null;

const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    logger.warn(`Email not configured — would have sent "${subject}" to ${to}`);
    return null;
  }
  const info = await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
  });
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
};

module.exports = { sendMail };
