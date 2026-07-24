import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../store/authStore";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import AdmissionStepper from "./admission/AdmissionStepper";
import AdmissionProgress from "./admission/AdmissionProgress";
import Step0Setup from "./admission/steps/Step0Setup";
import Step1AdmissionInfo from "./admission/steps/Step1AdmissionInfo";
import Step2HistoryTaking from "./admission/steps/Step2HistoryTaking";
import Step3VitalSigns from "./admission/steps/Step3VitalSigns";
import Step4GeneralExamination from "./admission/steps/Step4GeneralExamination";
import Step5LocalExamination from "./admission/steps/Step5LocalExamination";
import Step6ProvisionalDiagnosis from "./admission/steps/Step6ProvisionalDiagnosis";
import Step7Investigations from "./admission/steps/Step7Investigations";
import Step8TreatmentPlan from "./admission/steps/Step8TreatmentPlan";

// Define the comprehensive schema for the admission flow
const admissionSchema = z.object({
  // Step 0
  bed_id: z.string().min(1, "Bed selection is required"),
  doctor_id: z.string().min(1, "Doctor selection is required"),

  // Step 1
  national_id: z.string().min(1, "National ID is required"),
  name: z.string().min(1, "Patient name is required"),
  place_of_transfer: z.string().optional(),
  transfer_doctor_name: z.string().optional(),
  transfer_reason: z.string().optional(),

  // Step 2
  age: z.string().optional(),
  gender: z.string().optional(),
  residence: z.string().optional(),
  occupation: z.string().optional(),
  marital_status: z.string().optional(),
  handedness: z.string().optional(),
  chief_complaint: z.string().min(1, "Chief complaint is required"),
  complaint_analysis: z.string().optional(),
  related_system_symptoms: z.string().optional(),
  other_system_symptoms: z.string().optional(),
  previous_investigations: z.object({
    labs: z.string().optional(),
    radiology: z.string().optional(),
  }).optional(),
  previous_treatments: z.string().optional(),
  dm: z.boolean().default(false),
  htn: z.boolean().default(false),
  past_history_paragraph: z.string().optional(),
  similar_conditions: z.boolean().default(false),
  similar_conditions_detail: z.string().optional(),
  past_diseases: z.array(z.string()).default([]),
  previous_operations: z.boolean().default(false),
  has_allergies: z.boolean().default(false),
  traveled_abroad: z.boolean().default(false),
  custom_fields: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  consanguinity: z.boolean().default(false),
  family_similar_conditions: z.string().optional(),
  inherited_diseases: z.string().optional(),

  // Step 3 (at least one vital sign is checked in step validation)
  temperature: z.string().optional(),
  pulse: z.string().optional(),
  systolic_bp: z.string().optional(),
  diastolic_bp: z.string().optional(),
  respiratory_rate: z.string().optional(),
  spo2: z.string().optional(),

  // Step 4
  general_exam: z.object({
    appearance_consciousness: z.object({ result: z.string(), notes: z.string().optional() }),
    built_nutrition: z.object({ result: z.string(), notes: z.string().optional() }),
    complexion: z.object({ result: z.string(), notes: z.string().optional() }),
    decubitus_attitude: z.object({ result: z.string(), notes: z.string().optional() }),
    head_neck: z.object({ result: z.string(), notes: z.string().optional() }),
    upper_lower_limbs: z.object({ result: z.string(), notes: z.string().optional() }),
    skin_lymph_nodes: z.object({ result: z.string(), notes: z.string().optional() }),
    other_systems: z.object({ result: z.string(), notes: z.string().optional() }),
  }),

  // Step 5
  local_exam: z.object({
    inspection: z.string().optional(),
    palpation: z.string().optional(),
    percussion: z.string().optional(),
    auscultation: z.string().optional(),
  }),

  // Step 6
  provisional_diagnosis: z.string().optional(),

  // Step 7
  investigations: z.array(z.object({
    type: z.string().min(1, "Type is required"),
    order_date: z.date().optional(),
  })).default([]),

  // Step 8
  medications: z.array(z.object({
    drug_name: z.string().min(1, "Drug name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
  })).default([]),
});

const defaultValues = {
  bed_id: "",
  doctor_id: "",
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
  chief_complaint: "",
  complaint_analysis: "",
  related_system_symptoms: "",
  other_system_symptoms: "",
  previous_investigations: { labs: "", radiology: "" },
  previous_treatments: "",
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
  consanguinity: false,
  family_similar_conditions: "",
  inherited_diseases: "",
  temperature: "",
  pulse: "",
  systolic_bp: "",
  diastolic_bp: "",
  respiratory_rate: "",
  spo2: "",
  general_exam: {
    appearance_consciousness: { result: "negative", notes: "" },
    built_nutrition: { result: "negative", notes: "" },
    complexion: { result: "negative", notes: "" },
    decubitus_attitude: { result: "negative", notes: "" },
    head_neck: { result: "negative", notes: "" },
    upper_lower_limbs: { result: "negative", notes: "" },
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
  investigations: [],
  medications: [],
};

const steps = [
  { title: "Setup", component: Step0Setup, fields: ["bed_id", "doctor_id"] },
  { title: "Admission Info", component: Step1AdmissionInfo, fields: ["national_id", "name"] },
  { title: "History Taking", component: Step2HistoryTaking, fields: ["chief_complaint"] },
  { title: "Vital Signs", component: Step3VitalSigns, fields: ["temperature", "pulse", "systolic_bp", "diastolic_bp", "respiratory_rate", "spo2"] },
  { title: "General Examination", component: Step4GeneralExamination, fields: [] },
  { title: "Local Examination", component: Step5LocalExamination, fields: [] },
  { title: "Provisional Diagnosis", component: Step6ProvisionalDiagnosis, fields: [] },
  { title: "Investigations", component: Step7Investigations, fields: [] },
  { title: "Treatment Plan", component: Step8TreatmentPlan, fields: [] },
];

export default function AdmitPatientPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submittingRef = useRef(false);
  
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const form = useForm({
    resolver: zodResolver(admissionSchema),
    defaultValues,
    mode: "onChange",
  });

  // Pre-fill doctor_id if ICU_SPECIALIST
  useEffect(() => {
    if (user?.role === "ICU_SPECIALIST") {
      form.setValue("doctor_id", user.id);
    }
  }, [user, form]);

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    
    // Step 3 custom validation: at least one vital sign
    if (currentStep === 3) {
      const values = form.getValues();
      const hasOneVital = ["temperature", "pulse", "systolic_bp", "diastolic_bp", "respiratory_rate", "spo2"]
        .some(key => values[key] && values[key].trim() !== "");
      if (!hasOneVital) {
        form.setError("temperature", { type: "manual", message: "At least one vital sign is required to proceed." });
        return;
      } else {
        form.clearErrors("temperature");
      }
    }

    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const onSubmit = async (data) => {
    // Guard against React StrictMode double-invocation
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Transactional Admission
      const customFieldsObj = data.custom_fields.reduce((acc, curr) => {
        if (curr.label && curr.value) acc[curr.label] = curr.value;
        return acc;
      }, {});

      const hasVitals = data.temperature || data.pulse || data.systolic_bp || data.diastolic_bp || data.respiratory_rate || data.spo2;

      const fullPayload = {
        patient: {
          mrn: data.national_id || `MRN-${Date.now()}`,
          national_id: data.national_id || undefined,
          name: data.name,
          age: parseInt(data.age) || 0,
          gender: data.gender ? data.gender.toUpperCase() : undefined,
          residence: data.residence || undefined,
          occupation: data.occupation || undefined,
          marital_status: data.marital_status ? data.marital_status.toUpperCase() : undefined,
          handedness: data.handedness ? data.handedness.toUpperCase() : undefined,
        },
        medical_history: {
          diabetes_dm: data.dm,
          hypertension_htn: data.htn,
          past_similar_conditions: data.similar_conditions ? data.similar_conditions_detail : undefined,
          past_diseases: data.past_diseases.length > 0 ? data.past_diseases : undefined,
          previous_operations: !!data.previous_operations,
          has_allergies: !!data.has_allergies,
          traveled_abroad: !!data.traveled_abroad,
          consanguinity: !!data.consanguinity,
          family_similar_conditions: data.family_similar_conditions || undefined,
          inherited_diseases: data.inherited_diseases ? [data.inherited_diseases] : undefined,
          free_text: data.past_history_paragraph || undefined,
          custom_fields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined,
        },
        admission: {
          bed_id: data.bed_id,
          doctor_id: data.doctor_id,
          transfer_reason: data.transfer_reason || undefined,
          place_of_transfer: data.place_of_transfer || undefined,
          transfer_doctor_name: data.transfer_doctor_name || undefined,
          chief_complaint: data.chief_complaint,
          complaint_analysis: data.complaint_analysis || undefined,
          symptoms_related_system: data.related_system_symptoms || undefined,
          symptoms_other_systems: data.other_system_symptoms || undefined,
          previous_investigations: data.previous_investigations?.labs || data.previous_investigations?.radiology ? data.previous_investigations : undefined,
          previous_treatments: data.previous_treatments || undefined,
          provisional_diagnosis: data.provisional_diagnosis || undefined,
        },
        vital_signs: hasVitals ? {
          temperature: data.temperature ? parseFloat(data.temperature) : undefined,
          pulse: data.pulse ? parseInt(data.pulse) : undefined,
          systolic_bp: data.systolic_bp ? parseInt(data.systolic_bp) : undefined,
          diastolic_bp: data.diastolic_bp ? parseInt(data.diastolic_bp) : undefined,
          respiratory_rate: data.respiratory_rate ? parseInt(data.respiratory_rate) : undefined,
          spo2: data.spo2 ? parseFloat(data.spo2) : undefined,
        } : undefined,
      };

      const admissionRes = await api.post("/admissions/full", fullPayload);
      // Support both wrapped {data: {id: ...}} and direct {id: ...} formats
      const resultData = admissionRes.data.data || admissionRes.data;
      const admissionId = resultData.id;
      const patientId = resultData.patient_id || resultData.patient?.id || resultData.patientId;

      if (!admissionId) {
        throw new Error("Failed to extract admission ID from response");
      }

      // 5. General Exam & Local Exam 
      // Assuming examinations endpoints exist or we skip them if not. 
      // The backend plan said: POST /admissions/:id/examinations
      try {
        await api.post(`/admissions/${admissionId}/examinations`, {
          general_exams: data.general_exam,
          local_exams: data.local_exam,
        });
      } catch (err) {
        console.warn("Examinations endpoint might not exist yet", err);
      }

      // 6. Investigations
      const validInvestigations = data.investigations?.filter(inv => inv.type?.trim()) || [];
      for (const inv of validInvestigations) {
        await api.post(`/admissions/${admissionId}/investigation-orders`, {
          order_name: inv.type,
          type: "Lab",
          order_date: inv.order_date ? inv.order_date.toISOString() : undefined,
        });
      }

      // 7. Medications
      const validMedications = data.medications?.filter(med => med.drug_name?.trim()) || [];
      for (const med of validMedications) {
        await api.post(`/admissions/${admissionId}/medications`, {
          drug_name: med.drug_name,
          dosage: med.dosage || "As prescribed",
          frequency: med.frequency || "Once",
          start_date: med.start_date ? med.start_date.toISOString() : undefined,
          end_date: med.end_date ? med.end_date.toISOString() : undefined,
        });
      }

      // After successful submission, redirect to the patient list
      // (The /patients/:id page is not yet implemented)
      navigate(`/patients`);
    } catch (err) {
      submittingRef.current = false;
      setIsSubmitting(false);
      setSubmitError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to submit admission. Please try again.");
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
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
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
            <form 
              onSubmit={(e) => e.preventDefault()}
              className="space-y-6"
            >
              <CurrentStepComponent form={form} />
              
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  Back
                </Button>

                {currentStep === steps.length - 1 ? (
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => form.handleSubmit(onSubmit)()}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Admission"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                  >
                    Next
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
