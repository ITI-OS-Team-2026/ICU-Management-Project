import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * A confirm dialog whose whole purpose is to capture the written reason for a
 * clinical decision — moving a diagnosis through the differential, raising a
 * nursing concern, or answering one. The reason is never optional; that is the
 * record the ward reads later.
 *
 * The caller remounts this (via `key`) so state resets on every open.
 */
export default function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  confirmVariant = 'default',
  icon: Icon,
  iconClassName = 'text-primary',
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) {
      setError('This is required — it becomes part of the clinical record.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base font-semibold">
            {Icon && <Icon className={`h-5 w-5 ${iconClassName}`} />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reason-dialog-input" className="text-xs font-semibold">
            {label}
          </Label>
          <Textarea
            id="reason-dialog-input"
            placeholder={placeholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            className="min-h-28 bg-background"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={confirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
