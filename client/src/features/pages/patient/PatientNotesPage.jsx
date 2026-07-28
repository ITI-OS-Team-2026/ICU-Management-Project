import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  StickyNote,
  Plus,
  Stethoscope,
  HeartPulse,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { patientsService } from '../../services/patientsService';
import { useAuthStore } from '../../store/authStore';

/* ================================================================
   Helpers
   ================================================================ */

function formatNoteDate(value) {
  if (!value) return '—';
  try {
    return format(new Date(value), "MMM d · HH:mm");
  } catch {
    return '—';
  }
}

function getInitials(firstName, lastName) {
  return [(firstName?.[0] || ''), (lastName?.[0] || '')].join('').toUpperCase() || '??';
}

function getRoleLabel(role) {
  switch (role) {
    case 'ICU_SPECIALIST':   return 'ICU Specialist';
    case 'MEDICAL_RESIDENT': return 'Medical Resident';
    case 'ICU_NURSE':        return 'ICU Nurse';
    default:                  return role?.replace(/_/g, ' ') || 'Staff';
  }
}

function getAvatarColor(role) {
  switch (role) {
    case 'ICU_SPECIALIST':   return 'bg-primary text-primary-foreground';
    case 'MEDICAL_RESIDENT': return 'bg-violet-500 text-white';
    case 'ICU_NURSE':        return 'bg-emerald-500 text-white';
    default:                  return 'bg-muted text-muted-foreground';
  }
}

/* ================================================================
   SOAP Section — renders a single SOAP segment with colored border + badge
   Uses inline styles to guarantee Tailwind doesn't purge the colors.
   ================================================================ */
const SOAP_META = {
  S: { label: 'Subjective', color: '#7c3aed' },   // violet-600
  O: { label: 'Objective',  color: '#0891b2' },   // cyan-600
  A: { label: 'Assessment', color: '#ea580c' },   // orange-600
  P: { label: 'Plan',       color: '#16a34a' },   // green-600
};

function SOAPSection({ letter, content }) {
  const meta = SOAP_META[letter];
  if (!meta || !content) return null;

  // Hex color → rgba background at 12% opacity
  const bgColor = `${meta.color}1f`;

  return (
    <div
      className="border-l-[3px] pl-3 py-1"
      style={{ borderLeftColor: meta.color }}
    >
      {/* Colored pill badge */}
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
   Parse SOAP from a clinical note's content string.
   Supports two formats:
     1. Structured: lines starting with "[S]", "[O]", "[A]", "[P]"
     2. Freeform: render as plain text
   ================================================================ */
function parseSoap(content) {
  if (!content) return null;
  // Try structured format: each segment on its own line prefixed by [S], [O], [A], [P]
  const regex = /\[([SOAP])\]\s*([\s\S]*?)(?=\n?\[([SOAP])\]|$)/gi;
  const matches = [...content.matchAll(regex)];
  if (matches.length >= 2) {
    const result = {};
    for (const m of matches) {
      result[m[1].toUpperCase()] = m[2].trim();
    }
    return result;
  }
  // Fallback: freeform plain text
  return { _plain: content };
}

/* ================================================================
   Clinical Note Card
   ================================================================ */
function ClinicalNoteCard({ note, canDelete, onDelete }) {
  const authorName = [note.author?.firstName, note.author?.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initials    = getInitials(note.author?.firstName, note.author?.lastName);
  const roleLabel   = getRoleLabel(note.author?.role);
  const avatarColor = getAvatarColor(note.author?.role);
  const soap        = parseSoap(note.content);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ─ Header row ─ */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-sm font-bold text-foreground leading-tight truncate">{authorName}</span>
            <span className="font-sans text-[11px] text-muted-foreground leading-snug">{roleLabel} · {formatNoteDate(note.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-sans text-xs font-semibold text-primary">Progress Note</span>
          {canDelete && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* ─ Content ─ */}
      <div className="px-4 pb-4 pt-2 space-y-2.5">
        {soap?._plain ? (
          <p className="font-sans text-sm text-foreground leading-relaxed whitespace-pre-wrap">{soap._plain}</p>
        ) : (
          <>
            <SOAPSection letter="S" content={soap?.S} />
            <SOAPSection letter="O" content={soap?.O} />
            <SOAPSection letter="A" content={soap?.A} />
            <SOAPSection letter="P" content={soap?.P} />
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Nursing Note Card
   ================================================================ */
function NursingNoteCard({ note, canDelete, onDelete }) {
  const authorName  = [note.author?.firstName, note.author?.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initials    = getInitials(note.author?.firstName, note.author?.lastName);
  const avatarColor = getAvatarColor(note.author?.role);

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm overflow-hidden">
      {/* ─ Header row ─ */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-sm font-bold text-foreground leading-tight truncate">{authorName}</span>
            <span className="font-sans text-[11px] text-muted-foreground leading-snug">ICU Nurse · {formatNoteDate(note.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-sans text-xs font-semibold text-emerald-600 dark:text-emerald-400">Nursing Note</span>
          {canDelete && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* ─ Content ─ */}
      <div className="px-4 pb-4 pt-1">
        <p className="font-sans text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.note}</p>
      </div>
    </div>
  );
}

/* ================================================================
   New Clinical Note Dialog (SOAP)
   ================================================================ */
function NewClinicalNoteDialog({ open, onClose, onSave, isSaving }) {
  const [subjective,  setSubjective]  = useState('');
  const [objective,   setObjective]   = useState('');
  const [assessment,  setAssessment]  = useState('');
  const [plan,        setPlan]        = useState('');
  const [error,       setError]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjective.trim() && !objective.trim() && !assessment.trim() && !plan.trim()) {
      setError('Please fill in at least one SOAP field.');
      return;
    }
    setError('');
    // Serialize into structured format parseable by parseSoap()
    const parts = [];
    if (subjective.trim())  parts.push(`[S] ${subjective.trim()}`);
    if (objective.trim())   parts.push(`[O] ${objective.trim()}`);
    if (assessment.trim())  parts.push(`[A] ${assessment.trim()}`);
    if (plan.trim())        parts.push(`[P] ${plan.trim()}`);
    onSave(parts.join('\n'));
  };

  const handleClose = () => {
    setSubjective(''); setObjective(''); setAssessment(''); setPlan(''); setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Stethoscope size={18} className="text-primary" />
            New Progress Note (SOAP)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Subjective */}
          <div className="space-y-1.5">
            <Label htmlFor="cn-subjective" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.S.color }}>
              S — Subjective
            </Label>
            <Textarea
              id="cn-subjective"
              placeholder="Patient's complaints, symptoms, history as reported…"
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {/* Objective */}
          <div className="space-y-1.5">
            <Label htmlFor="cn-objective" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.O.color }}>
              O — Objective
            </Label>
            <Textarea
              id="cn-objective"
              placeholder="Vitals, lab results, examination findings…"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {/* Assessment */}
          <div className="space-y-1.5">
            <Label htmlFor="cn-assessment" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.A.color }}>
              A — Assessment
            </Label>
            <Textarea
              id="cn-assessment"
              placeholder="Diagnosis, clinical impression…"
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <Label htmlFor="cn-plan" className="text-[11px] font-bold uppercase tracking-widest" style={{ color: SOAP_META.P.color }}>
              P — Plan
            </Label>
            <Textarea
              id="cn-plan"
              placeholder="Treatment plan, orders, follow-up…"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="min-h-[70px] text-sm font-sans bg-background resize-none"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle size={14} />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[120px]">
              {isSaving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              {isSaving ? 'Saving…' : 'Save Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



/* ================================================================
   Loading Skeleton
   ================================================================ */
function NotesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="space-y-2 pl-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Main Page Component
   ================================================================ */
export default function PatientNotesPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((s) => s.user);

  const [clinicalNotes,  setClinicalNotes]  = useState([]);
  const [nursingNotes,   setNursingNotes]   = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState(null);

  const [showNewClinical, setShowNewClinical] = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);

  const navigate = useNavigate();
  const isSpecialistOrResident = user?.role === 'ICU_SPECIALIST' || user?.role === 'MEDICAL_RESIDENT';
  const isNurse                = user?.role === 'ICU_NURSE';

  const fetchNotes = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [clinical, nursing] = await Promise.all([
        patientsService.getClinicalNotes(admission.id),
        patientsService.getNursingNotes(admission.id),
      ]);
      setClinicalNotes(clinical);
      setNursingNotes(nursing);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Failed to load notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission?.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  /* ── Create clinical note ──────────────────────────────────────────────── */
  const handleSaveClinical = async (content) => {
    try {
      setIsSaving(true);
      await patientsService.createClinicalNote(admission.id, content);
      setShowNewClinical(false);
      await fetchNotes();
    } catch (err) {
      console.error('Failed to save clinical note:', err);
    } finally {
      setIsSaving(false);
    }
  };



  /* ── Delete note ───────────────────────────────────────────────────────── */
  const handleDeleteClinical = async (noteId) => {
    if (!window.confirm('Delete this clinical note?')) return;
    try {
      await patientsService.deleteClinicalNote(noteId);
      await fetchNotes();
    } catch (err) {
      console.error('Failed to delete clinical note:', err);
    }
  };

  const handleDeleteNursing = async (noteId) => {
    if (!window.confirm('Delete this nursing note?')) return;
    try {
      await patientsService.deleteNursingNote(noteId);
      await fetchNotes();
    } catch (err) {
      console.error('Failed to delete nursing note:', err);
    }
  };

  /* ── Merge & sort all notes chronologically (newest first) ────────────── */
  const allNotes = [
    ...clinicalNotes.map((n) => ({ ...n, _type: 'clinical' })),
    ...nursingNotes.map((n) => ({ ...n, _type: 'nursing' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <StickyNote className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Clinical Notes
            </h1>
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              Progress notes and nursing observations for this admission.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigate to full Nursing Notes page (where nurses create notes and doctors view them) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/nursing-notes?admissionId=${admission?.id}`)}
            className="font-sans text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <ClipboardList size={14} />
            {isNurse ? 'New Nursing Note' : 'Nursing Notes'}
            <ExternalLink size={11} className="opacity-60" />
          </Button>
          {/* New Note button — visible to specialists/residents */}
          {isSpecialistOrResident && (
            <Button
              size="sm"
              onClick={() => setShowNewClinical(true)}
              className="font-sans text-xs gap-1.5"
            >
              <Plus size={14} />
              New Note
            </Button>
          )}
        </div>
      </div>

      {/* ── Notes Feed ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <NotesSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
          <p className="font-sans text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchNotes}>Try Again</Button>
        </div>
      ) : allNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">No notes yet</p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {isSpecialistOrResident
                ? 'Create the first progress note using the button above.'
                : isNurse
                  ? 'Add a nursing note using the button above.'
                  : 'Notes will appear here once added by care team members.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {allNotes.map((note) =>
            note._type === 'clinical' ? (
              <ClinicalNoteCard
                key={`c-${note.id}`}
                note={note}
                canDelete={isSpecialistOrResident}
                onDelete={handleDeleteClinical}
              />
            ) : (
              <NursingNoteCard
                key={`n-${note.id}`}
                note={note}
                canDelete={isSpecialistOrResident}
                onDelete={handleDeleteNursing}
              />
            )
          )}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <NewClinicalNoteDialog
        open={showNewClinical}
        onClose={() => setShowNewClinical(false)}
        onSave={handleSaveClinical}
        isSaving={isSaving}
      />
    </div>
  );
}
