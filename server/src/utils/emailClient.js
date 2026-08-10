const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const env = require("../config/env");
const logger = require("./logger");

// ── Build provider ──────────────────────────────────────────────────────────
let smtpTransporter = null;
let resendClient = null;

if (env.emailProvider === "resend" && env.resendApiKey) {
  resendClient = new Resend(env.resendApiKey);
  logger.info("Email provider: Resend (HTTP API)");
} else if (env.smtpHost) {
  smtpTransporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  logger.info(`Email provider: SMTP (${env.smtpHost}:${env.smtpPort})`);
} else {
  logger.warn("No email provider configured (set EMAIL_PROVIDER + credentials).");
}

// ── Send ────────────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html }) => {
  // Resend (HTTP — works on Railway)
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: env.resendFrom,
        to,
        subject,
        html,
      });
      if (error) {
        logger.error(`Resend API error for ${to}: ${error.message}`);
        throw new Error(error.message);
      }
      logger.info(`Email sent via Resend to ${to}: ${data.id}`);
      return data;
    } catch (err) {
      logger.error(`Email delivery failed (Resend) for ${to}: ${err.message}`);
      throw err;
    }
  }

  // SMTP (local dev)
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({ from: env.smtpFrom, to, subject, html });
      logger.info(`Email sent via SMTP to ${to}: ${info.messageId}`);
      return info;
    } catch (err) {
      logger.error(`Email delivery failed (SMTP) for ${to}: [${err.code || "ERR"}] ${err.message}`);
      throw err;
    }
  }

  // No provider
  logger.warn(`Email not configured — would have sent "${subject}" to ${to}`);
  return null;
};

module.exports = { sendMail };
