import { useState, useEffect, useCallback } from 'react';
import { Loader2, BellRing, User, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function SummonDoctorModal({ open, onClose, admission }) {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      setIsLoading(true);
      // `role` only accepts a single value server-side, but we need both
      // doctor roles, so fetch broadly (status=ACTIVE, high limit) and
      // filter client-side rather than relying on the default limit=10,
      // which was silently truncating the list once total users passed 10.
      const res = await api.get('/admin/users', { params: { status: 'ACTIVE', limit: 100 } });
      const doctorRoles = ['MEDICAL_RESIDENT', 'ICU_SPECIALIST'];
      const activeDoctors = res.data.data.filter(u => doctorRoles.includes(u.role) && u.status === 'ACTIVE');
      setDoctors(activeDoctors);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load doctors list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch doctors when modal opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMsg('');
      setSuccessMsg('');
      setReason('');
      setSelectedDoctorId(admission?.doctor?.id || ''); // Default to assigned doctor
      fetchDoctors();
    }
  }, [open, admission, fetchDoctors]);

  const handleSummon = async () => {
    if (!admission) return;
    setErrorMsg('');
    
    try {
      setIsSubmitting(true);
      await api.post(`/admissions/${admission.id}/summon`, {
        doctorId: selectedDoctorId,
        reason: reason.trim(),
      });
      setSuccessMsg('Doctor successfully summoned!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to summon doctor. Please page them manually if urgent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <BellRing className="h-5 w-5 text-destructive" />
            Summon Doctor
          </DialogTitle>
          <DialogDescription>
            {admission ? `For Patient: ${admission.patient?.name} (Bed: ${admission.bed?.bed_number})` : 'Select a patient context to summon.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Doctor</Label>
            {isLoading ? (
              <div className="flex h-10 items-center justify-center rounded-md border border-input bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a doctor to summon">
                    {(value) => {
                      const d = doctors.find((doc) => doc.id === value);
                      return d ? `Dr. ${d.first_name} ${d.last_name}` : null;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Dr. {doctor.first_name} {doctor.last_name}</span>
                        {doctor.id === admission?.doctor?.id && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Primary</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({doctor.role === 'ICU_SPECIALIST' ? 'Specialist' : 'Resident'})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              placeholder="E.g., Patient seizing, medication review needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="destructive" onClick={handleSummon} disabled={isSubmitting || !selectedDoctorId}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="mr-2 h-4 w-4" />
            )}
            Summon {selectedDoctor ? `Dr. ${selectedDoctor.last_name}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
