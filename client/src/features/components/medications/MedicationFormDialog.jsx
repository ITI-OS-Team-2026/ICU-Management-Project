import { useState } from 'react';
import { AlertTriangle, Loader2, Pill } from 'lucide-react';

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
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  UNSCHEDULED_FREQUENCIES,
  medicationsService,
} from '../../services/medicationsService';

const EMPTY = {
  drug_name: '',
  dosage: '',
  frequency: '',
  frequency_text: '',
  route: '',
  instructions: '',
  start_date: '',
  end_date: '',
};

// <input type="datetime-local"> wants local wall-clock time with no zone, which
// is also how the ward thinks about dose times.
function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Prescribe a new medication or amend an existing order.
 *
 * Amending is append-only server-side: the old order is archived and a new one
 * is returned, so the caller must refetch rather than patch its local copy.
 */
export default function MedicationFormDialog({
  open,
  onOpenChange,
  admissionId,
  medication = null,
  onSaved,
}) {
  const isEdit = Boolean(medication);

  // Seeded once per mount. The caller remounts the dialog on every open, so
  // there is no effect resetting state on the way in.
  const [values, setValues] = useState(() =>
    medication
      ? {
          drug_name: medication.drugName || '',
          dosage: medication.dosage || '',
          frequency: medication.frequency || '',
          frequency_text: medication.frequencyText || '',
          route: medication.route || '',
          instructions: medication.instructions || '',
          start_date: toLocalInput(medication.startDate),
          end_date: toLocalInput(medication.endDate),
        }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  // Set when the API rejects the order because of a documented allergy — the
  // prescriber must confirm before we re-send with acknowledge_allergy.
  const [allergyWarning, setAllergyWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    // Any edit invalidates a previous acknowledgement — the drug may have changed.
    setAllergyWarning('');
  };

  const validate = () => {
    const next = {};
    if (!values.drug_name.trim()) next.drug_name = 'Drug name is required.';
    if (!values.dosage.trim()) next.dosage = 'Dosage is required.';
    if (!values.frequency) next.frequency = 'Frequency is required.';
    if (!values.route) next.route = 'Route is required.';
    if (values.frequency === 'OTHER' && !values.frequency_text.trim()) {
      next.frequency_text = 'Describe the dosing schedule.';
    }
    if (values.start_date && values.end_date && new Date(values.end_date) < new Date(values.start_date)) {
      next.end_date = 'End date cannot be before the start date.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (acknowledgeAllergy) => {
    const payload = {
      drug_name: values.drug_name.trim(),
      dosage: values.dosage.trim(),
      frequency: values.frequency,
      route: values.route,
    };
    if (values.frequency === 'OTHER') payload.frequency_text = values.frequency_text.trim();
    if (values.instructions.trim()) payload.instructions = values.instructions.trim();
    if (values.start_date) payload.start_date = new Date(values.start_date).toISOString();
    if (values.end_date) payload.end_date = new Date(values.end_date).toISOString();
    if (acknowledgeAllergy) payload.acknowledge_allergy = true;
    return payload;
  };

  const submit = async (acknowledgeAllergy = false) => {
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');
    try {
      const payload = buildPayload(acknowledgeAllergy);
      const saved = isEdit
        ? await medicationsService.update(medication.id, payload)
        : await medicationsService.prescribe(admissionId, payload);

      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Failed to save the medication order.';
      // 409 from the allergy check is a confirmable warning, not a dead end.
      if (status === 409 && /allerg/i.test(message)) {
        setAllergyWarning(message);
      } else {
        setServerError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFrequency = FREQUENCY_OPTIONS.find((f) => f.value === values.frequency);
  const isUnscheduled = UNSCHEDULED_FREQUENCIES.includes(values.frequency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            {isEdit ? 'Amend medication order' : 'Prescribe medication'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? 'Amending archives the current order and issues a replacement. Doses already recorded stay with the original.'
              : 'The order becomes visible on the nurse’s administration record immediately.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {allergyWarning && (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">Allergy conflict</AlertTitle>
            <AlertDescription className="text-sm">
              {allergyWarning}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={() => submit(true)}
                >
                  Prescribe anyway
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAllergyWarning('')}
                >
                  Change the order
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="drug_name">
              Drug name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="drug_name"
              placeholder="e.g. Paracetamol"
              value={values.drug_name}
              onChange={(e) => setField('drug_name', e.target.value)}
            />
            {errors.drug_name && <p className="text-xs text-destructive">{errors.drug_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dosage">
              Dosage <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dosage"
              placeholder="e.g. 500mg"
              value={values.dosage}
              onChange={(e) => setField('dosage', e.target.value)}
            />
            {errors.dosage && <p className="text-xs text-destructive">{errors.dosage}</p>}
          </div>

          <div className="space-y-2">
            <Label>
              Route <span className="text-destructive">*</span>
            </Label>
            <Select value={values.route} onValueChange={(v) => setField('route', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.route && <p className="text-xs text-destructive">{errors.route}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>
              Frequency <span className="text-destructive">*</span>
            </Label>
            <Select value={values.frequency} onValueChange={(v) => setField('frequency', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFrequency && (
              <p className="text-xs text-muted-foreground">
                {isUnscheduled
                  ? 'No fixed dose times — the nurse records each dose as it is given.'
                  : `Due at ${selectedFrequency.doses}.`}
              </p>
            )}
            {errors.frequency && <p className="text-xs text-destructive">{errors.frequency}</p>}
          </div>

          {values.frequency === 'OTHER' && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="frequency_text">
                Describe the schedule <span className="text-destructive">*</span>
              </Label>
              <Input
                id="frequency_text"
                placeholder="e.g. alternate days"
                value={values.frequency_text}
                onChange={(e) => setField('frequency_text', e.target.value)}
              />
              {errors.frequency_text && (
                <p className="text-xs text-destructive">{errors.frequency_text}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start_date">Start</Label>
            <Input
              id="start_date"
              type="datetime-local"
              value={values.start_date}
              onChange={(e) => setField('start_date', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Defaults to now if left empty.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End</Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={values.end_date}
              onChange={(e) => setField('end_date', e.target.value)}
            />
            {errors.end_date ? (
              <p className="text-xs text-destructive">{errors.end_date}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Leave empty for an ongoing order.</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="instructions">Instructions for the nurse</Label>
            <Textarea
              id="instructions"
              placeholder="e.g. Hold if systolic BP < 100 mmHg"
              value={values.instructions}
              onChange={(e) => setField('instructions', e.target.value)}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Shown on every dose in the administration record.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => submit(false)} disabled={isSubmitting || Boolean(allergyWarning)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save amendment' : 'Prescribe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
