import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { patientsService } from "../services/patientsService";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import AdmissionStepper from "./admission/AdmissionStepper";
import AdmissionProgress from "./admission/AdmissionProgress";
import Step0Setup from "./admission/steps/Step0Setup";
import Step1AdmissionInfo from "./admission/steps/Step1AdmissionInfo";
import Step2HistoryTaking from "./admission/steps/Step2HistoryTaking";
import Step3VitalSigns, {
  VITAL_ABSOLUTE_RANGES,
  getCriticalVitalFields,
} from "./admission/steps/Step3VitalSigns";
import Step4GeneralExamination from "./admission/steps/Step4GeneralExamination";
import Step5LocalExamination from "./admission/steps/Step5LocalExamination";
import Step6ProvisionalDiagnosis from "./admission/steps/Step6ProvisionalDiagnosis";
import Step7Investigations from "./admission/steps/Step7Investigations";
import Step8TreatmentPlan from "./admission/steps/Step8TreatmentPlan";
import { dateInputToIso } from "../services/medicationsService";

const optionalEnum = (values) =>
  z.union([z.literal(""), z.enum(values)]).optional();

const optionalNumberInRange = (min, max, label, { integer = false } = {}) =>
  z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val === undefined || val === null || String(val).trim() === "")
          return true;
        const num = integer ? parseInt(val, 10) : parseFloat(val);
        if (Number.isNaN(num)) return false;
        if (integer && String(val).includes(".")) return false;
        return num >= min && num <= max;
      },
      `${label} must be between ${min} and ${max}${integer ? " (whole number)" : ""}`,
    );

// Aligned with server fullAdmissionCreateSchema + vitalSign.schema.js
const admissionSchema = z
  .object({
    bed_id: z
      .string()
      .min(1, "Bed selection is required")
      .uuid("Select a valid bed"),
    doctor_id: z
      .string()
      .min(1, "Attending specialist is required")
      .uuid("Select a valid attending specialist"),
    nurse_id: z
      .string()
      .min(1, "Nurse assignment is required")
      .uuid("Select a valid nurse"),

    national_id: z
      .string()
      .min(1, "National ID is required")
      .regex(/^\d{14}$/, "National ID must be exactly 14 digits"),
    name: z.string().min(1, "Patient name is required"),
    place_of_transfer: z.string().optional(),
    transfer_doctor_name: z.string().optional(),
    transfer_reason: z.string().optional(),

    age: z
      .string({ required_error: "Age is required" })
      .trim()
      .min(1, "Age is required")
      .regex(/^\d+$/, "Age must be a whole number")
      .refine((val) => {
        const n = Number(val);
        return n >= 0 && n <= 150;
      }, "Age must be between 0 and 150"),
    gender: optionalEnum(["MALE", "FEMALE"]),
    residence: z.string().optional(),
    occupation: z.string().optional(),
    marital_status: optionalEnum([
      "SINGLE",
      "MARRIED",
      "DIVORCED",
      "WIDOWED",
      "OTHER",
    ]),
    handedness: optionalEnum(["RIGHT", "LEFT", "AMBIDEXTROUS", "UNKNOWN"]),
    children_count: z.string().optional(),
    youngest_child_age: z.string().optional(),
    chief_complaint: z.string().min(1, "Chief complaint is required"),
    complaint_analysis: z.string().optional(),
    related_system_symptoms: z.string().optional(),
    other_system_symptoms: z.string().optional(),
    previous_investigations: z
      .object({
        labs: z.string().optional(),
        radiology: z.string().optional(),
      })
      .optional(),
    previous_treatments: z.string().optional(),
    special_habits: z.string().optional(),
    blood_transfusion: z.boolean().default(false),
    dm: z.boolean().default(false),
    htn: z.boolean().default(false),
    past_history_paragraph: z.string().optional(),
    similar_conditions: z.boolean().default(false),
    similar_conditions_detail: z.string().optional(),
    past_diseases: z.array(z.string()).default([]),
    previous_operations: z.boolean().default(false),
    has_allergies: z.boolean().default(false),
    traveled_abroad: z.boolean().default(false),
    custom_fields: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .default([]),
    // The allergens behind the has_allergies switch. Blank rows are dropped on
    // submit, so an empty row the user added and abandoned is not an error.
    allergies: z
      .array(
        z.object({
          allergen: z.string().optional(),
          severity: z.string().optional(),
        }),
      )
      .default([]),
    consanguinity: z.boolean().default(false),
    family_similar_conditions: z.string().optional(),
    inherited_diseases: z.string().optional(),

    menstrual_history: z
      .object({
        menarche: z.string().optional(),
        cycle_rhythm: z.string().optional(),
        cycle_length: z.string().optional(),
        duration_of_flow: z.string().optional(),
        character_of_flow: z.string().optional(),
        dysmenorrhea: z.boolean().default(false),
        dysmenorrhea_details: z.string().optional(),
        inter_menstrual_period: z.string().optional(),
        contraception: z.string().optional(),
        lnmp: z.string().optional(),
      })
      .optional(),

    obstetric_history: z
      .object({
        gravidity: z.string().optional(),
        parity: z.string().optional(),
        full_term_normal_deliveries: z.string().optional(),
        pre_term: z.string().optional(),
        still_birth: z.string().optional(),
        difficult_labors: z.string().optional(),
        cesarean_section: z.boolean().default(false),
        cesarean_details: z.string().optional(),
        last_delivery_date: z.string().optional(),
        abortions: z.boolean().default(false),
        abortions_details: z.string().optional(),
        previous_pregnancies_complications: z.string().optional(),
        previous_puerperal_complications: z.string().optional(),
      })
      .optional(),

    temperature: optionalNumberInRange(
      VITAL_ABSOLUTE_RANGES.temperature.min,
      VITAL_ABSOLUTE_RANGES.temperature.max,
      "Temperature",
    ),
    pulse: optionalNumberInRange(
      VITAL_ABSOLUTE_RANGES.pulse.min,
      VITAL_ABSOLUTE_RANGES.pulse.max,
      "Heart rate",
      { integer: true },
    ),
    systolic_bp: optionalNumberInRange(
      VITAL_ABSOLUTE_RANGES.systolic_bp.min,
      VITAL_ABSOLUTE_RANGES.systolic_bp.max,
      "Systolic BP",
      { integer: true },
    ),
    diastolic_bp: optionalNumberInRange(
      VITAL_ABSOLUTE_RANGES.diastolic_bp.min,
      VITAL_ABSOLUTE_RANGES.diastolic_bp.max,
      "Diastolic BP",
      { integer: true },
    ),
    respiratory_rate: optionalNumberInRange(
      VITAL_ABSOLUTE_RANGES.respiratory_rate.min,
      VITAL_ABSOLUTE_RANGES.respiratory_rate.max,
      "Respiratory rate",
      { integer: true },
    ),
    spo2: optionalNumberInRange(
      VITAL_ABSOLUTE_RANGES.spo2.min,
      VITAL_ABSOLUTE_RANGES.spo2.max,
      "SpO2",
      { integer: true },
    ),
    is_override: z.boolean().default(false),
    override_reason: z.string().optional(),

    general_exam: z.object({
      appearance_consciousness: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      built_nutrition: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      complexion: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      decubitus_attitude: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      head_neck: z.object({ result: z.string(), notes: z.string().optional() }),
      upper_limbs: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      lower_limbs: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      skin_lymph_nodes: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
      other_systems: z.object({
        result: z.string(),
        notes: z.string().optional(),
      }),
    }),

    local_exam: z.object({
      inspection: z.string().optional(),
      palpation: z.string().optional(),
      percussion: z.string().optional(),
      auscultation: z.string().optional(),
    }),

    provisional_diagnosis: z.string().optional(),

    // Step 6's structured problem list. The narrative above is the reasoning;
    // these become real Diagnosis rows.
    diagnoses: z
      .array(
        z.object({
          condition_name: z.string().min(1, "Condition is required"),
          type: z.string().min(1, "Classification is required"),
          status: z.string().min(1, "Certainty is required"),
          clinical_notes: z.string().optional(),
        }),
      )
      .default([]),

    investigations: z
      .array(
        z.object({
          type: z.string().min(1, "Type is required"),
        }),
      )
      .default([]),

    // Dates here are the raw "YYYY-MM-DD" strings the day inputs produce; they
    // are converted to ISO instants at local midnight when the payload is built.
    medications: z
      .array(
        z
          .object({
            drug_name: z.string().min(1, "Drug name is required"),
            dosage: z.string().min(1, "Dosage is required"),
            frequency: z.string().min(1, "Frequency is required"),
            frequency_text: z.string().optional(),
            route: z.string().min(1, "Route is required"),
            instructions: z.string().optional(),
            start_date: z.string().optional(),
            end_date: z.string().optional(),
          })
          .superRefine((med, ctx) => {
            if (med.frequency === "OTHER" && !med.frequency_text?.trim()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["frequency_text"],
                message: "Describe the dosing schedule",
              });
            }
            if (
              med.start_date &&
              med.end_date &&
              new Date(med.end_date) < new Date(med.start_date)
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["end_date"],
                message: "End date cannot be before the start date",
              });
            }
          }),
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    const critical = getCriticalVitalFields(data);
    if (critical.length === 0) return;

    if (!data.is_override) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["is_override"],
        message: `Critical abnormal values detected: ${critical.join(", ")}. Confirm override to continue.`,
      });
      return;
    }

    if (!data.override_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["override_reason"],
        message: "Override reason is required for critical vital signs.",
      });
    }
  });

const defaultValues = {
  bed_id: "",
  doctor_id: "",
  nurse_id: "",
  national_id: "",
  name: "",
  place_of_transfer: "",
  transfer_doctor_name: "",
  transfer_reason: "",
  age: "",
  gender: "",
  residence: "",
  occupation: "",
  marital_status: "",
  handedness: "",
  children_count: "",
  youngest_child_age: "",
  chief_complaint: "",
  complaint_analysis: "",
  related_system_symptoms: "",
  other_system_symptoms: "",
  previous_investigations: { labs: "", radiology: "" },
  previous_treatments: "",
  special_habits: "",
  blood_transfusion: false,
  dm: false,
  htn: false,
  past_history_paragraph: "",
  similar_conditions: false,
  similar_conditions_detail: "",
  past_diseases: [],
  previous_operations: false,
  has_allergies: false,
  traveled_abroad: false,
  custom_fields: [],
  allergies: [],
  consanguinity: false,
  family_similar_conditions: "",
  inherited_diseases: "",
  menstrual_history: {
    menarche: "",
    cycle_rhythm: "",
    cycle_length: "",
    duration_of_flow: "",
    character_of_flow: "",
    dysmenorrhea: false,
    dysmenorrhea_details: "",
    inter_menstrual_period: "",
    contraception: "",
    lnmp: "",
  },
  obstetric_history: {
    gravidity: "",
    parity: "",
    full_term_normal_deliveries: "",
    pre_term: "",
    still_birth: "",
    difficult_labors: "",
    cesarean_section: false,
    cesarean_details: "",
    last_delivery_date: "",
    abortions: false,
    abortions_details: "",
    previous_pregnancies_complications: "",
    previous_puerperal_complications: "",
  },
  temperature: "",
  pulse: "",
  systolic_bp: "",
  diastolic_bp: "",
  respiratory_rate: "",
  spo2: "",
  is_override: false,
  override_reason: "",
  general_exam: {
    appearance_consciousness: { result: "negative", notes: "" },
    built_nutrition: { result: "negative", notes: "" },
    complexion: { result: "negative", notes: "" },
    decubitus_attitude: { result: "negative", notes: "" },
    head_neck: { result: "negative", notes: "" },
    upper_limbs: { result: "negative", notes: "" },
    lower_limbs: { result: "negative", notes: "" },
    skin_lymph_nodes: { result: "negative", notes: "" },
    other_systems: { result: "negative", notes: "" },
  },
  local_exam: {
    inspection: "",
    palpation: "",
    percussion: "",
    auscultation: "",
  },
  provisional_diagnosis: "",
  diagnoses: [],
  investigations: [],
  medications: [],
};

const VITAL_FIELDS = [
  "temperature",
  "pulse",
  "systolic_bp",
  "diastolic_bp",
  "respiratory_rate",
  "spo2",
  "is_override",
  "override_reason",
];

// `fields` gates the Next button. `owns` is every field the step renders, and
// exists so a validation error raised at submit time can be traced back to the
// step that can actually display it — otherwise Submit fails with the message
// rendered on a step the user is not looking at, and nothing appears to happen.
const steps = [
  {
    title: "Setup",
    component: Step0Setup,
    fields: ["bed_id", "doctor_id", "nurse_id"],
    owns: ["bed_id", "doctor_id", "nurse_id"],
  },
  {
    title: "Admission Info",
    component: Step1AdmissionInfo,
    fields: ["national_id", "name"],
    owns: [
      "national_id",
      "name",
      "place_of_transfer",
      "transfer_doctor_name",
      "transfer_reason",
    ],
  },
  {
    title: "History Taking",
    component: Step2HistoryTaking,
    fields: ["age", "chief_complaint"],
    owns: [
      "age",
      "gender",
      "residence",
      "occupation",
      "marital_status",
      "handedness",
      "children_count",
      "youngest_child_age",
      "chief_complaint",
      "complaint_analysis",
      "related_system_symptoms",
      "other_system_symptoms",
      "previous_investigations",
      "previous_treatments",
      "special_habits",
      "blood_transfusion",
      "dm",
      "htn",
      "past_history_paragraph",
      "similar_conditions",
      "similar_conditions_detail",
      "past_diseases",
      "previous_operations",
      "has_allergies",
      "allergies",
      "traveled_abroad",
      "custom_fields",
      "consanguinity",
      "family_similar_conditions",
      "inherited_diseases",
      "menstrual_history",
      "obstetric_history",
    ],
  },
  {
    title: "Vital Signs",
    component: Step3VitalSigns,
    fields: VITAL_FIELDS,
    owns: VITAL_FIELDS,
  },
  {
    title: "General Examination",
    component: Step4GeneralExamination,
    fields: [],
    owns: ["general_exam"],
  },
  {
    title: "Local Examination",
    component: Step5LocalExamination,
    fields: [],
    owns: ["local_exam"],
  },
  {
    title: "Provisional Diagnosis",
    component: Step6ProvisionalDiagnosis,
    fields: [],
    owns: ["provisional_diagnosis", "diagnoses"],
  },
  {
    title: "Investigations",
    component: Step7Investigations,
    fields: [],
    owns: ["investigations"],
  },
  {
    title: "Treatment Plan",
    component: Step8TreatmentPlan,
    fields: [],
    owns: ["medications"],
  },
];

/** The earliest step that renders any of the errored fields, or null. */
function findStepForFields(fieldNames) {
  for (let i = 0; i < steps.length; i += 1) {
    if (fieldNames.some((name) => steps[i].owns.includes(name))) return i;
  }
  return null;
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || String(value).trim() === "")
    return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

function parseOptionalFloat(value) {
  if (value === undefined || value === null || String(value).trim() === "")
    return undefined;
  const n = parseFloat(value);
  return Number.isNaN(n) ? undefined : n;
}

function emptyToUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
}

const DRAFT_KEY = "smartcare:admit-patient-draft";
// Long enough to survive a shift interruption, short enough that yesterday's
// abandoned form never resurfaces under a new patient.
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function getDraftKey(readmitId) {
  return readmitId ? `${DRAFT_KEY}:readmit:${readmitId}` : DRAFT_KEY;
}

function clearDraft(readmitId) {
  try {
    sessionStorage.removeItem(getDraftKey(readmitId));
  } catch {
    // ignore
  }
}

function loadDraft(readmitId) {
  try {
    const raw = sessionStorage.getItem(getDraftKey(readmitId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.values || typeof parsed.values !== "object") return null;

    // A stale draft belongs to a patient who was admitted (or abandoned) hours
    // ago. Silently repopulating it into a new admission risks carrying one
    // patient's history into another's record.
    if (parsed.savedAt && Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      clearDraft(readmitId);
      return null;
    }

    // Every field is stored in the shape its input uses — investigation and
    // medication dates are plain strings — so nothing needs reviving.
    const values = { ...parsed.values };

    return {
      values: { ...defaultValues, ...values },
      step: Number.isInteger(parsed.step) ? parsed.step : 0,
    };
  } catch {
    return null;
  }
}

function saveDraft(values, step, readmitId) {
  try {
    sessionStorage.setItem(
      getDraftKey(readmitId),
      JSON.stringify({ values, step, savedAt: Date.now() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export default function AdmitPatientPage() {
  const [searchParams] = useSearchParams();
  const readmitId = searchParams.get("readmitId");
  const prevReadmitId = useRef(readmitId);
  const [draft, setDraft] = useState(() => loadDraft(readmitId));
  const [currentStep, setCurrentStep] = useState(draft?.step ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [prefillValues, setPrefillValues] = useState(null);
  const [readmitAdmission, setReadmitAdmission] = useState(null);
  const submittingRef = useRef(false);

  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(admissionSchema),
    defaultValues: prefillValues ?? draft?.values ?? defaultValues,
    mode: "onTouched",
    shouldUnregister: false,
  });

  // Keep draft in sync so submit errors / accidental navigation don't lose data
  useEffect(() => {
    const subscription = form.watch((values) => {
      saveDraft(values, currentStep, readmitId);
    });
    return () => subscription.unsubscribe();
  }, [form, currentStep, readmitId]);

  useEffect(() => {
    saveDraft(form.getValues(), currentStep, readmitId);
  }, [currentStep, form, readmitId]);

  // When the user leaves the page without submitting, discard the plain (non-readmit)
  // draft entirely so the form always starts in a clean state on the next visit.
  // Readmit drafts are keyed differently and are intentionally preserved so a
  // partially-filled readmit can be resumed if the user navigates back.
  useEffect(() => {
    return () => {
      // Only clear the plain draft; readmit drafts survive navigation.
      clearDraft(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!readmitId) {
      setPrefillValues(null);
      setReadmitAdmission(null);

      // The unmount cleanup already cleared the plain draft, so always start
      // with a blank form whenever readmitId is absent (covers both the
      // initial render and when the user navigates back from a readmit flow).
      clearDraft(null);
      setDraft({ values: defaultValues, step: 0 });
      form.reset(defaultValues);
      setCurrentStep(0);
      prevReadmitId.current = null;
      return;
    }

    if (!prevReadmitId.current) {
      clearDraft(null);
    }
    prevReadmitId.current = readmitId;
    const loadReadmit = async () => {
      try {
        const admission = await patientsService.getAdmissionById(readmitId);
        if (!admission) return;

        const admissionValues = {
          ...defaultValues,
          national_id:
            admission.patient?.national_id || admission.patient?.mrn || "",
          name: admission.patient?.name || "",
          age: admission.patient?.age ? String(admission.patient.age) : "",
          gender: admission.patient?.gender || "",
          residence: admission.patient?.residence || "",
          occupation: admission.patient?.occupation || "",
          marital_status: admission.patient?.marital_status || "",
          handedness: admission.patient?.handedness || "",
          children_count: admission.patient?.childrenCount
            ? String(admission.patient.childrenCount)
            : "",
          youngest_child_age: admission.patient?.youngestChildAge || "",
          chief_complaint: admission.chief_complaint || "",
          complaint_analysis: admission.complaint_analysis || "",
          related_system_symptoms: admission.symptoms_related_system || "",
          other_system_symptoms: admission.symptoms_other_systems || "",
          previous_investigations: admission.previous_investigations || {
            labs: "",
            radiology: "",
          },
          previous_treatments: admission.previous_treatments || "",
          provisional_diagnosis: admission.provisional_diagnosis || "",
          diagnoses:
            admission.diagnosesList?.map((d) => ({
              condition_name: d.condition_name || "",
              type: d.type || "",
              status: d.status || "",
              clinical_notes: d.clinical_notes || "",
            })) || [],
          investigations:
            admission.pendingInvestigations?.map((order) => ({
              type: order.orderName || order.order_name || "",
            })) || [],
          // Keep the patient history defaults intact, but readmit should not auto-select bed/nurse/doctor.
        };

        setPrefillValues(admissionValues);
        setReadmitAdmission(admission);
        setCurrentStep(0);
      } catch (err) {
        console.error("Failed to load readmit details", err);
      }
    };

    loadReadmit();
  }, [readmitId, form]);

  useEffect(() => {
    if (!prefillValues) return;
    form.reset(prefillValues);
  }, [prefillValues, form]);

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector(
        "[data-slot=form-message], [aria-invalid=true]",
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  // react-hook-form hands us the full error map on a failed submit. Without
  // this, an error on an earlier step leaves the user on Step 8 clicking a
  // button that appears to do nothing.
  const handleInvalidSubmit = (errors) => {
    const errored = Object.keys(errors || {});
    const targetStep = findStepForFields(errored);

    if (targetStep !== null && targetStep !== currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo(0, 0);
      setSubmitError(
        `Please fix the highlighted problem in "${steps[targetStep].title}" before submitting.`,
      );
    } else if (targetStep === null && errored.length > 0) {
      // A cross-field rule (the critical-vitals override) that belongs to no
      // single step — say so rather than failing silently.
      setSubmitError(
        Object.values(errors)[0]?.message ||
          "Please review the form before submitting.",
      );
    }

    scrollToFirstError();
  };

  const handleNext = async () => {
    if (isValidating) return;
    setIsValidating(true);
    try {
      const fieldsToValidate = steps[currentStep].fields;

      if (currentStep === 3) {
        const values = form.getValues();
        const hasOneVital = [
          "temperature",
          "pulse",
          "systolic_bp",
          "diastolic_bp",
          "respiratory_rate",
          "spo2",
        ].some((key) => values[key] && String(values[key]).trim() !== "");

        if (!hasOneVital) {
          form.setError("temperature", {
            type: "manual",
            message: "At least one vital sign is required to proceed.",
          });
          scrollToFirstError();
          return;
        }
        form.clearErrors("temperature");
      }

      const isValid =
        fieldsToValidate.length === 0
          ? true
          : await form.trigger(fieldsToValidate, { shouldFocus: true });

      if (!isValid) {
        setTimeout(() => {
          scrollToFirstError();
        }, 50);
        return;
      }

      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo(0, 0);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const onSubmit = async (data) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    // Snapshot before submit so a failure never loses the draft
    saveDraft(data, currentStep);

    try {
      const customFieldsObj = (data.custom_fields || []).reduce((acc, curr) => {
        if (curr.label && curr.value) acc[curr.label] = curr.value;
        return acc;
      }, {});

      const vitalPayload = {
        temperature: parseOptionalFloat(data.temperature),
        pulse: parseOptionalInt(data.pulse),
        systolic_bp: parseOptionalInt(data.systolic_bp),
        diastolic_bp: parseOptionalInt(data.diastolic_bp),
        respiratory_rate: parseOptionalInt(data.respiratory_rate),
        spo2: parseOptionalInt(data.spo2),
      };
      const hasVitals = Object.values(vitalPayload).some(
        (v) => v !== undefined,
      );

      const fullPayload = {
        patient: {
          mrn: data.national_id,
          national_id: emptyToUndefined(data.national_id),
          name: data.name,
          age: parseInt(data.age, 10),
          gender: emptyToUndefined(data.gender),
          residence: emptyToUndefined(data.residence),
          occupation: emptyToUndefined(data.occupation),
          marital_status: emptyToUndefined(data.marital_status),
          handedness: emptyToUndefined(data.handedness),
          children_count: data.children_count
            ? parseInt(data.children_count, 10)
            : undefined,
          youngest_child_age: emptyToUndefined(data.youngest_child_age),
        },
        medical_history: {
          diabetes_dm: data.dm,
          hypertension_htn: data.htn,
          past_similar_conditions: data.similar_conditions
            ? emptyToUndefined(data.similar_conditions_detail)
            : undefined,
          past_diseases:
            data.past_diseases?.length > 0 ? data.past_diseases : undefined,
          previous_operations: !!data.previous_operations,
          has_allergies: !!data.has_allergies,
          traveled_abroad: !!data.traveled_abroad,
          consanguinity: !!data.consanguinity,
          family_similar_conditions: emptyToUndefined(
            data.family_similar_conditions,
          ),
          inherited_diseases: data.inherited_diseases
            ? [data.inherited_diseases]
            : undefined,
          free_text: emptyToUndefined(data.past_history_paragraph),
          custom_fields:
            Object.keys(customFieldsObj).length > 0
              ? customFieldsObj
              : undefined,
          special_habits: emptyToUndefined(data.special_habits),
          blood_transfusion: !!data.blood_transfusion,
          menstrual_history:
            data.gender === "FEMALE" ? data.menstrual_history : undefined,
          obstetric_history:
            data.gender === "FEMALE" ? data.obstetric_history : undefined,
        },
        admission: {
          bed_id: data.bed_id,
          doctor_id: data.doctor_id,
          nurse_id: data.nurse_id,
          transfer_reason: emptyToUndefined(data.transfer_reason),
          place_of_transfer: emptyToUndefined(data.place_of_transfer),
          transfer_doctor_name: emptyToUndefined(data.transfer_doctor_name),
          chief_complaint: data.chief_complaint,
          complaint_analysis: emptyToUndefined(data.complaint_analysis),
          symptoms_related_system: emptyToUndefined(
            data.related_system_symptoms,
          ),
          symptoms_other_systems: emptyToUndefined(data.other_system_symptoms),
          previous_investigations:
            data.previous_investigations?.labs ||
            data.previous_investigations?.radiology
              ? data.previous_investigations
              : undefined,
          previous_treatments: emptyToUndefined(data.previous_treatments),
          provisional_diagnosis: emptyToUndefined(data.provisional_diagnosis),
        },
        // Written in the admission's own transaction so the problem list can
        // never be half-created alongside a live admission.
        diagnoses: (data.diagnoses || [])
          .filter((diag) => diag.condition_name?.trim())
          .map((diag) => ({
            condition_name: diag.condition_name.trim(),
            type: diag.type,
            status: diag.status,
            clinical_notes: emptyToUndefined(diag.clinical_notes),
          })),
        vital_signs: hasVitals
          ? {
              ...vitalPayload,
              is_override: !!data.is_override,
              override_reason: data.is_override
                ? emptyToUndefined(data.override_reason)
                : undefined,
            }
          : undefined,
        // Allergens, not just the yes/no flag — these are what block a
        // conflicting drug order at prescribing time.
        allergies: (data.allergies || [])
          .filter((a) => a.allergen?.trim())
          .map((a) => ({
            allergen: a.allergen.trim(),
            severity: emptyToUndefined(a.severity?.trim()),
          })),
        // Steps 4 and 5. Sent with the admission so a failure can no longer
        // lose both examinations behind a console warning.
        examination: {
          general_exams: data.general_exam,
          local_exams: data.local_exam,
        },
        // Step 7. Written in the same transaction rather than POSTed one at a
        // time after the admission has already committed.
        investigations: (data.investigations || [])
          .filter((inv) => inv.type?.trim())
          .map((inv) => ({
            order_name: inv.type.trim(),
            type: "Lab",
          })),
        // Sent with the admission itself so the drug list is written in the
        // same transaction — a failure here rolls the whole admission back
        // instead of leaving a patient with half a treatment plan.
        medications: (data.medications || [])
          .filter((med) => med.drug_name?.trim())
          .map((med) => ({
            drug_name: med.drug_name.trim(),
            dosage: med.dosage.trim(),
            frequency: med.frequency,
            frequency_text:
              med.frequency === "OTHER"
                ? emptyToUndefined(med.frequency_text)
                : undefined,
            route: med.route,
            instructions: emptyToUndefined(med.instructions),
            start_date: dateInputToIso(med.start_date),
            end_date: dateInputToIso(med.end_date),
          })),
      };

      const admissionRes = await api.post("/admissions/full", fullPayload);
      const resultData = admissionRes.data.data || admissionRes.data;
      const admissionId = resultData.id;

      if (!admissionId) {
        throw new Error("Failed to extract admission ID from response");
      }

      // Everything the form collects — examination, diagnoses, investigations,
      // medications and allergies — was written in that one transaction. There
      // is no follow-up request that can leave the record half-built.

      clearDraft(readmitId);
      navigate(`/patients`);
    } catch (err) {
      submittingRef.current = false;
      setIsSubmitting(false);
      // Preserve all entered values after a failed submit
      saveDraft(form.getValues(), currentStep);
      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to submit admission. Please try again.";
      setSubmitError(serverMessage);

      // Surface common field-level server validation messages on the form
      const lower = String(serverMessage).toLowerCase();
      if (lower.includes("bed"))
        form.setError("bed_id", { type: "server", message: serverMessage });
      if (lower.includes("doctor"))
        form.setError("doctor_id", { type: "server", message: serverMessage });
      if (lower.includes("age"))
        form.setError("age", { type: "server", message: serverMessage });
      if (lower.includes("marital"))
        form.setError("marital_status", {
          type: "server",
          message: serverMessage,
        });
      if (lower.includes("handedness"))
        form.setError("handedness", { type: "server", message: serverMessage });
      if (
        lower.includes("vital") ||
        lower.includes("critical") ||
        lower.includes("override")
      ) {
        form.setError("temperature", {
          type: "server",
          message: serverMessage,
        });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline font-bold text-foreground">
          Admit Patient
        </h1>
        <Button
          variant="ghost"
          onClick={() => {
            saveDraft(form.getValues(), currentStep);
            navigate(-1);
          }}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {submitError}
            <span className="mt-1 block text-sm opacity-90">
              Your entered data has been kept. Fix the issue and submit again.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {readmitAdmission && (
        <Alert
          variant="secondary"
          className="border-border bg-muted text-foreground"
        >
          <AlertTitle>Readmit prefill applied</AlertTitle>
          <AlertDescription>
            This admission form was prefilled from discharged admission
            <span className="font-medium"> #{readmitAdmission.id}</span>.
            Assignment fields like bed, nurse, and doctor must still be selected
            manually.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <AdmissionStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={(stepIndex) => setCurrentStep(stepIndex)}
        />

        <div className="flex-1 max-w-4xl">
          <AdmissionProgress steps={steps} currentStep={currentStep} />

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <CurrentStepComponent form={form} />

              <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  Back
                </Button>

                {currentStep === steps.length - 1 ? (
                  <Button
                    type="button"
                    className="cursor-pointer"
                    disabled={isSubmitting}
                    onClick={() =>
                      form.handleSubmit(onSubmit, handleInvalidSubmit)()
                    }
                  >
                    {isSubmitting ? "Submitting..." : "Submit Admission"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="cursor-pointer"
                    disabled={isValidating}
                    onClick={handleNext}
                  >
                    {isValidating ? "Validating..." : "Next"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
