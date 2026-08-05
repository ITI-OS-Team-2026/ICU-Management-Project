const swaggerJsdoc = require("swagger-jsdoc");
const config = require("./env");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "SmartCare ICU API",
      version: "1.0.0",
      description:
        "REST API for the SmartCare ICU Management System — patients, admissions, " +
        "vitals, medications, labs, diagnoses, notes, alerts, AI assistant, and " +
        "admin tooling.\n\n" +
        "Authentication is a `smartcare_token` HttpOnly cookie set by `POST /auth/login`. " +
        "There is no bearer-token flow — the browser sends the cookie automatically, and " +
        "the \"Authorize\" button below only matters if you're calling the API from a tool " +
        "(curl, Postman, this page's \"Try it out\") outside a browser session.",
    },
    servers: [
      { url: `http://localhost:${config.port}/api`, description: "Local development" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "smartcare_token",
          description: "JWT issued by POST /auth/login, stored as an HttpOnly cookie.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: { type: "string", example: "Resource not found" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: "Auth", description: "Login, logout, session, password change" },
      { name: "Admin - Users", description: "User account management (SYSTEM_ADMIN)" },
      { name: "Admin - Beds", description: "Bed inventory management (SYSTEM_ADMIN)" },
      { name: "Admin - Audit Logs", description: "System audit trail (SYSTEM_ADMIN)" },
      { name: "Admin - Login Attempts", description: "Login attempt history (SYSTEM_ADMIN)" },
      { name: "Password Reset Requests", description: "In-app assisted password reset workflow" },
      { name: "Patients", description: "Patient records" },
      { name: "Admissions", description: "ICU admissions, nurse assignment, discharge" },
      { name: "Diagnoses", description: "Diagnoses and clinical concerns" },
      { name: "Vitals", description: "Vital sign recordings" },
      { name: "Medications", description: "Prescriptions and medication administration" },
      { name: "Investigation Orders", description: "Ordered investigations/imaging" },
      { name: "Lab Results", description: "Laboratory results" },
      { name: "Clinical Examinations", description: "Structured exam findings" },
      { name: "Notes", description: "Clinical and nursing notes" },
      { name: "Follow-Ups", description: "Scheduled clinical follow-ups" },
      { name: "Documents", description: "Uploaded medical documents" },
      { name: "AI", description: "AI-generated summaries and query logs" },
      { name: "RAG", description: "Retrieval-augmented chat over a patient's documents" },
      { name: "Treatment Approvals", description: "Treatment approval workflow" },
      { name: "Alerts", description: "Clinical alerts" },
      { name: "Notifications", description: "In-app notifications" },
    ],
  },
  // Every router file carries its own @swagger JSDoc blocks.
  apis: ["./src/modules/**/*.routes.js"],
};

module.exports = swaggerJsdoc(options);
