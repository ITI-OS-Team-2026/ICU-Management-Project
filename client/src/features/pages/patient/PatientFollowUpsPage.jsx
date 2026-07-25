import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  User,
  Stethoscope,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
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

/* ================================================================
   SOAP Section pill badge (reused from Notes page pattern)
   ================================================================ */
const SOAP_META = {
  S: { label: 'Subjective', color: '#7c3aed' },
  O: { label: 'Objective',  color: '#0891b2' },
  A: { label: 'Assessment', color: '#ea580c' },
  P: { label: 'Plan',       color: '#16a34a' },
};

function SOAPSection({ letter, content }) {
  const meta = SOAP_META[letter];
  if (!meta || !content?.trim()) return null;
  const bgColor = `${meta.color}1f`;
  return (
    <div className="border-l-[3px] pl-3 py-1" style={{ borderLeftColor: meta.color }}>
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1"
        style={{ color: meta.color, backgroundColor: bgColor }}
      >
        {letter} — {meta.label}
      </span>
      <p className="font-sans text-sm text-foreground leading-relaxed">{content}</p>
    </div>
  );
}

/* ================================================================
   Follow-Up Card (timeline item)
   ================================================================ */
function FollowUpCard({ followUp, canDelete, onDelete, isDeleting }) {
  const authorName = [followUp.author?.firstName, followUp.author?.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initials   = getInitials(followUp.author?.firstName, followUp.author?.lastName);
  const roleLabel  = getRoleLabel(followUp.author?.role);

  const hasSOAP = followUp.subjective || followUp.objective || followUp.assessment || followUp.plan;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
          {initials}
        </div>
        <div className="mt-2 w-px flex-1 bg-border min-h-[24px]" />
      </div>

      {/* Card */}
      <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-4">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-3.5 pb-2 gap-3">
          <div>
            <p className="font-sans text-sm font-bold text-foreground leading-tight">{authorName}</p>
            <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
              {roleLabel} · {formatDate(followUp.recordedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-primary bg-primary/10">
              <ClipboardList size={11} />
              Follow-up
            </span>
            {canDelete && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(followUp.id)}
                disabled={isDeleting}
                title="Delete follow-up"
              >
                {isDeleting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
              </Button>
            )}
          </div>
        </div>

        {/* SOAP content */}
        {hasSOAP ? (
          <div className="px-4 pb-4 space-y-2.5">
            <SOAPSection letter="S" content={followUp.subjective} />
            <SOAPSection letter="O" content={followUp.objective} />
            <SOAPSection letter="A" content={followUp.assessment} />
            <SOAPSection letter="P" content={followUp.plan} />
          </div>
        ) : (
          <p className="px-4 pb-4 font-sans text-sm text-muted-foreground italic">No content recorded.</p>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Skeleton
   ================================================================ */
function FollowUpSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   New Follow-Up Dialog
   ================================================================ */
function NewFollowUpDialog({ open, onClose, onSave, isSaving }) {
  const [subjective,  setSubjective]  = useState('');
  const [objective,   setObjective]   = useState('');
  const [assessment,  setAssessment]  = useState('');
  const [plan,        setPlan]        = useState('');
  const [error,       setError]       = useState('');

  const handleClose = () => {
    setSubjective(''); setObjective(''); setAssessment(''); setPlan(''); setError('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjective.trim() && !objective.trim() && !assessment.trim() && !plan.trim()) {
      setError('Please fill in at least one SOAP field.'); return;
    }
    setError('');
    onSave({ subjective, objective, assessment, plan });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            New Follow-Up Note
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Subjective */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.S.color }}>
              S — Subjective
            </Label>
            <Textarea
              placeholder="Patient complaints, symptoms as reported…"
              value={subjective}
              onChange={e => setSubjective(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {/* Objective */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.O.color }}>
              O — Objective
            </Label>
            <Textarea
              placeholder="Vitals, examination findings, lab results…"
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {/* Assessment */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.A.color }}>
              A — Assessment
            </Label>
            <Textarea
              placeholder="Clinical impression, diagnosis…"
              value={assessment}
              onChange={e => setAssessment(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.P.color }}>
              P — Plan
            </Label>
            <Textarea
              placeholder="Treatment plan, orders, next steps…"
              value={plan}
              onChange={e => setPlan(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
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
            <Button type="submit" disabled={isSaving} className="min-w-[130px] gap-1.5">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {isSaving ? 'Saving…' : 'Save Follow-Up'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   Main Page
   ================================================================ */
export default function PatientFollowUpsPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((s) => s.user);

  const [followUps,   setFollowUps]   = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);
  const [showNew,     setShowNew]      = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);

  const canWrite  = user?.role === 'ICU_SPECIALIST' || user?.role === 'MEDICAL_RESIDENT';

  const fetchFollowUps = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get(`/admissions/${admission.id}/follow-ups`);
      setFollowUps(data?.data || data || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
      setError('Failed to load follow-ups. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission?.id]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const handleSave = async ({ subjective, objective, assessment, plan }) => {
    try {
      setIsSaving(true);
      await api.post(`/admissions/${admission.id}/follow-ups`, {
        subjective: subjective || null,
        objective:  objective  || null,
        assessment: assessment || null,
        plan:       plan       || null,
      });
      setShowNew(false);
      await fetchFollowUps();
    } catch (err) {
      console.error('Failed to save follow-up:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (deletingId) return;
    if (!window.confirm('Delete this follow-up? This cannot be undone.')) return;
    try {
      setDeletingId(id);
      await api.delete(`/follow-ups/${id}`);
      setFollowUps(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to delete follow-up:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Follow-Up Notes</h2>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            {followUps.length > 0
              ? `${followUps.length} follow-up${followUps.length !== 1 ? 's' : ''} recorded`
              : 'No follow-ups recorded yet'}
          </p>
        </div>
        {canWrite && (
          <Button size="sm" className="gap-1.5 font-sans text-xs" onClick={() => setShowNew(true)}>
            <Plus size={14} />
            New Follow-Up
          </Button>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <FollowUpSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
          <p className="font-sans text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchFollowUps}>Try Again</Button>
        </div>
      ) : followUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground/50">
            <ClipboardList size={26} />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">No follow-up notes yet</p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {canWrite ? 'Document your clinical assessment and plan.' : 'No follow-ups have been recorded for this patient.'}
            </p>
          </div>
          {canWrite && (
            <Button size="sm" className="gap-1.5 font-sans text-xs mt-1" onClick={() => setShowNew(true)}>
              <Plus size={13} /> New Follow-Up
            </Button>
          )}
        </div>
      ) : (
        <div>
          {followUps.map(fu => (
            <FollowUpCard
              key={fu.id}
              followUp={fu}
              canDelete={canWrite}
              onDelete={handleDelete}
              isDeleting={deletingId === fu.id}
            />
          ))}
          {/* End cap dot */}
          <div className="flex gap-4 items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-border" />
            </div>
            <p className="font-sans text-xs text-muted-foreground">Admission start</p>
          </div>
        </div>
      )}

      {/* ── Dialog ──────────────────────────────────────────────────── */}
      <NewFollowUpDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
