const request = require("supertest");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const app = require("../../../app");
const prisma = require("../../../src/utils/prismaClient");
const config = require("../../../src/config/env");

const COOKIE_NAME = config.cookieName || "token";

const CARDIOLOGY_NOTE = `ICU PROGRESS REPORT - CARDIOLOGY CONSULT

The twelve lead ECG demonstrates ST segment elevation across leads V1 through V4,
consistent with an acute anterior myocardial infarction.

Echocardiography reports an ejection fraction of 38 percent with anterior wall
hypokinesis. No pericardial effusion is seen.

Renal function: serum creatinine 1.4 mg/dL, up from a baseline of 0.9 mg/dL,
suggestive of early contrast associated renal impairment.`;

const NEPHROLOGY_NOTE = `NEPHROLOGY REVIEW FOR A DIFFERENT PATIENT

Peritoneal dialysis was commenced for refractory hyperkalaemia.
The potassium level of 6.8 mmol/L responded to treatment.`;

describe("RAG Assistant API (retrieval-augmented generation)", () => {
  const stamp = Date.now() % 100000;
  const uploadDir = path.join(__dirname, "../../../uploads/documents");

  let residentToken;
  let specialistToken;
  let nurseToken;
  let resident;

  // Primary admission — has a document, vitals and a lab result.
  let admission;
  let document;
  // Second admission — used to prove retrieval never crosses admissions.
  let otherAdmission;
  let otherDocument;
  // Third admission — has no clinical data at all.
  let emptyAdmission;

  const createdFiles = [];

  const tokenFor = async (email, role) => {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: "Test",
          lastName: role,
          passwordHash: "dummyhash",
          role,
          status: "ACTIVE",
        },
      });
    }
    return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret || "secret", {
      expiresIn: "12h",
    });
  };

  const createAdmission = async (suffix) => {
    const patient = await prisma.patient.create({
      data: { name: `RAG Patient ${suffix}`, age: 60, mrn: `MRN-RAG-${stamp}-${suffix}` },
    });
    const bed = await prisma.bed.create({
      data: { bedNumber: `RAG${stamp}${suffix}`, status: "OCCUPIED" },
    });
    return prisma.admission.create({
      data: {
        patientId: patient.id,
        bedId: bed.id,
        doctorId: resident.id,
        status: "ACTIVE",
        chiefComplaint: `Chest pain case ${suffix}`,
      },
    });
  };

  const uploadDocument = async (targetAdmission, filename, contents) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `rag-test-${stamp}-${filename}`);
    fs.writeFileSync(filePath, contents, "utf8");
    createdFiles.push(filePath);

    return prisma.medicalDocument.create({
      data: {
        admissionId: targetAdmission.id,
        uploadedBy: resident.id,
        documentType: "clinical",
        originalFilename: filename,
        filePath,
        mimeType: "text/plain",
        fileSize: Buffer.byteLength(contents),
        embeddingStatus: "PENDING",
      },
    });
  };

  const indexAndWait = async (documentId) => {
    const { indexDocument } = require("./indexing.service");
    return indexDocument(documentId);
  };

  beforeAll(async () => {
    residentToken = await tokenFor("resident.rag@example.com", "MEDICAL_RESIDENT");
    specialistToken = await tokenFor("specialist.rag@example.com", "ICU_SPECIALIST");
    nurseToken = await tokenFor("nurse.rag@example.com", "ICU_NURSE");

    resident = await prisma.user.findUnique({ where: { email: "resident.rag@example.com" } });

    admission = await createAdmission("A");
    otherAdmission = await createAdmission("B");
    emptyAdmission = await createAdmission("C");

    await prisma.vitalSign.create({
      data: {
        admissionId: admission.id,
        recordedById: resident.id,
        temperature: 37.4,
        pulse: 112,
        systolicBp: 96,
        diastolicBp: 58,
        respiratoryRate: 22,
        spo2: 91,
      },
    });

    await prisma.labResult.create({
      data: {
        admissionId: admission.id,
        recordedById: resident.id,
        testName: "Serum Creatinine",
        resultValue: "1.4 mg/dL",
        abnormal: true,
      },
    });

    document = await uploadDocument(admission, "cardiology-consult.txt", CARDIOLOGY_NOTE);
    otherDocument = await uploadDocument(otherAdmission, "nephrology-review.txt", NEPHROLOGY_NOTE);

    await indexAndWait(document.id);
    await indexAndWait(otherDocument.id);
  }, 60000);

  afterAll(async () => {
    const admissionIds = [admission.id, otherAdmission.id, emptyAdmission.id];

    await prisma.aiQueryLog.deleteMany({ where: { admissionId: { in: admissionIds } } });
    await prisma.documentEmbedding.deleteMany({ where: { admissionId: { in: admissionIds } } });
    await prisma.medicalDocument.deleteMany({ where: { admissionId: { in: admissionIds } } });
    await prisma.vitalSign.deleteMany({ where: { admissionId: { in: admissionIds } } });
    await prisma.labResult.deleteMany({ where: { admissionId: { in: admissionIds } } });

    const admissions = await prisma.admission.findMany({
      where: { id: { in: admissionIds } },
      select: { patientId: true, bedId: true },
    });

    await prisma.admission.deleteMany({ where: { id: { in: admissionIds } } });
    await prisma.bed.deleteMany({ where: { id: { in: admissions.map((a) => a.bedId) } } });
    await prisma.patient.deleteMany({ where: { id: { in: admissions.map((a) => a.patientId) } } });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["resident.rag@example.com", "specialist.rag@example.com", "nurse.rag@example.com"],
        },
      },
    });

    for (const file of createdFiles) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  // ── Indexing ───────────────────────────────────────────────────────────────

  describe("Document indexing", () => {
    it("embeds the uploaded document into searchable chunks", async () => {
      const indexed = await prisma.medicalDocument.findUnique({ where: { id: document.id } });

      expect(indexed.embeddingStatus).toBe("COMPLETED");
      expect(indexed.chunkCount).toBeGreaterThan(0);
      expect(indexed.embeddingModel).toEqual(expect.any(String));

      const chunkCount = await prisma.documentEmbedding.count({
        where: { documentId: document.id },
      });
      expect(chunkCount).toBe(indexed.chunkCount);
    });

    it("GET /api/rag/admissions/:admissionId/index reports knowledge-base status", async () => {
      const res = await request(app)
        .get(`/api/rag/admissions/${admission.id}/index`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.counts.completed).toBe(1);
      expect(res.body.data.is_searchable).toBe(true);
      expect(res.body.data.indexed_chunks).toBeGreaterThan(0);
      expect(res.body.data.documents[0]).toHaveProperty("embedding_status", "COMPLETED");
    });

    it("allows a nurse to read index status so they can confirm their upload landed", async () => {
      const res = await request(app)
        .get(`/api/rag/admissions/${admission.id}/index`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(200);
    });

    it("GET /api/rag/documents/:documentId/chunks exposes what the AI can see", async () => {
      const res = await request(app)
        .get(`/api/rag/documents/${document.id}/chunks`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBeGreaterThan(0);
      expect(res.body.data.chunks[0]).toHaveProperty("chunk_text");
      expect(res.body.data.chunks[0].chunk_text).toEqual(expect.stringContaining("ejection fraction"));
    });

    it("POST /api/rag/documents/:documentId/reindex re-embeds the document", async () => {
      const res = await request(app)
        .post(`/api/rag/documents/${document.id}/reindex`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.embedding_status).toBe("COMPLETED");
      expect(res.body.data.chunk_count).toBeGreaterThan(0);
    }, 30000);

    it("does not let a nurse trigger a re-index", async () => {
      const res = await request(app)
        .post(`/api/rag/documents/${document.id}/reindex`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("returns 404 for an unknown document", async () => {
      const res = await request(app)
        .get("/api/rag/documents/00000000-0000-0000-0000-000000000000/status")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── Querying ───────────────────────────────────────────────────────────────

  describe("POST /api/rag/query", () => {
    it("answers a resident's question with citations and retrieval metadata", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: admission.id,
          question: "What did the echocardiography show about ejection fraction?",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.ai_response).toEqual(expect.any(String));
      expect(Array.isArray(res.body.data.cited_sources)).toBe(true);
      expect(res.body.data.cited_sources.length).toBeGreaterThan(0);
      expect(res.body.data.retrieval.document_chunks_retrieved).toBeGreaterThan(0);
      expect(res.body.data.retrieval.embedding_model).toEqual(expect.any(String));
    }, 30000);

    it("cites structured clinical records alongside document chunks", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`)
        .send({ admission_id: admission.id, question: "What is the latest SpO2 reading?" });

      expect(res.statusCode).toBe(200);

      const types = res.body.data.cited_sources.map((source) => source.type);
      expect(types).toContain("vital_signs");
    }, 30000);

    it("never retrieves another admission's documents", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ admission_id: admission.id, question: "Was peritoneal dialysis started?" });

      expect(res.statusCode).toBe(200);

      const documentIds = res.body.data.cited_sources
        .filter((source) => source.type === "document_chunk")
        .map((source) => source.document_id);

      expect(documentIds).not.toContain(otherDocument.id);
      expect(res.body.data.ai_response).not.toEqual(expect.stringContaining("hyperkalaemia"));
    }, 30000);

    it("returns an explicit no-answer state when the admission has nothing recorded", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ admission_id: emptyAdmission.id, question: "What are the latest vitals?" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.retrieval.mode).toBe("no_context");
      expect(res.body.data.ai_response).toEqual(
        expect.stringContaining("Not enough recorded data")
      );
      expect(res.body.data.cited_sources).toEqual([]);
    }, 30000);

    it("rejects a nurse", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`)
        .send({ admission_id: admission.id, question: "Any allergies recorded?" });

      expect(res.statusCode).toBe(403);
    });

    it("returns 400 when the question is missing", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ admission_id: admission.id });

      expect(res.statusCode).toBe(400);
    });

    it("returns 404 for an unknown admission", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: "00000000-0000-0000-0000-000000000000",
          question: "What are the latest vitals?",
        });

      expect(res.statusCode).toBe(404);
    });

    it("keeps the legacy POST /api/ai/query contract working", async () => {
      const res = await request(app)
        .post("/api/ai/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          admission_id: admission.id,
          question: "What is the creatinine trend?",
          include_history: true,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("ai_response");
      expect(res.body.data).toHaveProperty("cited_sources");
    }, 30000);
  });

  // ── Conversation history ───────────────────────────────────────────────────

  describe("Conversation history", () => {
    it("GET /api/rag/admissions/:admissionId/history returns the transcript oldest first", async () => {
      const res = await request(app)
        .get(`/api/rag/admissions/${admission.id}/history`)
        .query({ limit: 20 })
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty("question");
      expect(res.body.data[0]).toHaveProperty("ai_response");
      expect(res.body.data[0]).toHaveProperty("cited_sources");

      const timestamps = res.body.data.map((entry) => new Date(entry.created_at).getTime());
      const sorted = [...timestamps].sort((a, b) => a - b);
      expect(timestamps).toEqual(sorted);
    });

    it("rejects a nurse reading the transcript", async () => {
      const res = await request(app)
        .get(`/api/rag/admissions/${admission.id}/history`)
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("DELETE /api/rag/admissions/:admissionId/history clears the conversation", async () => {
      const res = await request(app)
        .delete(`/api/rag/admissions/${admission.id}/history`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBeGreaterThan(0);

      const after = await request(app)
        .get(`/api/rag/admissions/${admission.id}/history`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(after.body.results).toBe(0);
    });
  });
});
