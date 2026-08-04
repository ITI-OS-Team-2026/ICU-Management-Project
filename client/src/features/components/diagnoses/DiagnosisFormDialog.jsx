import { useState } from 'react';
import { AlertTriangle, Loader2, Stethoscope } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COMMON_DIAGNOSES,
  DIAGNOSIS_STATUSES,
  DIAGNOSIS_TYPES,
  INITIAL_STATUSES,
  diagnosesService,
} from '../../services/diagnosesService';

const EMPTY = {
  condition_name: '',
  type: 'SECONDARY',
  status: 'SUSPECTED',
  clinical_notes: '',
  onset_date: '',
};

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Record a new diagnosis or amend an existing one.
 *
 * Status is deliberately absent when amending: moving through the differential
 * demands a clinical reason, so it goes through the status dialog instead.
 * Amending is append-only server-side and returns a new id, so the caller must
 * refetch rather than patch its local copy.
 */
export default function DiagnosisFormDialog({
  open,
  onOpenChange,
  admissionId,
  diagnosis = null,
  onSaved,
}) {
  const isEdit = Boolean(diagnosis);

  // Seeded once per mount; the caller remounts the dialog on every open.
  const [values, setValues] = useState(() =>
    diagnosis
      ? {
          condition_name: diagnosis.conditionName || '',
          type: diagnosis.type || 'SECONDARY',
          status: diagnosis.status || 'SUSPECTED',
          clinical_notes: diagnosis.clinicalNotes || '',
          onset_date: toLocalInput(diagnosis.onsetDate),
        }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const applySuggestion = (name) => {
    setValues((prev) => ({ ...prev, condition_name: name }));
    setErrors({});
  };

  const validate = () => {
    const next = {};
    if (!values.condition_name.trim()) next.condition_name = 'Condition name is required.';
    if (values.onset_date && new Date(values.onset_date) > new Date()) {
      next.onset_date = 'Onset cannot be in the future.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');
    try {
      const payload = {
        condition_name: values.condition_name.trim(),
        type: values.type,
      };
      if (values.clinical_notes.trim()) payload.clinical_notes = values.clinical_notes.trim();
      if (values.onset_date) payload.onset_date = new Date(values.onset_date).toISOString();
      // Status is only settable at creation.
      if (!isEdit) payload.status = values.status;

      const saved = isEdit
        ? await diagnosesService.update(diagnosis.id, payload)
        : await diagnosesService.create(admissionId, payload);

      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save the diagnosis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const query = values.condition_name.trim().toLowerCase();
  const suggestions =
    query.length >= 2 && !COMMON_DIAGNOSES.some((name) => name.toLowerCase() === query)
      ? COMMON_DIAGNOSES.filter((name) => name.toLowerCase().includes(query)).slice(0, 6)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Stethoscope className="h-5 w-5 text-primary" />
            {isEdit ? 'Amend diagnosis' : 'Record diagnosis'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? 'Amending archives the current entry and issues a replacement. To confirm, rule out or resolve, use the status actions instead.'
              : 'The diagnosis appears on the problem list and the assigned nurses are notified.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="condition_name">
              Condition <span className="text-destructive">*</span>
            </Label>
            <Input
              id="condition_name"
              placeholder="e.g. Community-acquired pneumonia"
              autoComplete="off"
              value={values.condition_name}
              onChange={(e) => setField('condition_name', e.target.value)}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applySuggestion(name)}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 font-sans text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {errors.condition_name && (
              <p className="text-xs text-destructive">{errors.condition_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Classification <span className="text-destructive">*</span>
            </Label>
            <Select value={values.type} onValueChange={(v) => setField('type', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGNOSIS_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {values.type === 'PRIMARY' && (
              <p className="text-xs text-muted-foreground">
                Any existing primary diagnosis becomes secondary.
              </p>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Certainty <span className="text-destructive">*</span>
              </Label>
              <Select value={values.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INITIAL_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DIAGNOSIS_STATUSES[value].label} — {DIAGNOSIS_STATUSES[value].description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Suspected entries stay in the differential until confirmed or ruled out.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="onset_date">Onset</Label>
            <Input
              id="onset_date"
              type="datetime-local"
              value={values.onset_date}
              onChange={(e) => setField('onset_date', e.target.value)}
            />
            {errors.onset_date ? (
              <p className="text-xs text-destructive">{errors.onset_date}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                When the condition began, if it differs from now.
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="clinical_notes">Clinical reasoning</Label>
            <Textarea
              id="clinical_notes"
              placeholder="What supports this diagnosis? What else is still in the differential?"
              value={values.clinical_notes}
              onChange={(e) => setField('clinical_notes', e.target.value)}
              className="min-h-24"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save amendment' : 'Record diagnosis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
