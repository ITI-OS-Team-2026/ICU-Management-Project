import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileDown, Loader2, FileText, AlertCircle, Sparkles, Stethoscope } from 'lucide-react';
import { ConsultationSummaryPDF } from './ConsultationSummaryPDF';

export function ExportConsultationModal({
  open,
  onOpenChange,
  summary,
  patient,
  admission,
  authorName,
}) {
  const [consultNote, setConsultNote] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const summaryDate = summary?.generatedAt || summary?.generated_at;
  const formattedDate = summaryDate
    ? new Date(summaryDate).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const doc = (
        <ConsultationSummaryPDF
          summary={summary}
          patient={patient}
          admission={admission}
          consultNote={consultNote}
          authorName={authorName}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safePatientName = (patient?.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `ICU_Consultation_${safePatientName}_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (err) {
      console.error('Failed to generate consultation PDF:', err);
      setExportError(err?.message || 'Failed to build PDF document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isExporting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Stethoscope className="h-4 w-4" />
            </div>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Export Consultation Summary PDF
            </DialogTitle>
          </div>
          <DialogDescription className="font-sans text-xs text-muted-foreground pt-1 leading-relaxed">
            Generate a physician-grade clinical consultation report with SmartCare ICU hospital letterhead, patient telemetry, and AI synthesis for external medical consultation.
          </DialogDescription>
        </DialogHeader>

        {exportError && (
          <Alert variant="destructive" className="py-2 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertTitle className="font-bold text-xs">Export Failed</AlertTitle>
            <AlertDescription className="text-xs">{exportError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-1">
          {/* Patient Context Card */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs font-sans">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Patient:</span>
              <span className="font-sans font-medium text-foreground">{patient?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Age / Gender:</span>
              <span className="font-sans text-muted-foreground">
                {patient?.age ? `${patient.age} Y` : '—'} · {patient?.gender || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Location:</span>
              <span className="font-sans text-muted-foreground">
                {admission?.bed?.bed_number ? `Bed ${admission.bed.bed_number}` : 'ICU Bed Unit'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Summary Timestamp:</span>
              <span className="font-tnum text-muted-foreground">{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Attending Specialist:</span>
              <Badge variant="secondary" className="text-[10px] font-sans">
                {authorName || 'ICU Specialist'}
              </Badge>
            </div>
          </div>

          {/* Optional Specialist Consultation Note */}
          <div className="space-y-1.5">
            <Label htmlFor="consult-note" className="font-sans text-xs font-semibold text-foreground">
              External Consultation Note / Specific Clinical Question (Optional)
            </Label>
            <Textarea
              id="consult-note"
              placeholder="e.g. Requesting second opinion regarding refractory septic shock management, vasopressor escalation, and acute kidney injury weaning..."
              value={consultNote}
              onChange={(e) => setConsultNote(e.target.value)}
              rows={3}
              className="font-sans text-xs bg-background resize-none"
              disabled={isExporting}
            />
            <p className="font-sans text-[11px] text-muted-foreground">
              This note will appear prominently at the top of the consultation PDF letterhead.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="font-sans text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="font-sans text-xs font-semibold gap-1.5"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                Download Consultation PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
