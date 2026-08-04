import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Pill,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  History,
  Activity,
  Plus,
  Pencil,
  Ban,
  ChevronDown,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '../../store/authStore';
import { medicationsService, formatFrequency } from '../../services/medicationsService';
import MedicationFormDialog from '../../components/medications/MedicationFormDialog';

const PRESCRIBER_ROLES = ['MEDICAL_RESIDENT', 'ICU_SPECIALIST'];

const ADMIN_STATUS_STYLES = {
  ADMINISTERED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  REFUSED: 'bg-destructive/10 text-destructive border-destructive/30',
  HELD: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  MISSED: 'bg-muted text-muted-foreground border-border',
};

function formatDate(value, pattern = 'MMM d, yyyy · h:mm a') {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '—';
  }
}

/** Confirms a discontinuation and captures the reason the ward will see. */
function DiscontinueDialog({ medication, open, onOpenChange, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) {
      setError('A reason is required — the nurses see it on the ward.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to discontinue the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Ban className="h-5 w-5 text-destructive" />
            Discontinue {medication?.drugName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            The order stops immediately and the assigned nurses are notified. It stays in the
            patient&apos;s record under Discontinued.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="discontinue_reason" className="text-xs font-semibold">
            Reason
          </Label>
          <Textarea
            id="discontinue_reason"
            placeholder="e.g. Course completed / bleeding risk / switched to oral"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            className="min-h-24 bg-background"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Discontinue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientMedicationsPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((state) => state.user);
  const canPrescribe = PRESCRIBER_ROLES.includes(user?.role) && admission?.status === 'ACTIVE';

  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');

  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'discontinued'
  const [expandedId, setExpandedId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [discontinuing, setDiscontinuing] = useState(null);

  const fetchMedications = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await medicationsService.list(admission.id);
      setMedications(data || []);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
      setError('Failed to load medications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedications();
  }, [fetchMedications]);

  const openPrescribe = () => {
    setEditingMedication(null);
    setActionError('');
    setFormOpen(true);
  };

  const openAmend = (medication) => {
    setEditingMedication(medication);
    setActionError('');
    setFormOpen(true);
  };

  // Amending returns a brand-new order id, so the whole list is refetched
  // rather than patched in place.
  const handleSaved = () => fetchMedications();

  const handleDiscontinue = async (reason) => {
    await medicationsService.discontinue(discontinuing.id, reason);
    setExpandedId(null);
    await fetchMedications();
  };

  const activeMeds = medications.filter((m) => m.isActive);
  const discontinuedMeds = medications.filter((m) => !m.isActive);
  const displayedMeds = activeTab === 'active' ? activeMeds : discontinuedMeds;

  const renderSkeleton = () => (
    <div className="space-y-4 mt-6">
      <Skeleton className="h-10 w-[200px]" />
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center border-b border-border/50 pb-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return <div className="p-6 md:p-8 max-w-7xl mx-auto">{renderSkeleton()}</div>;
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="font-sans font-medium">{error}</p>
          <Button variant="outline" onClick={fetchMedications} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            Medication Orders
          </h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Current and past prescriptions for this admission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
                activeTab === 'active'
                  ? 'bg-card text-foreground shadow-2xs border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Active ({activeMeds.length})
            </button>
            <button
              onClick={() => setActiveTab('discontinued')}
              className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
                activeTab === 'discontinued'
                  ? 'bg-card text-foreground shadow-2xs border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Discontinued ({discontinuedMeds.length})
            </button>
          </div>

          {canPrescribe && (
            <Button onClick={openPrescribe} className="font-sans font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Prescribe
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

      {/* ── Table ─────────────────────────────────────────────── */}
      <Card className="border-border shadow-2xs overflow-hidden">
        {displayedMeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Pill className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="font-sans font-medium text-foreground">No {activeTab} medications.</p>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              There are currently no medication records in this category.
            </p>
            {canPrescribe && activeTab === 'active' && (
              <Button variant="outline" onClick={openPrescribe} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Prescribe the first medication
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 pl-6" />
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Medication
                  </TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Dose · Route · Freq
                  </TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Start / End Date
                  </TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Prescriber
                  </TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Status
                  </TableHead>
                  {canPrescribe && (
                    <TableHead className="pr-6 text-right font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMeds.map((med) => {
                  const prescriberName = med.prescribedBy ? `Dr. ${med.prescribedBy.lastName}` : 'Unknown';
                  const originalPrescriber = med.originalPrescriber;
                  const wasAmended =
                    originalPrescriber && originalPrescriber.id !== med.prescribedBy?.id;
                  const isExpanded = expandedId === med.id;
                  const administrations = med.administrations || [];
                  const columnCount = canPrescribe ? 7 : 6;

                  return [
                    <TableRow key={med.id} className="hover:bg-muted/10 border-b border-border/50">
                      <TableCell className="pl-6 align-middle">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : med.id)}
                          aria-label={isExpanded ? 'Hide dose history' : 'Show dose history'}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              med.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <Pill size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-sans text-sm font-bold text-foreground leading-tight truncate">
                              {med.drugName}
                            </span>
                            <span className="font-sans text-[10px] text-muted-foreground mt-0.5">
                              Ordered: {formatDate(med.prescribedAt)}
                            </span>
                            {med.instructions && (
                              <span className="mt-1 flex items-center gap-1 font-sans text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                <AlertTriangle size={11} className="shrink-0" />
                                {med.instructions}
                              </span>
                            )}
                            {med.allergyAcknowledged && (
                              <span className="mt-1 flex items-center gap-1 font-sans text-[11px] font-semibold text-destructive">
                                <ShieldAlert size={11} className="shrink-0" />
                                Prescribed despite a documented allergy
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="flex flex-col">
                          <span className="font-sans text-sm font-semibold text-foreground">
                            {med.dosage}
                            {med.route && (
                              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                                {med.route}
                              </span>
                            )}
                          </span>
                          <span className="font-sans text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Activity size={10} /> {formatFrequency(med)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="flex flex-col font-tnum text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground w-8">Start:</span>
                            <span>{formatDate(med.startDate || med.prescribedAt, 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground w-8">End:</span>
                            <span>{med.endDate ? formatDate(med.endDate, 'MMM d, yyyy') : 'Ongoing'}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <User size={12} className="text-muted-foreground" />
                            <span className="font-sans text-sm text-foreground font-medium">
                              {prescriberName}
                            </span>
                          </div>
                          {wasAmended && (
                            <span className="font-sans text-[10px] text-muted-foreground">
                              Originally Dr. {originalPrescriber.lastName}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle text-right">
                        {med.isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold"
                          >
                            <CheckCircle2 size={12} className="mr-1" /> Active
                          </Badge>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground border-border font-sans font-semibold"
                            >
                              <History size={12} className="mr-1" /> Discontinued
                            </Badge>
                            {med.discontinueReason && (
                              <span className="max-w-[180px] text-right font-sans text-[10px] text-muted-foreground">
                                {med.discontinueReason}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {canPrescribe && (
                        <TableCell className="pr-6 align-middle text-right">
                          {med.isActive ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAmend(med)}
                                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Amend</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionError('');
                                  setDiscontinuing(med);
                                }}
                                className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Stop</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="font-sans text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>,

                    isExpanded && (
                      <TableRow key={`${med.id}-history`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={columnCount} className="px-6 py-4">
                          <p className="mb-3 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Dose history ({administrations.length})
                          </p>

                          {administrations.length === 0 ? (
                            <p className="font-sans text-sm text-muted-foreground">
                              No doses recorded against this order yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {administrations.map((adm) => (
                                <div
                                  key={adm.id}
                                  className="flex flex-col gap-1 rounded-md border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      variant="outline"
                                      className={`font-sans text-[10px] font-semibold ${
                                        ADMIN_STATUS_STYLES[adm.status] || ''
                                      }`}
                                    >
                                      {adm.status}
                                    </Badge>
                                    <div className="flex flex-col">
                                      <span className="font-tnum text-xs text-foreground">
                                        Due {formatDate(adm.scheduledTime, 'MMM d · HH:mm')}
                                        {adm.administeredAt && (
                                          <>
                                            {' · '}
                                            recorded {formatDate(adm.administeredAt, 'HH:mm')}
                                          </>
                                        )}
                                      </span>
                                      {adm.notes && (
                                        <span className="font-sans text-[11px] text-muted-foreground">
                                          {adm.notes}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 font-sans text-[11px] text-muted-foreground">
                                    {adm.administeredDose && (
                                      <span className="font-tnum">{adm.administeredDose}</span>
                                    )}
                                    <span>
                                      {adm.administeredBy
                                        ? `${adm.administeredBy.firstName} ${adm.administeredBy.lastName}`
                                        : 'Unknown'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ),
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <MedicationFormDialog
        key={`${editingMedication?.id || 'new'}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        admissionId={admission?.id}
        medication={editingMedication}
        onSaved={handleSaved}
      />

      <DiscontinueDialog
        key={discontinuing?.id || 'none'}
        medication={discontinuing}
        open={Boolean(discontinuing)}
        onOpenChange={(open) => !open && setDiscontinuing(null)}
        onConfirm={handleDiscontinue}
      />
    </div>
  );
}
