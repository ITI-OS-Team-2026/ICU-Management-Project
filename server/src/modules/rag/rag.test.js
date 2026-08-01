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
    // Chat resources live in cloud storage, which no cascade can reach — purge
    // them before the users (and with them the chats) are deleted.
    const { purgeResourcesForSessions } = require("./chatResources.service");
    const testSessions = await prisma.aiChatSession.findMany({
      where: { user: { email: { endsWith: ".rag@example.com" } } },
      select: { id: true },
    });
    await purgeResourcesForSessions(testSessions.map((s) => s.id));

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

  // ── Saved assistant chats ──────────────────────────────────────────────────

  describe("Saved assistant chats (knowledge mode)", () => {
    const askKnowledge = (token, body) =>
      request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${token}`)
        .send({ mode: "knowledge", ...body });

    let chatId;

    it("starts a chat on the first question and returns its id", async () => {
      const res = await askKnowledge(residentToken, {
        question: "What is the pathophysiology of acute kidney injury?",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.chat_id).toEqual(expect.any(String));
      expect(res.body.data.query_mode).toBe("knowledge");

      chatId = res.body.data.chat_id;
    }, 30000);

    it("GET /api/rag/chats lists it with a title derived from the question", async () => {
      const res = await request(app)
        .get("/api/rag/chats")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);

      const chat = res.body.data.find((entry) => entry.id === chatId);
      expect(chat).toBeDefined();
      expect(chat.title).toBe("What is the pathophysiology of acute kidney injury?");
      expect(chat.message_count).toBe(2);
      expect(chat.last_message_at).toEqual(expect.any(String));
    });

    it("GET /api/rag/chats/:chatId returns the transcript oldest first", async () => {
      const res = await request(app)
        .get(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.messages).toHaveLength(2);
      expect(res.body.data.messages[0].role).toBe("user");
      expect(res.body.data.messages[1].role).toBe("assistant");
      expect(res.body.data.messages[1].content).toEqual(expect.any(String));
    });

    it("appends a follow-up to the same chat instead of starting a new one", async () => {
      const res = await askKnowledge(residentToken, {
        question: "And what are the main risk factors?",
        chat_id: chatId,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.chat_id).toBe(chatId);

      const transcript = await request(app)
        .get(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(transcript.body.data.messages).toHaveLength(4);
    }, 30000);

    it("PATCH /api/rag/chats/:chatId renames the chat", async () => {
      const res = await request(app)
        .patch(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({ title: "AKI reading notes" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe("AKI reading notes");
    });

    it("hides one clinician's chats from another", async () => {
      const list = await request(app)
        .get("/api/rag/chats")
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(list.body.data.some((entry) => entry.id === chatId)).toBe(false);

      const read = await request(app)
        .get(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(read.statusCode).toBe(404);

      const remove = await request(app)
        .delete(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(remove.statusCode).toBe(404);
    });

    it("rejects a nurse listing chats", async () => {
      const res = await request(app)
        .get("/api/rag/chats")
        .set("Cookie", `${COOKIE_NAME}=${nurseToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("rejects chat_id on a patient-mode query", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          mode: "patient",
          admission_id: admission.id,
          question: "What are the latest vitals?",
          chat_id: chatId,
        });

      expect(res.statusCode).toBe(400);
    });

    it("DELETE /api/rag/chats/:chatId removes the chat and its messages", async () => {
      const res = await request(app)
        .delete(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages_deleted).toBe(4);

      const after = await request(app)
        .get(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(after.statusCode).toBe(404);

      const orphans = await prisma.aiChatMessage.count({ where: { sessionId: chatId } });
      expect(orphans).toBe(0);
    });

    it("DELETE /api/rag/chats removes every chat the clinician owns", async () => {
      await askKnowledge(residentToken, { question: "What defines refractory hypoxaemia?" });

      const res = await request(app)
        .delete("/api/rag/chats")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBeGreaterThan(0);

      const after = await request(app)
        .get("/api/rag/chats")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(after.body.results).toBe(0);
    }, 30000);
  });

  // ── Chat resources ─────────────────────────────────────────────────────────

  describe("Chat resources (files attached to a chat)", () => {
    // Deliberately invented content: if an answer repeats these rules, it can
    // only have come from this attachment, never from the model's own training.
    const KESTREL_PROTOCOL = `KESTREL WARD LOCAL PROTOCOL — SEDATION LADDER

The Kestrel sedation ladder has exactly four rungs, named Amber, Cobalt, Marlow
and Quill. Escalation proceeds Amber to Cobalt to Marlow to Quill, never skipping
a rung. The Quill rung is prohibited between 02:00 and 05:00 unless a second
consultant countersigns in the Kestrel register.`;

    const createChat = async (token, title) => {
      const res = await request(app)
        .post("/api/rag/chats")
        .set("Cookie", `${COOKIE_NAME}=${token}`)
        .send({ title });

      expect(res.statusCode).toBe(201);
      return res.body.data.id;
    };

    const attach = (token, chatId, filename, contents, contentType) =>
      request(app)
        .post(`/api/rag/chats/${chatId}/resources`)
        .set("Cookie", `${COOKIE_NAME}=${token}`)
        .attach("file", Buffer.from(contents), { filename, contentType });

    /** Indexing runs out of band — wait for it the way the UI polls. */
    const waitForIndexing = async (token, chatId, resourceId) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop -- polling by design
        const res = await request(app)
          .get(`/api/rag/chats/${chatId}/resources`)
          .set("Cookie", `${COOKIE_NAME}=${token}`);

        const resource = res.body.data.find((entry) => entry.id === resourceId);
        if (resource && !["PENDING", "PROCESSING"].includes(resource.embedding_status)) {
          return resource;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw new Error("Resource never finished indexing");
    };

    let chatId;
    let otherChatId;
    let resourceId;
    let askResult;

    beforeAll(async () => {
      chatId = await createChat(residentToken, "Protocol review");
      otherChatId = await createChat(residentToken, "Unrelated chat");
    });

    it("attaches a file to the chat and indexes it", async () => {
      const res = await attach(
        residentToken,
        chatId,
        "kestrel-protocol.txt",
        KESTREL_PROTOCOL,
        "text/plain"
      );

      expect(res.statusCode).toBe(201);
      expect(res.body.data.original_filename).toBe("kestrel-protocol.txt");
      expect(res.body.data.chat_id).toBe(chatId);

      resourceId = res.body.data.id;

      const indexed = await waitForIndexing(residentToken, chatId, resourceId);
      expect(indexed.embedding_status).toBe("COMPLETED");
      expect(indexed.is_searchable).toBe(true);
      expect(indexed.chunk_count).toBeGreaterThan(0);
    }, 40000);

    it("stores the resource against the chat, not an admission", async () => {
      const row = await prisma.medicalDocument.findUnique({ where: { id: resourceId } });

      expect(row.chatSessionId).toBe(chatId);
      expect(row.admissionId).toBeNull();
    });

    it("rejects an unsupported file type", async () => {
      const res = await attach(
        residentToken,
        chatId,
        "notes.exe",
        "MZ binary",
        "application/octet-stream"
      );

      expect(res.statusCode).toBe(415);
    });

    it("retrieves the attachment for questions asked inside its own chat", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          mode: "knowledge",
          chat_id: chatId,
          question: "What are the four rungs of the Kestrel sedation ladder?",
        });

      expect(res.statusCode).toBe(200);
      askResult = res.body.data;

      const labels = res.body.data.cited_sources.map((source) => source.label);
      expect(labels).toEqual(
        expect.arrayContaining([expect.stringContaining("Attached: kestrel-protocol.txt")])
      );
    }, 30000);

    it("never retrieves it for a different chat", async () => {
      const res = await request(app)
        .post("/api/rag/query")
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`)
        .send({
          mode: "knowledge",
          chat_id: otherChatId,
          question: "What are the four rungs of the Kestrel sedation ladder?",
        });

      expect(res.statusCode).toBe(200);

      const labels = res.body.data.cited_sources.map((source) => source.label);
      expect(labels.some((label) => label.includes("kestrel-protocol.txt"))).toBe(false);
    }, 30000);

    it("binds staged files to the message that sent them and returns them on the transcript", async () => {
      const transcript = await request(app)
        .get(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      const userMessage = transcript.body.data.messages.find((m) => m.role === "user");

      // The client swaps its optimistic bubble's id for this one, so the two
      // must agree or a sent file would render against the wrong message.
      expect(askResult.user_message_id).toBe(userMessage.id);

      expect(userMessage.attachments).toHaveLength(1);
      expect(userMessage.attachments[0].id).toBe(resourceId);
      expect(userMessage.attachments[0].original_filename).toBe("kestrel-protocol.txt");
      expect(userMessage.attachments[0].is_image).toBe(false);

      // The composer only shows unbound files, so this must now be set.
      const list = await request(app)
        .get(`/api/rag/chats/${chatId}/resources`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(list.body.data.find((r) => r.id === resourceId).message_id).toBe(userMessage.id);
    });

    it("serves the file inline for previews, to its owner only", async () => {
      const res = await request(app)
        .get(`/api/rag/chats/${chatId}/resources/${resourceId}/file`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");
      expect(res.headers["content-disposition"]).toContain("inline");
      expect(res.text).toContain("Kestrel sedation ladder");

      const intruder = await request(app)
        .get(`/api/rag/chats/${chatId}/resources/${resourceId}/file`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(intruder.statusCode).toBe(404);
    });

    it("hides one clinician's resources from another", async () => {
      const list = await request(app)
        .get(`/api/rag/chats/${chatId}/resources`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(list.statusCode).toBe(404);

      const remove = await request(app)
        .delete(`/api/rag/chats/${chatId}/resources/${resourceId}`)
        .set("Cookie", `${COOKIE_NAME}=${specialistToken}`);

      expect(remove.statusCode).toBe(404);

      const upload = await attach(
        specialistToken,
        chatId,
        "intruder.txt",
        "should never land",
        "text/plain"
      );

      expect(upload.statusCode).toBe(404);
    });

    it("DELETE removes the resource row and its chunks", async () => {
      const res = await request(app)
        .delete(`/api/rag/chats/${chatId}/resources/${resourceId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(1);

      expect(await prisma.medicalDocument.count({ where: { id: resourceId } })).toBe(0);
      expect(await prisma.documentEmbedding.count({ where: { documentId: resourceId } })).toBe(0);
    });

    it("deleting the chat deletes the resources it still holds", async () => {
      const attached = await attach(
        residentToken,
        chatId,
        "kestrel-protocol-v2.txt",
        KESTREL_PROTOCOL,
        "text/plain"
      );
      const secondId = attached.body.data.id;
      await waitForIndexing(residentToken, chatId, secondId);

      const res = await request(app)
        .delete(`/api/rag/chats/${chatId}`)
        .set("Cookie", `${COOKIE_NAME}=${residentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.resources_deleted).toBe(1);

      expect(await prisma.medicalDocument.count({ where: { id: secondId } })).toBe(0);
      expect(await prisma.documentEmbedding.count({ where: { documentId: secondId } })).toBe(0);
      expect(await prisma.aiChatSession.count({ where: { id: chatId } })).toBe(0);
    }, 40000);
  });
});
