import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  // Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  // Clock,
  Info,
  Loader2,
  Pill,
  // Shield,
  User,
  // XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent,/* CardHeader, CardTitle*/ } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function MedAdministrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const admissionIdFromUrl = searchParams.get('admissionId') || '';

  // Core state
  const [admissions, setAdmissions] = useState([]);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dialog state for Refusal / Withhold notes
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [actionStatus, setActionStatus] = useState(''); // 'REFUSED' | 'HELD'
  const [actionNotes, setActionNotes] = useState('');

  // Fetch active admissions on mount
  useEffect(() => {
    async function initPage() {
      try {
        setIsLoading(true);
        const { data: adData } = await api.get('/admissions?status=ACTIVE');
        const activeList = adData.data || [];
        setAdmissions(activeList);

        // Pick initial admission
        let initialAd = null;
        if (admissionIdFromUrl) {
          initialAd = activeList.find(a => a.id === admissionIdFromUrl);
        }
        if (!initialAd && activeList.length > 0) {
          initialAd = activeList.find(a => a.patient?.name?.includes('Emma')) || activeList[0];
          setSearchParams({ admissionId: initialAd.id }, { replace: true });
        }
        setActiveAdmission(initialAd);
      } catch (err) {
        console.error("Initialization error:", err);
        setErrorMsg("Failed to load active patient admissions.");
      } finally {
        setIsLoading(false);
      }
    }
    initPage();
  }, [admissionIdFromUrl]);

  // Fetch medications for the selected patient
  useEffect(() => {
    if (!activeAdmission) return;
    async function fetchMedications() {
      try {
        const { data: medsData } = await api.get(`/admissions/${activeAdmission.id}/medications`);
        setMedications(medsData || []);
      } catch (err) {
        console.error("Fetch medications error:", err);
        setErrorMsg("Failed to load patient medications.");
      }
    }
    fetchMedications();
  }, [activeAdmission]);

  const handlePatientSwitch = (val) => {
    const selected = admissions.find(a => a.id === val);
    setActiveAdmission(selected);
    setSearchParams({ admissionId: val });
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Submit medication log action
  const logMedAction = async (medId, status, dose, notes) => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      // ponytail: simplification - using now as scheduled_time default for quick logging
      const payload = {
        status,
        administered_dose: dose || undefined,
        notes: notes || undefined,
        scheduled_time: new Date().toISOString(),
        administered_at: new Date().toISOString()
      };

      await api.post(`/medications/${medId}/administrations`, payload);
      setSuccessMsg(`Successfully logged medication action: ${status.toLowerCase()}.`);

      // Refresh patient medications and administrations history
      const { data: medsData } = await api.get(`/admissions/${activeAdmission.id}/medications`);
      setMedications(medsData || []);
    } catch (err) {
      console.error("Log action error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to log medication administration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open note drawer/dialog for Refused or Withheld actions
  const triggerRefusalOrWithhold = (med, status) => {
    setSelectedMed(med);
    setActionStatus(status);
    setActionNotes('');
    setIsDialogOpen(true);
  };

  // Submit from notes Dialog
  const handleDialogSubmit = async () => {
    if (!actionNotes.trim()) {
      alert("A reason is required to document withholding or refusing medication.");
      return;
    }
    setIsDialogOpen(false);
    await logMedAction(selectedMed.id, actionStatus, null, actionNotes);
  };

  // Calculate shift progress metrics
  const totalMedsCount = medications.length;
  const recordedMedsCount = medications.filter(med => med.administrations?.length > 0).length;
  const progressPercent = totalMedsCount > 0 ? (recordedMedsCount / totalMedsCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 font-sans text-sm text-muted-foreground">Loading MAR records...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Pill className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-headline font-bold text-foreground">
            Medication Administration
          </h1>
          <p className="text-xs text-muted-foreground font-sans">
            MAR &mdash; Medication Administration Record
          </p>
        </div>
      </div>

      {/* ── Active Patients Horizontal List ───────────────────────────────────── */}
      <div className="mb-8">
        <div className="text-xs font-label uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
          Patient List
        </div>
        <div className="flex flex-wrap gap-2">
          {admissions.map(ad => {
            const isSelected = activeAdmission?.id === ad.id;
            return (
              <Button
                key={ad.id}
                variant={isSelected ? "default" : "outline"}
                className={`h-auto px-4 py-3 flex flex-col items-start gap-1 rounded-xl transition-all ${
                  isSelected 
                    ? "bg-primary text-white border-primary shadow-sm" 
                    : "bg-card text-foreground hover:bg-muted/50 border-border"
                }`}
                onClick={() => handlePatientSwitch(ad.id)}
              >
                <span className="font-display text-sm font-semibold">{ad.patient?.name?.split(' ')[0]}</span>
                <span className={`text-[10px] font-mono font-tnum ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                  {ad.bed?.bed_number || 'No Bed'}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Clinical Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Administered</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* ── Active Patient Info Block ────────────────────────────────────────── */}
      {activeAdmission && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {activeAdmission.patient?.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                MRN: {activeAdmission.patient?.mrn} &middot; Bed: {activeAdmission.bed?.bed_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-sans text-muted-foreground">
            <div>
              Age: <span className="font-tnum font-semibold text-foreground">{activeAdmission.patient?.age}</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-border" />
            <div>
              Gender: <span className="font-semibold text-foreground">{activeAdmission.patient?.gender}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Medications Checklist ────────────────────────────────────────────── */}
      <div className="space-y-4 mb-24">
        {medications.length === 0 ? (
          <Card className="border-border bg-card p-8 text-center">
            <Info className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="font-display text-base font-semibold text-foreground mb-2">No Active Medication Orders</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              There are currently no active medication prescriptions logged for this patient.
            </p>
          </Card>
        ) : (
          medications.map(med => {
            const hasRecord = med.administrations && med.administrations.length > 0;
            const latestAdmin = hasRecord ? med.administrations[med.administrations.length - 1] : null;

            return (
              <Card 
                key={med.id} 
                className={`border transition-all ${
                  latestAdmin?.status === 'ADMINISTERED' 
                    ? 'border-emerald-500/20 bg-emerald-500/[0.02]' 
                    : latestAdmin?.status === 'REFUSED' 
                    ? 'border-destructive/20 bg-destructive/[0.02]' 
                    : latestAdmin?.status === 'HELD' 
                    ? 'border-amber-500/20 bg-amber-500/[0.02]' 
                    : 'border-border bg-card'
                }`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  
                  {/* Medication Info */}
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      latestAdmin?.status === 'ADMINISTERED' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : latestAdmin?.status === 'REFUSED' 
                        ? 'bg-destructive/10 text-destructive' 
                        : latestAdmin?.status === 'HELD' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <Pill className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-base font-bold text-foreground">
                          {med.drugName}
                        </h4>
                        
                        {/* Status tag */}
                        {med.isActive ? (
                          <Badge variant="secondary" className="text-[10px] py-0 font-mono">Running</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] py-0 font-mono text-muted-foreground">Discontinued</Badge>
                        )}
                      </div>

                      <p className="text-sm font-sans text-muted-foreground">
                        {med.dosage} &middot; IV &middot; {med.frequency}
                      </p>

                      {/* Warning/hold instructions if applicable */}
                      {med.drugName === 'Lisinopril' && (
                        <p className="text-xs font-sans font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Hold if SBP &lt; 100
                        </p>
                      )}

                      {/* Historical details */}
                      {latestAdmin && (
                        <p className="text-xs font-sans text-muted-foreground mt-2">
                          Recorded at <span className="font-tnum">{new Date(latestAdmin.administeredAt || latestAdmin.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> by <span className="font-semibold">{latestAdmin.administeredBy?.firstName} {latestAdmin.administeredBy?.lastName}, RN</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!latestAdmin ? (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold flex items-center gap-1.5"
                          disabled={isSubmitting}
                          onClick={() => logMedAction(med.id, 'ADMINISTERED', med.dosage)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Administered
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 border-destructive/20 font-sans"
                          disabled={isSubmitting}
                          onClick={() => triggerRefusalOrWithhold(med, 'REFUSED')}
                        >
                          Refused
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 hover:bg-amber-500/10 border-amber-500/20 font-sans"
                          disabled={isSubmitting}
                          onClick={() => triggerRefusalOrWithhold(med, 'HELD')}
                        >
                          Withheld
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {latestAdmin.status === 'ADMINISTERED' && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 font-sans font-semibold border-emerald-500/20 py-1 px-3 text-sm">
                            Administered ✓
                          </Badge>
                        )}
                        {latestAdmin.status === 'REFUSED' && (
                          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 font-sans font-semibold border-destructive/20 py-1 px-3 text-sm">
                            Refused
                          </Badge>
                        )}
                        {latestAdmin.status === 'HELD' && (
                          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 font-sans font-semibold border-amber-500/20 py-1 px-3 text-sm">
                            Withheld
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Bottom Shift Progress Bar ────────────────────────────────────────── */}
      {medications.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-4 shadow-lg lg:left-64">
          <div className="mx-auto max-w-5xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-display text-sm font-semibold text-foreground">
                Shift Checklist Status
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                <span className="font-tnum font-semibold text-foreground">{recordedMedsCount}</span> of <span className="font-tnum font-semibold text-foreground">{totalMedsCount}</span> medications recorded this shift
              </p>
            </div>
            <div className="w-full md:w-80">
              <Progress value={progressPercent} className="h-2 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog for Withholding or Refusing Vitals ─────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Document Medication {actionStatus === 'REFUSED' ? 'Refusal' : 'Withhold'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please document the clinical details or reason for this action. This documentation will be saved in the patient's electronic MAR history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold">Clinical Notes / Reason</Label>
              <Textarea
                id="notes"
                placeholder={
                  actionStatus === 'REFUSED' 
                    ? "e.g. Patient refused stating nausea..." 
                    : "e.g. Held Metoprolol because Systolic BP is 92 mmHg..."
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="min-h-24 bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={isSubmitting}
              onClick={handleDialogSubmit}
            >
              Save Documentation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
