/* Hallmark · macrostructure: Conversational FAQ · genre: modern-minimal · theme: system-managed */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Activity,
  Users,
  BedDouble,
  UserPlus,
  Pill,
  FlaskConical,
  FileText,
  ClipboardList,
  History,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Role-tailored documentation data
// ---------------------------------------------------------------------------
const ROLE_GUIDES = {
  SYSTEM_ADMIN: {
    title: 'System Administrator Manual',
    description: 'User access control, physical bed provisioning, and system audit log compliance.',
    badge: 'System Admin',
    features: [
      {
        icon: Users,
        title: 'User Management',
        route: '/admin/users',
        actionText: 'Manage Staff',
        summary: 'Provision new staff accounts, assign clinical roles, and manage active status.',
        details: [
          'Create new accounts for Nurses, Residents, and Specialists.',
          'Assign role-based access control (RBAC) permissions.',
          'Instantly deactivate accounts for departing staff via context menu.',
          'Filter staff by role or active employment status.'
        ]
      },
      {
        icon: BedDouble,
        title: 'Bed Management',
        route: '/admin/beds',
        actionText: 'Manage Beds',
        summary: 'Add physical ICU beds to ward inventory and configure maintenance states.',
        details: [
          'Add new bed identifiers (e.g. ICU-01 to ICU-12).',
          'Set bed status to Available, Occupied, or Under Maintenance.',
          'Monitor overall ward occupancy statistics in real-time.'
        ]
      },
      {
        icon: History,
        title: 'Audit Logs',
        route: '/admin/audit-logs',
        actionText: 'View Audit Logs',
        summary: 'Immutable system audit trail for HIPAA compliance and security monitoring.',
        details: [
          'Review every system creation, update, or deletion event.',
          'Track user IP addresses, timestamps, and target records.',
          'Filter audit logs by action category (AUTH, PATIENT, VITALS, BEDS).'
        ]
      }
    ],
    workflows: [
      {
        title: 'How to Onboard a New ICU Staff Member',
        steps: [
          'Navigate to Manage Users from the sidebar.',
          'Click the "Add User" button in the upper right.',
          'Enter the employee\'s name, email, temporary password, and select their role.',
          'Click Submit. The staff member can now log in immediately with their credentials.'
        ]
      },
      {
        title: 'How to Provision a New ICU Bed',
        steps: [
          'Navigate to Manage Beds.',
          'Click "Add Bed" and enter the unique bed code (e.g. ICU-09).',
          'The bed will automatically register as Available for patient assignment.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Can I delete an audit log?',
        a: 'No. To maintain strict HIPAA compliance and medical traceability, audit logs are permanent and immutable.'
      },
      {
        q: 'What happens when I deactivate a user?',
        a: 'The user will be immediately logged out and blocked from logging back into the system. Their past audit logs and clinical entries remain preserved.'
      }
    ]
  },

  ICU_NURSE: {
    title: 'ICU Nurse Clinical Guide',
    description: 'Bedside monitoring, rapid vitals entry, medication administration, and shift notes.',
    badge: 'ICU Nurse',
    features: [
      {
        icon: BedDouble,
        title: 'Bed Overview',
        route: '/beds',
        actionText: 'View Beds',
        summary: 'Real-time overview of occupied beds and continuous patient vitals.',
        details: [
          'View real-time heart rate and SpO₂ telemetry per bed.',
          'Check assigned nurse responsibilities per bed card.',
          'Identify critical telemetry alerts immediately.'
        ]
      },
      {
        icon: Activity,
        title: 'Vitals Entry',
        route: '/vitals/entry',
        actionText: 'Record Vitals',
        summary: 'Rapid bedside measurement entry for heart rate, blood pressure, SpO₂, and temp.',
        details: [
          'Select patient bed and input vital metrics.',
          'System automatically evaluates thresholds and flags abnormal vitals.',
          'View past vitals history trend per patient.'
        ]
      },
      {
        icon: Pill,
        title: 'Medication Administration',
        route: '/medications/administration',
        actionText: 'Record Admin',
        summary: 'Log medication doses administered to patients as prescribed.',
        details: [
          'Select prescribed active medication order.',
          'Confirm dosage, route, and time administered.',
          'System logs administration record for resident review.'
        ]
      },
      {
        icon: FileText,
        title: 'Nursing Notes',
        route: '/nursing-notes',
        actionText: 'Nursing Notes',
        summary: 'Create and review shift notes and nursing handovers.',
        details: [
          'Record shift observations, patient comfort, and nursing care delivered.',
          'Tag notes by priority or clinical category.'
        ]
      }
    ],
    workflows: [
      {
        title: 'How to Record Hourly Patient Vitals',
        steps: [
          'Click "Vitals Entry" in the sidebar.',
          'Select the target patient or bed from the dropdown.',
          'Enter HR (bpm), BP (mmHg), SpO₂ (%), and Temperature (°C).',
          'Click Save. The vitals will immediately reflect on the patient detail page and Bed Overview.'
        ]
      },
      {
        title: 'How to Record a Medication Dosage',
        steps: [
          'Go to "Med Administration".',
          'Find the active prescription for your patient.',
          'Click "Administer Dose", verify the amount, and click Confirm.'
        ]
      }
    ],
    faqs: [
      {
        q: 'What if a vital sign is out of safe range?',
        a: 'The system will automatically generate a high-priority alert on the patient\'s detail page and trigger telemetry highlighting on the Bed Overview.'
      }
    ]
  },

  MEDICAL_RESIDENT: {
    title: 'Medical Resident Clinical Guide',
    description: 'Patient admissions, diagnostic reviews, medication prescriptions, and vitals monitoring.',
    badge: 'Medical Resident',
    features: [
      {
        icon: Users,
        title: 'Patient List',
        route: '/patients',
        actionText: 'View Patients',
        summary: 'Comprehensive list of active ICU admissions and clinical summaries.',
        details: [
          'Search patients by name, MRN, or admitting diagnosis.',
          'Access full patient detail page including vitals, medications, and notes.',
          'Filter patients by severity status.'
        ]
      },
      {
        icon: UserPlus,
        title: 'Admit Patient',
        route: '/patients/admit',
        actionText: 'Admit Patient',
        summary: 'Intake new patients, assign empty ICU beds, and input initial diagnoses.',
        details: [
          'Enter patient demographic info and Medical Record Number (MRN).',
          'Assign an available physical ICU bed.',
          'Record chief complaint, initial diagnosis, and triage urgency.'
        ]
      },
      {
        icon: Activity,
        title: 'Vitals Monitor',
        route: '/vitals/monitor',
        actionText: 'Monitor Vitals',
        summary: 'Multi-patient continuous telemetry monitor and trend graphs.',
        details: [
          'View continuous line graphs for vital sign telemetry.',
          'Compare historical vitals over 24h/48h windows.',
          'Spot early signs of clinical deterioration.'
        ]
      },
      {
        icon: Pill,
        title: 'Medications',
        route: '/medications',
        actionText: 'Manage Meds',
        summary: 'Prescribe medications, adjust dosages, and monitor administration schedules.',
        details: [
          'Prescribe new drug orders with dosage, frequency, and route.',
          'Review active vs discontinued medication orders.',
          'Check nurse administration logs.'
        ]
      },
      {
        icon: FlaskConical,
        title: 'Lab Results',
        route: '/labs',
        actionText: 'Lab Results',
        summary: 'Review laboratory test results (ABG, CBC, Metabolic Panels).',
        details: [
          'View lab test values with reference ranges highlighted.',
          'Track critical lab trends over time.'
        ]
      }
    ],
    workflows: [
      {
        title: 'How to Admit a New Patient to the ICU',
        steps: [
          'Navigate to "Admit Patient" from the sidebar.',
          'Fill in patient personal details (Name, Age, Gender, MRN).',
          'Select an available bed from the ICU bed dropdown.',
          'Input admission diagnosis and initial care instructions.',
          'Click "Admit Patient" to finalize. The bed status automatically updates to Occupied.'
        ]
      },
      {
        title: 'How to Prescribe a Medication',
        steps: [
          'Go to "Medications" or open the specific Patient Detail page.',
          'Click "New Prescription".',
          'Search for the drug, set the dosage, route (IV/Oral), and schedule.',
          'Submit the prescription. It will immediately appear on the nurse\'s Med Administration queue.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Who can approve a patient discharge?',
        a: 'While Residents can prepare discharge summaries, final discharge authorization is reserved for ICU Specialists.'
      }
    ]
  },

  ICU_SPECIALIST: {
    title: 'ICU Specialist Executive Guide',
    description: 'Attending physician oversight, clinical decision support, and discharge authorizations.',
    badge: 'ICU Specialist',
    features: [
      {
        icon: Users,
        title: 'Patient Directory',
        route: '/patients',
        actionText: 'View Patients',
        summary: 'High-level overview of all ICU patients under attending care.',
        details: [
          'Review complete patient medical records and longitudinal care plans.',
          'Access AI decision-support insights and risk scores.'
        ]
      },
      {
        icon: BedDouble,
        title: 'Bed Overview',
        route: '/beds',
        actionText: 'Ward Status',
        summary: 'Attending-level ward monitoring and bed allocation management.',
        details: [
          'Monitor unit-wide occupancy and patient acuity breakdown.',
          'Review bed assignments across care teams.'
        ]
      },
      {
        icon: ClipboardList,
        title: 'Discharge',
        route: '/discharge',
        actionText: 'Discharge Center',
        summary: 'Authorize patient discharges and finalize clinical summaries.',
        details: [
          'Review readiness for discharge criteria.',
          'Approve patient transfers to step-down units or home discharge.',
          'Sign off on finalized discharge summaries.'
        ]
      }
    ],
    workflows: [
      {
        title: 'How to Process a Patient Discharge',
        steps: [
          'Navigate to "Discharge" in the sidebar.',
          'Select the patient ready for discharge.',
          'Review the discharge checklist (stable vitals, medication reconciliation, notes).',
          'Sign off on the discharge order. The patient\'s bed will automatically revert to Available.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Where do I view AI diagnostic recommendations?',
        a: 'Open any patient detail page and navigate to the "AI Assistant" tab for real-time clinical decision support.'
      }
    ]
  }
};

export default function HelpPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback to ICU_NURSE guide if user or role is not set
  const roleGuide = ROLE_GUIDES[user?.role] || ROLE_GUIDES.ICU_NURSE;

  // Filtered features based on search input
  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return roleGuide.features;
    const q = searchQuery.toLowerCase();
    return roleGuide.features.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.details.some((d) => d.toLowerCase().includes(q))
    );
  }, [roleGuide, searchQuery]);

  // Filtered workflows based on search input
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return roleGuide.workflows;
    const q = searchQuery.toLowerCase();
    return roleGuide.workflows.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.steps.some((s) => s.toLowerCase().includes(q))
    );
  }, [roleGuide, searchQuery]);

  // Filtered FAQs based on search input
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return roleGuide.faqs;
    const q = searchQuery.toLowerCase();
    return roleGuide.faqs.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [roleGuide, searchQuery]);

  return (
    <div className="flex flex-col gap-10 p-4 sm:p-8 md:p-12 bg-background min-h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full">
      
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-sans text-muted-foreground uppercase tracking-widest font-semibold">
              Documentation & Support
            </span>
            <Badge variant="secondary" className="font-sans text-[10px] tracking-widest uppercase">
              {roleGuide.badge}
            </Badge>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary shrink-0" />
            <span>{roleGuide.title}</span>
          </h1>
          <p className="font-sans text-muted-foreground mt-3 text-sm sm:text-base max-w-2xl leading-relaxed">
            {roleGuide.description}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search guides, actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 font-sans h-10 bg-card text-sm"
          />
        </div>
      </div>

      {/* ── Role Scope Banner ───────────────────────────────────────────────── */}
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-sans text-sm font-semibold text-foreground">
              Role-Based Permission Scope
            </h3>
            <p className="font-sans text-sm text-muted-foreground mt-1 leading-relaxed">
              Logged in as <strong className="text-foreground">{user?.first_name} {user?.last_name}</strong> ({roleGuide.badge}). Showing authorized features only.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-16 mt-2">
        {/* ── Authorized Features ────────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <h2 className="font-display text-headline text-foreground tracking-tight">Authorized Features</h2>
            <p className="text-sm text-muted-foreground font-sans mt-1">Modules and tools available to your role.</p>
          </div>
          
          {filteredFeatures.length === 0 ? (
            <div className="text-center py-12 font-sans text-sm text-muted-foreground bg-card rounded-xl border border-border px-4">
              No features match your search query "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {filteredFeatures.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <Card key={feat.title} className="flex flex-col shadow-sm border-border bg-card">
                    <CardHeader className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <CardTitle className="font-sans text-base font-semibold text-foreground truncate">
                            {feat.title}
                          </CardTitle>
                        </div>
                      </div>
                      <CardDescription className="font-sans text-sm text-muted-foreground pt-3 leading-relaxed">
                        {feat.summary}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pt-0 pb-5 flex-1 flex flex-col justify-between gap-5">
                      <ul className="space-y-2.5 text-sm font-sans text-muted-foreground">
                        {feat.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="leading-snug">{detail}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(feat.route)}
                        className="font-sans text-sm w-full gap-2 mt-2"
                      >
                        {feat.actionText} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Step-by-Step Workflows ────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <h2 className="font-display text-headline text-foreground tracking-tight">Workflows</h2>
            <p className="text-sm text-muted-foreground font-sans mt-1">Step-by-step guides for common tasks.</p>
          </div>

          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-12 font-sans text-sm text-muted-foreground bg-card rounded-xl border border-border px-4">
              No workflows match your search query "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredWorkflows.map((flow) => (
                <div key={flow.title} className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h3 className="font-sans text-base font-semibold text-foreground flex items-center gap-2.5 mb-5">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span>{flow.title}</span>
                  </h3>
                  <ol className="relative border-l border-border ml-2 space-y-6">
                    {flow.steps.map((stepText, idx) => (
                      <li key={idx} className="ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-muted-foreground font-sans text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <p className="font-sans text-sm text-foreground leading-relaxed pt-0.5">
                          {stepText}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── FAQs ──────────────────────────────────────────────────── */}
        <section>
          <div className="mb-6">
            <h2 className="font-display text-headline text-foreground tracking-tight">Frequently Asked Questions</h2>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 font-sans text-sm text-muted-foreground bg-card rounded-xl border border-border px-4">
              No FAQs match your search query "{searchQuery}".
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredFaqs.map((faq, idx) => (
                <div key={idx} className="bg-card rounded-lg border border-border p-5 sm:p-6 shadow-sm">
                  <h3 className="font-sans text-base font-semibold text-foreground flex items-start gap-3 mb-2">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="leading-snug">{faq.q}</span>
                  </h3>
                  <p className="font-sans text-sm text-muted-foreground leading-relaxed pl-8">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
