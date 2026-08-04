import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  User,
  Activity,
  History,
  HelpCircle,
  XCircle,
  Plus,
  Pencil,
  MessageSquareWarning,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuthStore } from '../../store/authStore';
import {
  ALLOWED_TRANSITIONS,
  DIAGNOSIS_STATUSES,
  TRANSITION_PROMPTS,
  diagnosesService,
} from '../../services/diagnosesService';
import DiagnosisFormDialog from '../../components/diagnoses/DiagnosisFormDialog';
import ReasonDialog from '../../components/diagnoses/ReasonDialog';

const DOCTOR_ROLES = ['MEDICAL_RESIDENT', 'ICU_SPECIALIST'];

const STATUS_META = {
  SUSPECTED: {
    icon: HelpCircle,
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    avatar: 'bg-amber-500/10 text-amber-600',
  },
  CONFIRMED: {
    icon: CheckCircle2,
    badge: 'bg-status-available/10 text-status-available border-status-available/30',
    avatar: 'bg-primary/10 text-primary',
  },
  RULED_OUT: {
    icon: XCircle,
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
    avatar: 'bg-muted text-muted-foreground',
  },
  RESOLVED: {
    icon: History,
    badge: 'bg-muted text-muted-foreground border-border',
    avatar: 'bg-muted text-muted-foreground',
  },
};

const TYPE_LABELS = {
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary',
  COMORBIDITY: 'Comorbidity',
  COMPLICATION: 'Complication',
};

// The differential (what the team is still working on) versus the closed
// record. Splitting on this rather than on a single status keeps suspected and
// confirmed conditions side by side, which is how a ward round reads them.
const OPEN_STATUSES = ['SUSPECTED', 'CONFIRMED'];

function formatDate(value, pattern = 'MMM d, yyyy · h:mm a') {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '—';
  }
}

export default function PatientDiagnosesPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((state) => state.user);

  const isDoctor = DOCTOR_ROLES.includes(user?.role);
  const isNurse = user?.role === 'ICU_NURSE';
  const isEditable = admission?.status === 'ACTIVE';
  const canManage = isDoctor && isEditable;

  const [diagnoses, setDiagnoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'closed'

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // { diagnosis, status } — which transition the reason dialog is capturing
  const [transition, setTransition] = useState(null);
  const [concernFor, setConcernFor] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null); // { concern, outcome }

  const fetchDiagnoses = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await diagnosesService.list(admission.id);
      setDiagnoses(data || []);
    } catch (err) {
      console.error('Failed to fetch diagnoses:', err);
      setError('Failed to load diagnoses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  const openCreate = () => {
    setEditing(null);
    setActionError('');
    setFormOpen(true);
  };

  const openAmend = (diagnosis) => {
    setEditing(diagnosis);
    setActionError('');
    setFormOpen(true);
  };

  const handleTransition = async (reason) => {
    await diagnosesService.changeStatus(transition.diagnosis.id, transition.status, reason);
    await fetchDiagnoses();
  };

  const handleAcknowledge = async (diagnosis) => {
    setActionError('');
    setBusyId(diagnosis.id);
    try {
      await diagnosesService.acknowledge(diagnosis.id);
      await fetchDiagnoses();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to acknowledge the diagnosis.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRaiseConcern = async (note) => {
    await diagnosesService.raiseConcern(concernFor.id, note);
    await fetchDiagnoses();
  };

  const handleRespondToConcern = async (note) => {
    await diagnosesService.respondToConcern(respondingTo.concern.id, respondingTo.outcome, note);
    await fetchDiagnoses();
  };

  const openDiagnoses = diagnoses.filter((d) => OPEN_STATUSES.includes(d.status));
  const closedDiagnoses = diagnoses.filter((d) => !OPEN_STATUSES.includes(d.status));
  const displayed = activeTab === 'open' ? openDiagnoses : closedDiagnoses;

  const openConcernCount = diagnoses.reduce(
    (total, d) => total + (d.concerns || []).filter((c) => c.status === 'OPEN').length,
    0
  );

  const renderSkeleton = () => (
    <div className="space-y-4 mt-6">
      <Skeleton className="h-10 w-[200px]" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border shadow-2xs">
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-6 md:p-8 max-w-5xl mx-auto">{renderSkeleton()}</div>;
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="font-sans font-medium text-foreground">{error}</p>
          <Button variant="outline" onClick={fetchDiagnoses} className="mt-2">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Clinical Diagnoses
          </h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            The working differential and the closed record for this admission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setActiveTab('open')}
              className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
                activeTab === 'open'
                  ? 'bg-card text-foreground shadow-2xs border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Differential ({openDiagnoses.length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
                activeTab === 'closed'
                  ? 'bg-card text-foreground shadow-2xs border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Closed ({closedDiagnoses.length})
            </button>
          </div>

          {canManage && (
            <Button onClick={openCreate} className="font-sans font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Add diagnosis
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isDoctor && openConcernCount > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <MessageSquareWarning className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            {openConcernCount} unanswered nursing {openConcernCount === 1 ? 'concern' : 'concerns'}
          </AlertTitle>
          <AlertDescription>
            A nurse has flagged that a patient&apos;s presentation may not fit a recorded diagnosis.
          </AlertDescription>
        </Alert>
      )}

      {/* ── List ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {displayed.length === 0 ? (
          <Card className="border-border shadow-2xs border-dashed bg-transparent">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-sans font-medium text-foreground">
                {activeTab === 'open' ? 'Nothing in the differential.' : 'Nothing closed yet.'}
              </p>
              <p className="font-sans text-sm text-muted-foreground mt-1">
                {activeTab === 'open'
                  ? 'No suspected or confirmed conditions are recorded for this admission.'
                  : 'No diagnosis has been ruled out or resolved.'}
              </p>
              {canManage && activeTab === 'open' && (
                <Button variant="outline" onClick={openCreate} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Record the first diagnosis
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          displayed.map((diagnosis) => {
            const meta = STATUS_META[diagnosis.status] || STATUS_META.SUSPECTED;
            const StatusIcon = meta.icon;
            const doctorName = diagnosis.diagnosedBy ? `Dr. ${diagnosis.diagnosedBy.lastName}` : 'Unknown';
            const original = diagnosis.originalDiagnosedBy;
            const wasAmended = original && original.id !== diagnosis.diagnosedBy?.id;
            const transitions = ALLOWED_TRANSITIONS[diagnosis.status] || [];
            const acknowledgements = diagnosis.acknowledgements || [];
            const concerns = diagnosis.concerns || [];
            const myAcknowledgement = acknowledgements.find((a) => a.nurseId === user?.id);

            return (
              <Card
                key={diagnosis.id}
                className={`border-border shadow-2xs overflow-hidden transition-all hover:shadow-md ${
                  diagnosis.type === 'PRIMARY' ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <CardContent className="space-y-4 p-5 sm:p-6">

                  {/* Heading row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${meta.avatar}`}>
                        <Stethoscope size={20} />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-sans text-lg font-bold text-foreground leading-tight">
                            {diagnosis.conditionName}
                          </h3>
                          {diagnosis.icdCode && (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                              {diagnosis.icdCode}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`font-sans text-[10px] font-semibold ${
                              diagnosis.type === 'PRIMARY'
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-muted text-muted-foreground'
                            }`}
                          >
                            {TYPE_LABELS[diagnosis.type] || diagnosis.type}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-sans text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="opacity-70" />
                            {diagnosis.onsetDate
                              ? `Onset: ${formatDate(diagnosis.onsetDate, 'MMM d, yyyy')}`
                              : `Recorded: ${formatDate(diagnosis.diagnosedAt, 'MMM d, yyyy')}`}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User size={12} className="opacity-70" />
                            By: {doctorName}
                            {wasAmended && ` (originally Dr. ${original.lastName})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`shrink-0 px-3 py-1 font-sans font-semibold ${meta.badge}`}
                    >
                      <StatusIcon size={14} className="mr-1.5" />
                      {DIAGNOSIS_STATUSES[diagnosis.status]?.label || diagnosis.status}
                    </Badge>
                  </div>

                  {/* Reasoning and outcome */}
                  {diagnosis.clinicalNotes && (
                    <p className="rounded-md border border-border/60 bg-muted/20 p-3 font-sans text-sm text-foreground">
                      {diagnosis.clinicalNotes}
                    </p>
                  )}

                  {diagnosis.status === 'RULED_OUT' && diagnosis.ruledOutReason && (
                    <p className="font-sans text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Ruled out:</span>{' '}
                      {diagnosis.ruledOutReason}
                    </p>
                  )}

                  {diagnosis.status === 'RESOLVED' && diagnosis.resolutionReason && (
                    <p className="font-sans text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Resolved {formatDate(diagnosis.resolvedAt, 'MMM d, yyyy')}:
                      </span>{' '}
                      {diagnosis.resolutionReason}
                    </p>
                  )}

                  {/* Nursing concerns */}
                  {concerns.length > 0 && (
                    <div className="space-y-2">
                      {concerns.map((concern) => (
                        <div
                          key={concern.id}
                          className={`rounded-md border p-3 ${
                            concern.status === 'OPEN'
                              ? 'border-amber-500/40 bg-amber-500/5'
                              : 'border-border bg-muted/20'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <MessageSquareWarning
                                size={14}
                                className={`mt-0.5 shrink-0 ${
                                  concern.status === 'OPEN' ? 'text-amber-600' : 'text-muted-foreground'
                                }`}
                              />
                              <div>
                                <p className="font-sans text-sm text-foreground">{concern.note}</p>
                                <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
                                  {concern.raisedBy
                                    ? `${concern.raisedBy.firstName} ${concern.raisedBy.lastName}, RN`
                                    : 'Nurse'}{' '}
                                  · {formatDate(concern.createdAt, 'MMM d, HH:mm')}
                                </p>
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className={`font-sans text-[10px] font-semibold ${
                                concern.status === 'OPEN'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                  : 'border-border bg-muted text-muted-foreground'
                              }`}
                            >
                              {concern.status}
                            </Badge>
                          </div>

                          {concern.responseNote && (
                            <p className="mt-2 border-t border-border/60 pt-2 font-sans text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                Dr. {concern.respondedBy?.lastName}:
                              </span>{' '}
                              {concern.responseNote}
                            </p>
                          )}

                          {isDoctor && concern.status === 'OPEN' && isEditable && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRespondingTo({ concern, outcome: 'ADDRESSED' })}
                              >
                                Address
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setRespondingTo({ concern, outcome: 'DISMISSED' })}
                                className="text-muted-foreground"
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acknowledgement trail */}
                  {acknowledgements.length > 0 && (
                    <p className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground">
                      <ShieldCheck size={12} className="text-status-available" />
                      Acknowledged by{' '}
                      {acknowledgements
                        .map((a) => `${a.nurse?.firstName} ${a.nurse?.lastName}`)
                        .join(', ')}
                    </p>
                  )}

                  {/* Actions */}
                  {isEditable && (canManage || isNurse) && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                      {canManage && (
                        <>
                          {transitions.map((status) => {
                            const prompt = TRANSITION_PROMPTS[status];
                            return (
                              <Button
                                key={status}
                                size="sm"
                                variant={status === 'RULED_OUT' ? 'outline' : 'default'}
                                className={
                                  status === 'RULED_OUT'
                                    ? 'border-destructive/20 text-destructive hover:bg-destructive/10'
                                    : ''
                                }
                                onClick={() => setTransition({ diagnosis, status })}
                              >
                                {prompt.verb}
                              </Button>
                            );
                          })}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAmend(diagnosis)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Amend
                          </Button>
                        </>
                      )}

                      {isNurse && (
                        <>
                          {myAcknowledgement ? (
                            <span className="flex items-center gap-1.5 font-sans text-xs font-semibold text-status-available">
                              <ShieldCheck size={14} />
                              You acknowledged this
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === diagnosis.id}
                              onClick={() => handleAcknowledge(diagnosis)}
                            >
                              {busyId === diagnosis.id && (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              )}
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConcernFor(diagnosis)}
                            className="text-muted-foreground hover:text-amber-600"
                          >
                            <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" />
                            Raise a concern
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <DiagnosisFormDialog
        key={`${editing?.id || 'new'}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        admissionId={admission?.id}
        diagnosis={editing}
        onSaved={fetchDiagnoses}
      />

      {transition && (
        <ReasonDialog
          key={`transition-${transition.diagnosis.id}-${transition.status}`}
          open
          onOpenChange={(open) => !open && setTransition(null)}
          title={`${TRANSITION_PROMPTS[transition.status].title} — ${transition.diagnosis.conditionName}`}
          description="This becomes part of the permanent record and the assigned nurses are notified."
          label={TRANSITION_PROMPTS[transition.status].label}
          placeholder={TRANSITION_PROMPTS[transition.status].placeholder}
          confirmLabel={TRANSITION_PROMPTS[transition.status].verb}
          confirmVariant={transition.status === 'RULED_OUT' ? 'destructive' : 'default'}
          icon={STATUS_META[transition.status].icon}
          onConfirm={handleTransition}
        />
      )}

      {concernFor && (
        <ReasonDialog
          key={`concern-${concernFor.id}`}
          open
          onOpenChange={(open) => !open && setConcernFor(null)}
          title={`Raise a concern — ${concernFor.conditionName}`}
          description="This goes straight to the attending doctor. Describe what you are observing; you are not changing the diagnosis."
          label="What does not fit?"
          placeholder="e.g. No cough or crackles, afebrile since admission, and the abdomen is tender"
          confirmLabel="Send to doctor"
          icon={MessageSquareWarning}
          iconClassName="text-amber-600"
          onConfirm={handleRaiseConcern}
        />
      )}

      {respondingTo && (
        <ReasonDialog
          key={`respond-${respondingTo.concern.id}-${respondingTo.outcome}`}
          open
          onOpenChange={(open) => !open && setRespondingTo(null)}
          title={respondingTo.outcome === 'ADDRESSED' ? 'Address concern' : 'Dismiss concern'}
          description="The nurse who raised this is notified with your answer."
          label="Your response"
          placeholder={
            respondingTo.outcome === 'ADDRESSED'
              ? 'e.g. Agreed — repeat CXR and blood cultures ordered'
              : 'e.g. Findings are consistent; the fever curve reflects the antibiotic response'
          }
          confirmLabel={respondingTo.outcome === 'ADDRESSED' ? 'Mark addressed' : 'Dismiss'}
          confirmVariant={respondingTo.outcome === 'ADDRESSED' ? 'default' : 'outline'}
          icon={MessageSquareWarning}
          iconClassName="text-amber-600"
          onConfirm={handleRespondToConcern}
        />
      )}
    </div>
  );
}
