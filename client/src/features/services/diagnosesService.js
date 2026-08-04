import api from '@/lib/api';

// Shared vocabulary for every diagnosis form — the dialog and admission Step 6
// must offer exactly what the API accepts.
export const DIAGNOSIS_TYPES = [
  { value: 'PRIMARY', label: 'Primary — the reason for admission' },
  { value: 'SECONDARY', label: 'Secondary — additional active problem' },
  { value: 'COMORBIDITY', label: 'Comorbidity — pre-existing condition' },
  { value: 'COMPLICATION', label: 'Complication — arose during this admission' },
];

export const DIAGNOSIS_STATUSES = {
  SUSPECTED: { label: 'Suspected', description: 'In the differential, not yet proven' },
  CONFIRMED: { label: 'Confirmed', description: 'Supported by evidence' },
  RULED_OUT: { label: 'Ruled out', description: 'Excluded from the differential' },
  RESOLVED: { label: 'Resolved', description: 'Treated and no longer active' },
};

// Only these can be chosen when a diagnosis is first entered — a condition
// cannot be born ruled out or resolved.
export const INITIAL_STATUSES = ['SUSPECTED', 'CONFIRMED'];

// Mirrors ALLOWED_TRANSITIONS in the service. The server is the authority; this
// only decides which buttons to render.
export const ALLOWED_TRANSITIONS = {
  SUSPECTED: ['CONFIRMED', 'RULED_OUT'],
  CONFIRMED: ['RESOLVED', 'RULED_OUT'],
  RESOLVED: ['CONFIRMED'],
  RULED_OUT: [],
};

// Prompts that make the mandatory reason field ask for the right thing.
export const TRANSITION_PROMPTS = {
  CONFIRMED: {
    title: 'Confirm diagnosis',
    label: 'Supporting evidence',
    placeholder: 'e.g. CTPA shows a segmental filling defect in the right lower lobe',
    verb: 'Confirm',
  },
  RULED_OUT: {
    title: 'Rule out diagnosis',
    label: 'Why is this excluded?',
    placeholder: 'e.g. CTPA negative; the raised D-dimer is explained by sepsis',
    verb: 'Rule out',
  },
  RESOLVED: {
    title: 'Resolve diagnosis',
    label: 'How was it resolved?',
    placeholder: 'e.g. Completed 7 days of antibiotics, afebrile for 48h, CXR clear',
    verb: 'Resolve',
  },
};

// A short starter list so the common ICU conditions are one keystroke away.
// This is a convenience, not a coding system — free text stays valid.
export const COMMON_DIAGNOSES = [
  { name: 'Sepsis', icd: 'A41.9' },
  { name: 'Septic shock', icd: 'R65.21' },
  { name: 'Acute respiratory failure', icd: 'J96.0' },
  { name: 'ARDS', icd: 'J80' },
  { name: 'Community-acquired pneumonia', icd: 'J18.9' },
  { name: 'Aspiration pneumonia', icd: 'J69.0' },
  { name: 'COPD exacerbation', icd: 'J44.1' },
  { name: 'Acute kidney injury', icd: 'N17.9' },
  { name: 'Acute myocardial infarction', icd: 'I21.9' },
  { name: 'Cardiogenic shock', icd: 'R57.0' },
  { name: 'Congestive heart failure', icd: 'I50.9' },
  { name: 'Atrial fibrillation', icd: 'I48.91' },
  { name: 'Pulmonary embolism', icd: 'I26.99' },
  { name: 'Acute ischaemic stroke', icd: 'I63.9' },
  { name: 'Intracerebral haemorrhage', icd: 'I61.9' },
  { name: 'Diabetic ketoacidosis', icd: 'E10.10' },
  { name: 'Type 2 diabetes mellitus', icd: 'E11.9' },
  { name: 'Essential hypertension', icd: 'I10' },
  { name: 'Acute liver failure', icd: 'K72.00' },
  { name: 'Upper GI bleed', icd: 'K92.2' },
  { name: 'Acute pancreatitis', icd: 'K85.90' },
  { name: 'Hypovolaemic shock', icd: 'R57.1' },
  { name: 'Delirium', icd: 'F05' },
  { name: 'Seizure disorder', icd: 'G40.909' },
];

/** ICD-10 shape check matching the server's Joi rule. */
export function isValidIcdCode(code) {
  return /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/.test(code);
}

export const diagnosesService = {
  async list(admissionId, params = {}) {
    const { data } = await api.get(`/admissions/${admissionId}/diagnoses`, { params });
    return data || [];
  },

  async openConcerns(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/diagnosis-concerns`);
    return data || [];
  },

  async create(admissionId, payload) {
    const { data } = await api.post(`/admissions/${admissionId}/diagnoses`, payload);
    return data;
  },

  /** Amending archives the old row and returns a new one with a new id. */
  async update(diagnosisId, payload) {
    const { data } = await api.patch(`/diagnoses/${diagnosisId}`, payload);
    return data;
  },

  /** Confirm / rule out / resolve. The reason is mandatory server-side. */
  async changeStatus(diagnosisId, status, reason, resolvedAt) {
    const body = { status, reason };
    if (status === 'RESOLVED' && resolvedAt) body.resolved_at = resolvedAt;
    const { data } = await api.patch(`/diagnoses/${diagnosisId}/status`, body);
    return data;
  },

  async remove(diagnosisId) {
    await api.delete(`/diagnoses/${diagnosisId}`);
  },

  async acknowledge(diagnosisId) {
    const { data } = await api.post(`/diagnoses/${diagnosisId}/acknowledge`);
    return data;
  },

  async raiseConcern(diagnosisId, note) {
    const { data } = await api.post(`/diagnoses/${diagnosisId}/concerns`, { note });
    return data;
  },

  async respondToConcern(concernId, status, responseNote) {
    const { data } = await api.patch(`/diagnosis-concerns/${concernId}`, {
      status,
      response_note: responseNote,
    });
    return data;
  },
};
