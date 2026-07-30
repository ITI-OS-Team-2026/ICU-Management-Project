import { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  Check,
  X,
  Trash2,
  CircleDashed,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { treatmentApprovalsService } from '../../services/treatmentApprovalsService';
import { useAuthStore } from '../../store/authStore';

/* ================================================================
   Helpers
   ================================================================ */
function formatDate(value) {
  if (!value) return '—';
  try { return format(new Date(value), 'MMM d, yyyy · HH:mm'); } catch { return '—'; }
}

function getInitials(firstName, lastName) {
  return [(firstName?.[0] || ''), (lastName?.[0] || '')].join('').toUpperCase() || '??';
}

function getRoleLabel(role) {
  switch (role) {
    case 'ICU_SPECIALIST':   return 'ICU Specialist';
    case 'MEDICAL_RESIDENT': return 'Medical Resident';
    case 'ICU_NURSE':        return 'ICU Nurse';
    default:                 return role ?? 'Unknown';
  }
}

function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown';
}

// approvalStatus is a tri-state: null = pending, true = approved, false = rejected.
function getDecision(approval) {
  if (approval.approvalStatus === null || approval.approvalStatus === undefined) return 'PENDING';
  return approval.approvalStatus ? 'APPROVED' : 'REJECTED';
}

const STATUS_META = {
  PENDING:  { label: 'Pending',  color: '#d97706', icon: Clock },
  APPROVED: { label: 'Approved', color: '#16a34a', icon: Check },
  REJECTED: { label: 'Rejected', color: '#dc2626', icon: X },
};

const EXECUTION_META = {
  NOT_STARTED: { label: 'Not started', color: '#64748b', icon: CircleDashed },
  IN_PROGRESS: { label: 'In progress', color: '#0891b2', icon: PlayCircle },
  COMPLETED:   { label: 'Completed',   color: '#16a34a', icon: CheckCircle2 },
};

const FILTERS = [
  { key: 'ALL',      label: 'All' },
  { key: 'PENDING',  label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

/* ================================================================
   Status badge
   ================================================================ */
function StatusBadge({ decision }) {
  const meta = STATUS_META[decision];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
      style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

/* ================================================================
   Approval card
   ================================================================ */
/* ================================================================
   Execution strip — bedside record on an approved treatment
   ================================================================ */
function ExecutionStrip({ approval, canExecute, onExecute, isBusy }) {
  const status = approval.executionStatus || 'NOT_STARTED';
  const meta   = EXECUTION_META[status];
  const Icon   = meta.icon;

  return (
    <div className="border-t border-border bg-background px-4 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Execution
          </span>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
          >
            <Icon size={11} />
            {meta.label}
          </span>
        </div>

        {canExecute && status !== 'COMPLETED' && (
          <div className="flex items-center gap-2">
            {status === 'NOT_STARTED' && (
              <Button
                size="sm" variant="outline"
                className="gap-1.5 font-sans text-xs"
                disabled={isBusy}
                onClick={() => onExecute(approval, 'IN_PROGRESS')}
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
                Start Treatment
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 font-sans text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isBusy}
              onClick={() => onExecute(approval, 'COMPLETED')}
            >
              {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Mark Completed
            </Button>
          </div>
        )}
      </div>

      {(approval.startedAt || approval.completedAt) && (
        <p className="font-sans text-[11px] text-muted-foreground">
          {approval.startedAt && <>Started by {fullName(approval.starter)} · {formatDate(approval.startedAt)}</>}
          {approval.startedAt && approval.completedAt && ' — '}
          {approval.completedAt && <>Completed by {fullName(approval.completer)} · {formatDate(approval.completedAt)}</>}
        </p>
      )}

      {approval.executionNotes?.trim() && (
        <p className="font-sans text-xs text-foreground leading-relaxed whitespace-pre-wrap border-l-[3px] border-cyan-500/40 pl-3">
          {approval.executionNotes}
        </p>
      )}
    </div>
  );
}

function ApprovalCard({ approval, canDecide, canWithdraw, canExecute, onDecide, onWithdraw, onExecute, busyId }) {
  const decision = getDecision(approval);
  const isBusy   = busyId === approval.id;
  const initials = getInitials(approval.requester?.firstName, approval.requester?.lastName);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-sans text-sm font-bold text-foreground leading-tight break-words">
              {approval.treatmentName}
            </p>
            <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
              Requested by {fullName(approval.requester)} · {getRoleLabel(approval.requester?.role)} · {formatDate(approval.requestedAt)}
            </p>
          </div>
        </div>
        <StatusBadge decision={decision} />
      </div>

      {/* Justification */}
      <div className="px-4 pb-3 pl-[4rem]">
        {approval.clinicalJustification?.trim() ? (
          <div className="border-l-[3px] border-primary/40 pl-3 py-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Clinical justification
            </span>
            <p className="font-sans text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {approval.clinicalJustification}
            </p>
          </div>
        ) : (
          <p className="font-sans text-sm text-muted-foreground italic">No clinical justification provided.</p>
        )}
      </div>

      {/* Footer — decision record or action buttons */}
      {decision !== 'PENDING' ? (
        <>
          <div className="border-t border-border bg-muted/30 px-4 py-2 pl-[4rem]">
            <p className="font-sans text-[11px] text-muted-foreground">
              {decision === 'APPROVED' ? 'Approved' : 'Rejected'} by {fullName(approval.approver)} · {formatDate(approval.approvedAt)}
            </p>
          </div>
          {decision === 'APPROVED' && (
            <ExecutionStrip
              approval={approval}
              canExecute={canExecute}
              onExecute={onExecute}
              isBusy={isBusy}
            />
          )}
        </>
      ) : (canDecide || canWithdraw) ? (
        <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex items-center justify-end gap-2">
          {canWithdraw && (
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 font-sans text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={isBusy}
              onClick={() => onWithdraw(approval.id)}
            >
              <Trash2 size={13} /> Withdraw
            </Button>
          )}
          {canDecide && (
            <>
              <Button
                variant="outline" size="sm"
                className="gap-1.5 font-sans text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isBusy}
                onClick={() => onDecide(approval.id, false)}
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Reject
              </Button>
              <Button
                size="sm"
                className="gap-1.5 font-sans text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isBusy}
                onClick={() => onDecide(approval.id, true)}
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================
   Skeleton
   ================================================================ */
function ApprovalSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Request dialog
   ================================================================ */
function NewApprovalDialog({ open, onClose, onSave, isSaving }) {
  const [treatmentName, setTreatmentName] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setTreatmentName(''); setJustification(''); setError('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (treatmentName.trim().length < 2) {
      setError('Please enter the treatment name.');
      return;
    }
    setError('');
    onSave({ treatmentName: treatmentName.trim(), clinicalJustification: justification.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            Request Treatment Approval
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Treatment name
            </Label>
            <Input
              placeholder="e.g. Extracorporeal membrane oxygenation"
              value={treatmentName}
              onChange={e => setTreatmentName(e.target.value)}
              maxLength={255}
              className="text-sm font-sans bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Clinical justification
            </Label>
            <Textarea
              placeholder="Why this treatment is indicated for this patient…"
              value={justification}
              onChange={e => setJustification(e.target.value)}
              maxLength={5000}
              className="min-h-[110px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle size={14} />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[140px] gap-1.5">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {isSaving ? 'Sending…' : 'Send Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   Execution dialog — nurse confirms and adds bedside notes
   ================================================================ */
function ExecutionDialog({ request, onClose, onConfirm, isSaving }) {
  const [notes, setNotes] = useState('');

  useEffect(() => { setNotes(request?.approval?.executionNotes || ''); }, [request]);

  if (!request) return null;

  const starting = request.status === 'IN_PROGRESS';

  const handleClose = () => { setNotes(''); onClose(); };

  return (
    <Dialog open={Boolean(request)} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            {starting
              ? <PlayCircle size={18} className="text-cyan-600" />
              : <CheckCircle2 size={18} className="text-emerald-600" />}
            {starting ? 'Start Treatment' : 'Mark Treatment Completed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="font-sans text-sm font-semibold text-foreground">{request.approval.treatmentName}</p>
            <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
              Approved by {fullName(request.approval.approver)} · {formatDate(request.approval.approvedAt)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Bedside notes (optional)
            </Label>
            <Textarea
              placeholder={starting
                ? 'Setup, access, initial settings…'
                : 'How the patient tolerated it, duration, complications…'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={5000}
              className="min-h-[100px] text-sm font-sans bg-background resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              className={`min-w-[150px] gap-1.5 ${starting ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              onClick={() => onConfirm(notes)}
            >
              {isSaving
                ? <Loader2 size={14} className="animate-spin" />
                : starting ? <PlayCircle size={14} /> : <CheckCircle2 size={14} />}
              {isSaving ? 'Saving…' : starting ? 'Start Treatment' : 'Mark Completed'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   Main page
   ================================================================ */
export default function PatientTreatmentApprovalsPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((s) => s.user);

  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('ALL');
  const [showNew,   setShowNew]   = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [busyId,    setBusyId]    = useState(null);
  const [actionError, setActionError] = useState(null);

  const [execRequest, setExecRequest] = useState(null); // { approval, status }

  const canRequest = user?.role === 'ICU_SPECIALIST' || user?.role === 'MEDICAL_RESIDENT';
  const canDecide  = user?.role === 'ICU_SPECIALIST';
  const canExecute = user?.role === 'ICU_NURSE';

  const fetchApprovals = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      setApprovals(await treatmentApprovalsService.getApprovals(admission.id));
    } catch (err) {
      console.error('Failed to fetch treatment approvals:', err);
      setError('Failed to load treatment approvals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission?.id]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const counts = useMemo(() => approvals.reduce((acc, a) => {
    acc[getDecision(a)] += 1;
    return acc;
  }, { PENDING: 0, APPROVED: 0, REJECTED: 0 }), [approvals]);

  const visible = useMemo(
    () => (filter === 'ALL' ? approvals : approvals.filter(a => getDecision(a) === filter)),
    [approvals, filter]
  );

  const handleSave = async (payload) => {
    try {
      setIsSaving(true);
      setActionError(null);
      const created = await treatmentApprovalsService.requestApproval(admission.id, payload);
      setApprovals(prev => [created, ...prev]);
      setShowNew(false);
    } catch (err) {
      console.error('Failed to request treatment approval:', err);
      setActionError(err?.response?.data?.message || 'Failed to send the approval request.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecide = async (id, approved) => {
    if (busyId) return;
    try {
      setBusyId(id);
      setActionError(null);
      const updated = await treatmentApprovalsService.decideApproval(id, approved);
      setApprovals(prev => prev.map(a => (a.id === id ? updated : a)));
    } catch (err) {
      console.error('Failed to record decision:', err);
      setActionError(err?.response?.data?.message || 'Failed to record the decision.');
      await fetchApprovals();
    } finally {
      setBusyId(null);
    }
  };

  const handleExecuteConfirm = async (notes) => {
    const { approval, status } = execRequest;
    try {
      setBusyId(approval.id);
      setActionError(null);
      const updated = await treatmentApprovalsService.executeApproval(approval.id, status, notes);
      setApprovals(prev => prev.map(a => (a.id === approval.id ? updated : a)));
      setExecRequest(null);
    } catch (err) {
      console.error('Failed to record execution:', err);
      setActionError(err?.response?.data?.message || 'Failed to record the treatment execution.');
      setExecRequest(null);
      await fetchApprovals();
    } finally {
      setBusyId(null);
    }
  };

  const handleWithdraw = async (id) => {
    if (busyId) return;
    if (!window.confirm('Withdraw this treatment approval request?')) return;
    try {
      setBusyId(id);
      setActionError(null);
      await treatmentApprovalsService.withdrawApproval(id);
      setApprovals(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to withdraw request:', err);
      setActionError(err?.response?.data?.message || 'Failed to withdraw the request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Treatment Approvals</h2>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            {approvals.length > 0
              ? `${counts.PENDING} pending · ${counts.APPROVED} approved · ${counts.REJECTED} rejected`
              : 'No treatment approvals requested yet'}
          </p>
        </div>
        {canRequest && (
          <Button size="sm" className="gap-1.5 font-sans text-xs" onClick={() => setShowNew(true)}>
            <Plus size={14} />
            Request Approval
          </Button>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      {approvals.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => {
            const count  = f.key === 'ALL' ? approvals.length : counts[f.key];
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full font-sans text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {actionError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle size={14} />
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* ── Content ────────────────────────────────────────────────── */}
      {isLoading ? (
        <ApprovalSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
          <p className="font-sans text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchApprovals}>Try Again</Button>
        </div>
      ) : approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground/50">
            <ShieldCheck size={26} />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">No treatment approvals yet</p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {canRequest
                ? 'Request specialist sign-off before starting a high-risk treatment.'
                : 'No treatment approvals have been requested for this patient.'}
            </p>
          </div>
          {canRequest && (
            <Button size="sm" className="gap-1.5 font-sans text-xs mt-1" onClick={() => setShowNew(true)}>
              <Plus size={13} /> Request Approval
            </Button>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-14 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <p className="font-sans text-sm text-muted-foreground">
            No {STATUS_META[filter]?.label.toLowerCase()} approvals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              canDecide={canDecide}
              canWithdraw={approval.requestedBy === user?.id}
              canExecute={canExecute}
              onDecide={handleDecide}
              onWithdraw={handleWithdraw}
              onExecute={(a, status) => setExecRequest({ approval: a, status })}
              busyId={busyId}
            />
          ))}
        </div>
      )}

      {/* ── Dialog ─────────────────────────────────────────────────── */}
      <NewApprovalDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ExecutionDialog
        request={execRequest}
        onClose={() => setExecRequest(null)}
        onConfirm={handleExecuteConfirm}
        isSaving={Boolean(busyId)}
      />
    </div>
  );
}
