import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Pill,
  ShieldAlert,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { patientsService } from '../services/patientsService';
import { medicationsService, formatFrequency } from '../services/medicationsService';
import DiagnosisContextStrip from '../components/diagnoses/DiagnosisContextStrip';

// One visual language for dose state, shared by the slot pill and its card.
const SLOT_STYLES = {
  ADMINISTERED: {
    label: 'Given',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    ring: 'border-emerald-500/30 bg-emerald-500/[0.03]',
  },
  REFUSED: {
    label: 'Refused',
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    ring: 'border-destructive/30 bg-destructive/[0.03]',
  },
  HELD: {
    label: 'Withheld',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    ring: 'border-amber-500/30 bg-amber-500/[0.03]',
  },
  MISSED: {
    label: 'Overdue',
    badge: 'bg-destructive/10 text-destructive border-destructive/40',
    ring: 'border-destructive/40 bg-destructive/[0.05]',
  },
  DUE: {
    label: 'Due now',
    badge: 'bg-primary/10 text-primary border-primary/30',
    ring: 'border-primary/40 bg-primary/[0.03]',
  },
  UPCOMING: {
    label: 'Upcoming',
    badge: 'bg-muted text-muted-foreground border-border',
    ring: 'border-border bg-card',
  },
  NOT_APPLICABLE: {
    label: 'Cancelled',
    badge: 'bg-muted text-muted-foreground border-border',
    ring: 'border-border bg-muted/20',
  },
};

const todayIso = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MedAdministrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const admissionIdFromUrl = searchParams.get('admissionId') || '';

  // Core state
  const [admissions, setAdmissions] = useState([]);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [mar, setMar] = useState(null);
  const [date, setDate] = useState(todayIso());
  const [isLoadingAdmissions, setIsLoadingAdmissions] = useState(true);
  const [isLoadingMar, setIsLoadingMar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dialog state for Refusal / Withhold notes
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { medication, dose, status }
  const [actionNotes, setActionNotes] = useState('');

  // Fetch active admissions ONCE on mount
  useEffect(() => {
    async function initPage() {
      try {
        setIsLoadingAdmissions(true);
        const activeList = await patientsService.getActiveAdmissions();
        setAdmissions(activeList);

        // Pick initial admission from URL or use first
        let initialAd = null;
        if (admissionIdFromUrl) {
          initialAd = activeList.find((a) => a.id === admissionIdFromUrl);
        }
        if (!initialAd && activeList.length > 0) {
          initialAd = activeList[0];
        }
        setActiveAdmission(initialAd);
      } catch (err) {
        console.error('Initialization error:', err);
        setErrorMsg('Failed to load active patient admissions.');
      } finally {
        setIsLoadingAdmissions(false);
      }
    }
    initPage();
  }, []); // Empty array: runs only on mount

  const fetchMar = useCallback(async () => {
    if (!activeAdmission?.id) return;
    try {
      setIsLoadingMar(true);
      const data = await medicationsService.getMar(activeAdmission.id, date);
      setMar(data);
    } catch (err) {
      console.error('Fetch MAR error:', err);
      setErrorMsg('Failed to load the administration record.');
    } finally {
      setIsLoadingMar(false);
    }
  }, [activeAdmission, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMar();
  }, [fetchMar]);

  const handlePatientSwitch = (val) => {
    const selected = admissions.find((a) => a.id === val);
    setActiveAdmission(selected);
    setSearchParams({ admissionId: val });
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Submit a dose against the slot it belongs to — never against "now", so a
  // late-recorded 08:00 dose stays an 08:00 dose in the record.
  const logDose = async (medication, dose, status, notes) => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      await medicationsService.logAdministration(medication.id, {
        status,
        administered_dose: status === 'ADMINISTERED' ? medication.dosage : undefined,
        notes: notes || undefined,
        scheduled_time: dose.scheduledTime,
        administered_at: new Date().toISOString(),
      });

      setSuccessMsg(
        `${medication.drugName} — ${formatTime(dose.scheduledTime)} dose recorded as ${status.toLowerCase()}.`
      );
      await fetchMar();
    } catch (err) {
      console.error('Log action error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to log medication administration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // PRN and continuous orders have no slots, so the dose time is the moment the
  // nurse records it.
  const logUnscheduledDose = (medication, status) => {
    const dose = { scheduledTime: new Date().toISOString() };
    if (status === 'ADMINISTERED') return logDose(medication, dose, status);
    openNotesDialog(medication, dose, status);
    return undefined;
  };

  const openNotesDialog = (medication, dose, status) => {
    setPendingAction({ medication, dose, status });
    setActionNotes('');
    setIsDialogOpen(true);
  };

  const handleDialogSubmit = async () => {
    if (!actionNotes.trim()) return;
    const { medication, dose, status } = pendingAction;
    setIsDialogOpen(false);
    await logDose(medication, dose, status, actionNotes.trim());
  };

  const medications = mar?.medications || [];
  const summary = mar?.summary || { total: 0, administered: 0, missed: 0, due: 0 };
  const progressPercent = summary.total > 0 ? (summary.administered / summary.total) * 100 : 0;
  const isToday = date === todayIso();

  if (isLoadingAdmissions) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>

        <div className="mb-8">
          <Skeleton className="mb-3 h-3 w-24" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-[62px] w-28 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-headline font-bold text-foreground">
              Medication Administration
            </h1>
            <p className="font-sans text-xs text-muted-foreground">
              MAR &mdash; Medication Administration Record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="mar-date" className="text-xs font-semibold text-muted-foreground">
            Date
          </Label>
          <input
            id="mar-date"
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 font-tnum text-sm text-foreground"
          />
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setDate(todayIso())}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* ── Active Patients Horizontal List ───────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-3 font-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Patient List
        </div>
        {/* One swipeable row on phones. Wrapping this list pushed the medication
            cards ~430px down a 812px screen once the ward had a dozen patients. */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
          {admissions.map((ad) => {
            const isSelected = activeAdmission?.id === ad.id;
            return (
              <Button
                key={ad.id}
                variant={isSelected ? 'default' : 'outline'}
                className={`h-auto shrink-0 snap-start flex-col items-start gap-1 rounded-xl px-4 py-3 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-card text-foreground hover:bg-muted/50'
                }`}
                onClick={() => handlePatientSwitch(ad.id)}
              >
                <span className="font-display text-sm font-semibold">
                  {ad.patient?.name?.split(' ')[0]}
                </span>
                <span
                  className={`font-mono font-tnum text-[10px] ${
                    isSelected ? 'text-white/80' : 'text-muted-foreground'
                  }`}
                >
                  {ad.bed?.bed_number || ad.bed?.bedNumber || 'No Bed'}
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
          <AlertTitle>Recorded</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {summary.missed > 0 && (
        <Alert variant="destructive" className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertTitle>
            {summary.missed} overdue {summary.missed === 1 ? 'dose' : 'doses'}
          </AlertTitle>
          <AlertDescription>
            Record what happened with each overdue dose, or document why it was withheld.
          </AlertDescription>
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
              <p className="font-mono text-xs text-muted-foreground">
                MRN: {activeAdmission.patient?.mrn} &middot; Bed:{' '}
                {activeAdmission.bed?.bed_number || activeAdmission.bed?.bedNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 font-sans text-xs text-muted-foreground">
            <div>
              Age:{' '}
              <span className="font-tnum font-semibold text-foreground">
                {activeAdmission.patient?.age}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-border" />
            <div>
              Gender: <span className="font-semibold text-foreground">{activeAdmission.patient?.gender}</span>
            </div>
          </div>
        </div>
      )}

      {/* Why these drugs are being given — the problem list lives on another
          screen the nurse is not looking at while charting doses. */}
      {activeAdmission && (
        <DiagnosisContextStrip admissionId={activeAdmission.id} className="mb-6" />
      )}

      {/* ── Medication Schedule ──────────────────────────────────────────────── */}
      <div className="mb-24 space-y-4">
        {isLoadingMar ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="border-border">
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : medications.length === 0 ? (
          <Card className="border-border bg-card p-8 text-center">
            <Info className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
            <h3 className="mb-2 font-display text-base font-semibold text-foreground">
              No Active Medication Orders
            </h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              There are currently no active medication prescriptions for this patient.
            </p>
          </Card>
        ) : (
          medications.map((med) => (
            <Card key={med.id} className="border-border">
              <CardContent className="space-y-4 p-4">

                {/* Order header */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Pill className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-base font-bold text-foreground">
                        {med.drugName}
                      </h4>
                      {!med.isScheduled && (
                        <Badge variant="secondary" className="py-0 font-mono text-[10px]">
                          {formatFrequency(med)}
                        </Badge>
                      )}
                    </div>

                    <p className="font-sans text-sm text-muted-foreground">
                      {med.dosage}
                      {med.route && <> &middot; {med.route}</>} &middot; {formatFrequency(med)}
                    </p>

                    {med.instructions && (
                      <p className="flex items-center gap-1 font-sans text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {med.instructions}
                      </p>
                    )}

                    {med.allergyAcknowledged && (
                      <p className="flex items-center gap-1 font-sans text-xs font-semibold text-destructive">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        Prescribed despite a documented allergy — check with the prescriber if unsure.
                      </p>
                    )}
                  </div>
                </div>

                {/* Dose slots */}
                {med.doses.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
                    <p className="font-sans text-xs text-muted-foreground">
                      {med.isScheduled
                        ? 'No doses due on this date.'
                        : 'No fixed schedule — record each dose as it is given.'}
                    </p>
                    {!med.isScheduled && isToday && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 font-sans font-semibold text-white hover:bg-emerald-700"
                          disabled={isSubmitting}
                          onClick={() => logUnscheduledDose(med, 'ADMINISTERED')}
                        >
                          <CheckCircle className="mr-1.5 h-4 w-4" />
                          Record dose
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500/20 font-sans text-amber-600 hover:bg-amber-500/10"
                          disabled={isSubmitting}
                          onClick={() => logUnscheduledDose(med, 'HELD')}
                        >
                          Withheld
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {med.doses.map((dose) => {
                      const style = SLOT_STYLES[dose.status] || SLOT_STYLES.UPCOMING;
                      const isActionable = ['DUE', 'MISSED', 'UPCOMING'].includes(dose.status);
                      const adm = dose.administration;

                      return (
                        <div
                          key={dose.scheduledTime}
                          className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${style.ring}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-14 font-tnum text-sm font-bold text-foreground">
                              {formatTime(dose.scheduledTime)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`font-sans text-[10px] font-semibold ${style.badge}`}
                            >
                              {style.label}
                            </Badge>
                            {adm && (
                              <span className="font-sans text-xs text-muted-foreground">
                                {adm.administeredBy
                                  ? `${adm.administeredBy.firstName} ${adm.administeredBy.lastName}`
                                  : 'Unknown'}
                                {adm.administeredAt && <> at {formatTime(adm.administeredAt)}</>}
                                {adm.notes && <> &middot; {adm.notes}</>}
                              </span>
                            )}
                          </div>

                          {isActionable && (
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                              {/* Administered is the routine action, so it takes the
                                  full first row on phones; exceptions share the next. */}
                              <Button
                                size="sm"
                                className="h-10 w-full bg-emerald-600 font-sans font-semibold text-white hover:bg-emerald-700 sm:h-9 sm:w-auto"
                                disabled={isSubmitting}
                                onClick={() => logDose(med, dose, 'ADMINISTERED')}
                              >
                                <CheckCircle className="mr-1.5 h-4 w-4" />
                                Given
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 flex-1 border-destructive/20 font-sans text-destructive hover:bg-destructive/10 sm:h-9 sm:flex-none"
                                disabled={isSubmitting}
                                onClick={() => openNotesDialog(med, dose, 'REFUSED')}
                              >
                                Refused
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 flex-1 border-amber-500/20 font-sans text-amber-600 hover:bg-amber-500/10 sm:h-9 sm:flex-none"
                                disabled={isSubmitting}
                                onClick={() => openNotesDialog(med, dose, 'HELD')}
                              >
                                Withheld
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Bottom Shift Progress Bar ────────────────────────────────────────── */}
      {summary.total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-4 shadow-lg lg:left-64">
          <div className="mx-auto flex max-w-5xl flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h4 className="font-display text-sm font-semibold text-foreground">
                Dose Checklist Status
              </h4>
              <p className="font-sans text-xs text-muted-foreground">
                <span className="font-tnum font-semibold text-foreground">{summary.administered}</span>{' '}
                of <span className="font-tnum font-semibold text-foreground">{summary.total}</span>{' '}
                doses given
                {summary.due > 0 && (
                  <> &middot; <span className="font-semibold text-primary">{summary.due} due now</span></>
                )}
                {summary.missed > 0 && (
                  <> &middot; <span className="font-semibold text-destructive">{summary.missed} overdue</span></>
                )}
              </p>
            </div>
            <div className="w-full md:w-80">
              <Progress value={progressPercent} className="h-2 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog for Withholding or Refusing a dose ────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Document Medication {pendingAction?.status === 'REFUSED' ? 'Refusal' : 'Withhold'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {pendingAction && (
                <>
                  {pendingAction.medication.drugName} &middot;{' '}
                  {formatTime(pendingAction.dose.scheduledTime)} dose. This documentation is saved in
                  the patient&apos;s electronic MAR history.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Clinical Notes / Reason
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  pendingAction?.status === 'REFUSED'
                    ? 'e.g. Patient refused stating nausea...'
                    : 'e.g. Held Metoprolol because systolic BP is 92 mmHg...'
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="min-h-24 bg-background"
              />
              {!actionNotes.trim() && (
                <p className="text-xs text-muted-foreground">
                  A reason is required to record a refused or withheld dose.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={isSubmitting || !actionNotes.trim()}
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
