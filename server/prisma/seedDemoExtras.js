const prisma = require("../src/utils/prismaClient");

/**
 * Demo data for the parts of the app that patient/vitals/labs seeding never
 * touches: the bed board, alerts, treatment approvals, the notification bell,
 * and saved Medical Assistant chats. Without this, those screens render
 * empty for every seeded account even though the rest of the system looks
 * fully populated — the gap is obvious the moment someone clicks around.
 *
 * Idempotent throughout (count-guarded or upsert), like the rest of the seed.
 */
async function seedDemoExtras({ specialistUser, specialist2User, residentUser, resident2User, nurseUser, nurse2User }) {
  console.log("--- Seeding beds, alerts, approvals, notifications, and AI chats ---");

  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // ── Extra beds ──────────────────────────────────────────────────────────
  // Every bed created elsewhere in the seed is OCCUPIED. A ward that is
  // always 100% full is not a realistic demo of the Bed Overview page — it
  // needs open and out-of-service beds too, so admitting a new patient and
  // the maintenance workflow both have something to show.
  // MICU-01..08 are all taken by icuPatientSeed.js's 15 detailed profiles —
  // picked numbers one clear of that range so upsert can't silently no-op
  // against a real patient's bed (it did, harmlessly, the first time this ran).
  const extraBeds = [
    { bedNumber: "MICU-09", status: "AVAILABLE" },
    { bedNumber: "MICU-10", status: "AVAILABLE" },
    { bedNumber: "SICU-06", status: "AVAILABLE" },
    { bedNumber: "CCU-9/R1", status: "AVAILABLE" },
    { bedNumber: "ICU-N/R9", status: "AVAILABLE" },
    { bedNumber: "MICU-11", status: "MAINTENANCE" },
    { bedNumber: "SICU-07", status: "MAINTENANCE" },
  ];
  for (const b of extraBeds) {
    await prisma.bed.upsert({
      where: { bedNumber: b.bedNumber },
      update: {},
      create: b,
    });
  }
  console.log(`✓ ${extraBeds.length} additional beds (available/maintenance)`);

  // Pull whatever is actually ACTIVE right now rather than hardcoding MRNs —
  // works whether seed.js's 6 quick patients, icuPatientSeed.js's 15 detailed
  // ones, or both have run.
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: "ACTIVE", isArchived: false },
    include: { patient: true, doctor: true, bed: true },
    orderBy: { createdAt: "asc" },
  });

  if (activeAdmissions.length === 0) {
    console.log("No active admissions found — skipping alerts/approvals/notifications.");
    return;
  }

  const pick = (i) => activeAdmissions[i % activeAdmissions.length];

  // ── Alerts + a review ───────────────────────────────────────────────────
  // One still-open P0 (what a nurse/doctor sees today), one P1, and one
  // already reviewed — so the alerts tab demonstrates every visual state
  // (critical/warning/resolved) instead of just an empty "no active alerts".
  const alertPlans = [
    {
      admission: pick(0),
      severity: "P0",
      title: "Critical: Abnormal spo2 — immediate review required",
      metrics: { news2_total: 7, spo2: { value: 89, score: 3 }, respiratoryRate: { value: 24, score: 2 }, pulse: { value: 112, score: 2 } },
      reasoning:
        "SpO2 of 89% indicates significant hypoxaemia, compounded by tachypnoea (RR 24) and tachycardia (HR 112). Together these reflect acute physiological instability consistent with impending respiratory compromise and merit urgent reassessment.",
      status: "OPEN",
      ageHours: 1,
    },
    {
      admission: pick(1),
      severity: "P1",
      title: "Warning: Abnormal systolicBp",
      metrics: { news2_total: 3, systolicBp: { value: 98, score: 2 }, pulse: { value: 102, score: 1 } },
      reasoning:
        "Systolic BP of 98 mmHg combined with mild tachycardia (HR 102) suggests early haemodynamic compromise. Not yet critical, but the trend warrants closer monitoring over the next observation window.",
      status: "OPEN",
      ageHours: 3,
    },
    {
      admission: pick(2),
      severity: "P1",
      title: "Warning: Abnormal temperature",
      metrics: { news2_total: 2, temperature: { value: 38.6, score: 1 }, pulse: { value: 95, score: 1 } },
      reasoning:
        "Low-grade pyrexia (38.6°C) with mild tachycardia may reflect an evolving inflammatory or infective process; correlate with recent culture results.",
      status: "REVIEWED",
      ageHours: 20,
      review: {
        reviewer: residentUser,
        notes: "Reviewed with team. Repeat cultures pending; continuing current antibiotic course. Will reassess on rounds.",
        accepted: true,
      },
    },
  ];

  let alertsCreated = 0;
  for (const plan of alertPlans) {
    const existing = await prisma.alert.findFirst({
      where: { admissionId: plan.admission.id, title: plan.title },
    });
    if (existing) continue;

    const alert = await prisma.alert.create({
      data: {
        admissionId: plan.admission.id,
        severity: plan.severity,
        title: plan.title,
        triggeringMetrics: plan.metrics,
        clinicalReasoning: plan.reasoning,
        status: plan.status,
        createdAt: hoursAgo(plan.ageHours),
        updatedAt: plan.review ? hoursAgo(plan.ageHours - 1) : hoursAgo(plan.ageHours),
      },
    });

    if (plan.review) {
      await prisma.alertReview.create({
        data: {
          alertId: alert.id,
          reviewerId: plan.review.reviewer.id,
          reviewNotes: plan.review.notes,
          accepted: plan.review.accepted,
          reviewedAt: hoursAgo(plan.ageHours - 1),
        },
      });
    }
    alertsCreated++;
  }
  console.log(`✓ ${alertsCreated} alert(s) seeded (open P0, open P1, reviewed P1)`);

  // ── Treatment approvals ─────────────────────────────────────────────────
  // One pending (specialist has something to act on), one approved and
  // already carried out by a nurse, one rejected — the full lifecycle.
  const approvalPlans = [
    {
      admission: pick(0),
      treatmentName: "Norepinephrine infusion titration to MAP > 65",
      justification: "Persistent hypotension despite adequate fluid resuscitation; requesting escalation of vasopressor support.",
      requestedBy: residentUser,
      state: "PENDING",
      ageHours: 2,
    },
    {
      admission: pick(1),
      treatmentName: "Broad-spectrum antibiotic escalation (Meropenem)",
      justification: "Rising inflammatory markers and lactate trend suggest inadequate source control on current regimen.",
      requestedBy: resident2User,
      state: "APPROVED",
      ageHours: 30,
      approver: specialistUser,
      execution: {
        status: "COMPLETED",
        starter: nurseUser,
        completer: nurseUser,
        notes: "First dose administered as ordered, no adverse reaction observed.",
      },
    },
    {
      admission: pick(2),
      treatmentName: "Extubation trial",
      justification: "Patient meets spontaneous breathing trial criteria; requesting approval to proceed with extubation.",
      requestedBy: residentUser,
      state: "REJECTED",
      ageHours: 10,
      approver: specialistUser,
      rejectionAt: 9,
    },
  ];

  let approvalsCreated = 0;
  for (const plan of approvalPlans) {
    const existing = await prisma.treatmentApproval.findFirst({
      where: { admissionId: plan.admission.id, treatmentName: plan.treatmentName },
    });
    if (existing) continue;

    await prisma.treatmentApproval.create({
      data: {
        admissionId: plan.admission.id,
        requestedBy: plan.requestedBy.id,
        treatmentName: plan.treatmentName,
        clinicalJustification: plan.justification,
        requestedAt: hoursAgo(plan.ageHours),
        ...(plan.state === "PENDING"
          ? {}
          : plan.state === "APPROVED"
          ? {
              approvedBy: plan.approver.id,
              approvalStatus: true,
              approvedAt: hoursAgo(plan.ageHours - 1),
              executionStatus: plan.execution.status,
              startedBy: plan.execution.starter.id,
              startedAt: hoursAgo(plan.ageHours - 2),
              completedBy: plan.execution.completer.id,
              completedAt: hoursAgo(plan.ageHours - 2.5),
              executionNotes: plan.execution.notes,
            }
          : {
              approvedBy: plan.approver.id,
              approvalStatus: false,
              approvedAt: hoursAgo(plan.rejectionAt),
            }),
      },
    });
    approvalsCreated++;
  }
  console.log(`✓ ${approvalsCreated} treatment approval(s) seeded (pending, approved+executed, rejected)`);

  // ── Notifications ───────────────────────────────────────────────────────
  // A believable inbox per role: alerts for clinicians who'd actually be
  // paged, a summon for a nurse, an info note — mixed read/unread so the
  // bell badge count and the dropdown's styling both have something to show.
  const notificationPlans = [
    {
      user: specialistUser,
      title: "New Patient Alert: P0",
      message: alertPlans[0].title,
      type: "ALERT",
      status: "UNREAD",
      metadata: { entityType: "ALERT", admissionId: alertPlans[0].admission.id },
      ageHours: 1,
    },
    {
      user: residentUser,
      title: "New Patient Alert: P1",
      message: alertPlans[1].title,
      type: "ALERT",
      status: "UNREAD",
      metadata: { entityType: "ALERT", admissionId: alertPlans[1].admission.id },
      ageHours: 3,
    },
    {
      user: specialistUser,
      title: "Treatment approval requested",
      message: `Dr. ${residentUser.firstName} requested approval for "${approvalPlans[0].treatmentName}".`,
      type: "ALERT",
      status: "UNREAD",
      metadata: { entityType: "TREATMENT_APPROVAL", admissionId: approvalPlans[0].admission.id },
      ageHours: 2,
    },
    {
      user: residentUser,
      title: "Treatment approved",
      message: `Dr. ${specialistUser.firstName} approved "${approvalPlans[1].treatmentName}".`,
      type: "INFO",
      status: "READ",
      metadata: { entityType: "TREATMENT_APPROVAL", admissionId: approvalPlans[1].admission.id },
      ageHours: 29,
    },
    {
      user: nurseUser,
      title: "Urgent: Nurse Summons",
      message: `Nurse ${nurse2User.firstName} ${nurse2User.lastName} requires your presence for a patient handover in Bed ${pick(3).bed?.bedNumber || "the adjoining bay"}.`,
      type: "SUMMON",
      status: "READ",
      ageHours: 6,
    },
    {
      user: nurse2User,
      title: "New Patient Alert: P1",
      message: alertPlans[2].title,
      type: "ALERT",
      status: "READ",
      metadata: { entityType: "ALERT", admissionId: alertPlans[2].admission.id },
      ageHours: 20,
    },
  ];

  let notificationsCreated = 0;
  for (const plan of notificationPlans) {
    const existing = await prisma.notification.findFirst({
      where: { userId: plan.user.id, title: plan.title, message: plan.message },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: plan.user.id,
        title: plan.title,
        message: plan.message,
        type: plan.type,
        status: plan.status,
        metadata: plan.metadata || null,
        createdAt: hoursAgo(plan.ageHours),
        updatedAt: hoursAgo(plan.ageHours),
      },
    });
    notificationsCreated++;
  }
  console.log(`✓ ${notificationsCreated} notification(s) seeded across nurse/resident/specialist inboxes`);

  // ── Medical Assistant chat history ──────────────────────────────────────
  // A resumable, multi-turn chat per clinician role so the sidebar in
  // MedicalAssistantPage isn't empty on first login.
  const chatPlans = [
    {
      user: specialistUser,
      title: "Sepsis bundle timing in elderly patients",
      turns: [
        {
          q: "What are the key indicators of sepsis in elderly patients, and how does presentation differ from younger adults?",
          a: "Sepsis in elderly patients often presents atypically: hypothermia rather than fever, altered mental status as an early sign, and blunted tachycardia due to beta-blocker use or reduced physiologic reserve. Key indicators include lactate >2 mmol/L, altered mentation, hypotension, and reduced urine output. Because classic fever/tachycardia may be absent, a high index of suspicion combined with qSOFA or NEWS2 scoring is recommended for early detection.",
        },
        {
          q: "And what's the recommended timing for the sepsis bundle once it's suspected?",
          a: "The Surviving Sepsis Campaign recommends the 1-hour bundle: obtain lactate, blood cultures before antibiotics, broad-spectrum antibiotics, 30 mL/kg crystalloid for hypotension or lactate ≥4 mmol/L, and vasopressors if MAP remains <65 mmHg after fluids. In elderly patients, fluid resuscitation should be monitored closely given higher risk of volume overload, particularly with cardiac or renal comorbidity.",
        },
      ],
    },
    {
      user: residentUser,
      title: "ARDS ventilator strategy",
      turns: [
        {
          q: "What's the lung-protective ventilation strategy for a patient with ARDS?",
          a: "Lung-protective ventilation for ARDS follows the ARDSNet protocol: tidal volume of 4-6 mL/kg predicted body weight, plateau pressure kept below 30 cmH2O, and permissive hypercapnia if needed to avoid volutrauma. PEEP is titrated using the ARDSNet PEEP/FiO2 table, balancing oxygenation against overdistension. For moderate-to-severe ARDS (PaO2/FiO2 <150), prone positioning for at least 16 hours/day has strong mortality benefit evidence.",
        },
      ],
    },
  ];

  let chatsCreated = 0;
  for (const plan of chatPlans) {
    const existing = await prisma.aiChatSession.findFirst({
      where: { userId: plan.user.id, title: plan.title },
    });
    if (existing) continue;

    const session = await prisma.aiChatSession.create({
      data: {
        userId: plan.user.id,
        title: plan.title,
        mode: "KNOWLEDGE",
        createdAt: daysAgo(2),
        lastMessageAt: daysAgo(2),
      },
    });

    let turnTime = daysAgo(2).getTime();
    for (const turn of plan.turns) {
      await prisma.aiChatMessage.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: turn.q,
          createdAt: new Date(turnTime),
        },
      });
      turnTime += 1000;
      await prisma.aiChatMessage.create({
        data: {
          sessionId: session.id,
          role: "ASSISTANT",
          content: turn.a,
          citedSources: [{ type: "general_knowledge", label: "General medical knowledge", cited: true }],
          createdAt: new Date(turnTime),
        },
      });
      turnTime += 60000;
    }

    await prisma.aiChatSession.update({
      where: { id: session.id },
      data: { lastMessageAt: new Date(turnTime) },
    });

    chatsCreated++;
  }
  console.log(`✓ ${chatsCreated} Medical Assistant chat(s) seeded with multi-turn history`);

  console.log("--- Demo extras seeding complete ---");
}

module.exports = { seedDemoExtras };
