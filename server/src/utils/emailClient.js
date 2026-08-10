const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("./logger");

// ── SMTP Transporter (Local Dev Fallback) ───────────────────────────────────
let smtpTransporter = null;
if (env.smtpHost) {
  smtpTransporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
}

// Log selected email provider
if (env.emailProvider === "brevo" && env.brevoApiKey) {
  logger.info("Email provider: Brevo (HTTP API over HTTPS)");
} else if (env.smtpHost) {
  logger.info(`Email provider: SMTP (${env.smtpHost}:${env.smtpPort})`);
} else {
  logger.warn("No email provider configured (set BREVO_API_KEY or SMTP_HOST).");
}

// ── Send Email via Brevo HTTP API ───────────────────────────────────────────
const sendViaBrevo = async ({ to, subject, html }) => {
  const url = "https://api.brevo.com/v3/smtp/email";
  const payload = {
    sender: {
      name: env.emailFromName || "SmartCare ICU",
      email: env.emailFrom || env.smtpUser || "tempitisayed1@gmail.com",
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  const fetchFn = typeof fetch === "function" ? fetch : require("node-fetch");
  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      "api-key": env.brevoApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = responseData.message || responseData.code || response.statusText;
    logger.error(`Brevo API Error [HTTP ${response.status}] sending to ${to}: ${errorMsg}`);
    throw new Error(`Email provider (Brevo) failed: ${errorMsg}`);
  }

  logger.info(`Email sent via Brevo to ${to} (MessageID: ${responseData.messageId || "N/A"})`);
  return responseData;
};

// ── Send Email via SMTP ──────────────────────────────────────────────────────
const sendViaSmtp = async ({ to, subject, html }) => {
  if (!smtpTransporter) {
    throw new Error("SMTP transporter is not configured");
  }
  const info = await smtpTransporter.sendMail({
    from: env.smtpFrom || env.emailFrom,
    to,
    subject,
    html,
  });
  logger.info(`Email sent via SMTP to ${to}: ${info.messageId}`);
  return info;
};

// ── Main sendMail export ────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html }) => {
  if (env.emailProvider === "brevo" && env.brevoApiKey) {
    return await sendViaBrevo({ to, subject, html });
  }

  if (smtpTransporter) {
    return await sendViaSmtp({ to, subject, html });
  }

  // Fallback if BREVO_API_KEY is present even if provider wasn't explicitly set
  if (env.brevoApiKey) {
    return await sendViaBrevo({ to, subject, html });
  }

  logger.warn(`Email not configured — would have sent "${subject}" to ${to}`);
  return null;
};

// ── Transporter/Connection Verification Export ──────────────────────────────
const verifyTransporter = async () => {
  if (env.emailProvider === "brevo" || env.brevoApiKey) {
    if (!env.brevoApiKey) {
      throw new Error("BREVO_API_KEY is missing");
    }
    return true;
  }
  if (smtpTransporter) {
    return await smtpTransporter.verify();
  }
  throw new Error("No email provider configured");
};

module.exports = { sendMail, verifyTransporter };
