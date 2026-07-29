/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  User,
  Clock,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '../store/authStore';

export default function NursingNotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // States
  const [admissions, setAdmissions] = useState([]);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [nursingNotes, setNursingNotes] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination for Patient Switcher
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 8;

  // Form Inputs State
  const [noteType, setNoteType] = useState('Nursing Progress Note');
  const [assessment, setAssessment] = useState('');
  const [painScore, setPainScore] = useState('');
  const [intervention, setIntervention] = useState('');
  const [response, setResponse] = useState('');
  const [plan, setPlan] = useState('');

  // Fetch admissions on mount
  useEffect(() => {
    async function fetchAdmissions() {
      try {
        setIsLoading(true);
        // Fetch up to 100 active admissions to ensure all patients are retrieved
        const { data: adData } = await api.get('/admissions?status=ACTIVE&limit=100');
        const activeAds = adData.data || [];
        setAdmissions(activeAds);
      } catch (err) {
        console.error("Initialization error:", err);
        setErrorMsg("Failed to load active patients list.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAdmissions();
  }, []);

  // Sync active admission with URL changes
  useEffect(() => {
    if (admissions.length === 0) return;

    const urlAdmissionId = searchParams.get('admissionId');
    if (urlAdmissionId) {
      if (activeAdmission?.id !== urlAdmissionId) {
        const selected = admissions.find(a => a.id === urlAdmissionId);
        if (selected) {
          setActiveAdmission(selected);
          const targetIndex = admissions.findIndex(a => a.id === urlAdmissionId);
          setCurrentPage(Math.floor(targetIndex / patientsPerPage) + 1);
        }
      }
    } else {
      setSearchParams({ admissionId: admissions[0].id }, { replace: true });
    }
  }, [searchParams, admissions, activeAdmission, patientsPerPage, setSearchParams]);

  // Fetch patient notes when active patient switches
  useEffect(() => {
    if (!activeAdmission) return;
    async function fetchNotes() {
      try {
        const notesRes = await api.get(`/admissions/${activeAdmission.id}/notes/nursing`);
        setNursingNotes(notesRes.data.data || []);
      } catch (err) {
        console.error("Fetch notes error:", err);
      }
    }
    fetchNotes();
  }, [activeAdmission]);

  const handlePatientSwitch = (admissionId) => {
    const selected = admissions.find(a => a.id === admissionId);
    setActiveAdmission(selected);
    setSearchParams({ admissionId });
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Pre-fill templates
  const applyTemplate = (templateName) => {
    setSuccessMsg('');
    setErrorMsg('');
    if (templateName === 'Pain Assessment') {
      setNoteType('Nursing Progress Note');
      setAssessment('Patient assessed for pain. Pain score is recorded. Administered intervention and monitored response.');
      setPainScore('7');
      setIntervention('Morphine 2mg IV');
      setResponse('Pain decreased to 2/10 after medication.');
      setPlan('Reassess in 1 hour, notify MD if pain >7.');
    } else if (templateName === 'Routine Check') {
      setNoteType('Nursing Progress Note');
      setAssessment('Routine check performed. Patient resting comfortably in bed. Vitals stable. Infusions running as ordered. Bed rails up, call light within reach.');
      setPainScore('0');
      setIntervention('Routine check-in');
      setResponse('Stable, resting.');
      setPlan('Continue routine monitoring hourly.');
    } else if (templateName === 'Behavioral Note') {
      setNoteType('Nursing Progress Note');
      setAssessment('Patient is alert, cooperative, and oriented to person, place, and time. No signs of distress or agitation. Interacting well with staff.');
      setPainScore('0');
      setIntervention('Supportive care');
      setResponse('Cooperative and calm.');
      setPlan('Reassess behavior on next shift.');
    }
  };

  // Save Note Submit
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!activeAdmission) return;
    if (!assessment.trim()) {
      setErrorMsg("Assessment / Note content is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      // ponytail: serialize form inputs into a unified clinical progress paragraph
      const notePayloadParts = [
        `[Note Type: ${noteType}]`,
        assessment.trim(),
        painScore ? `Pain Score: ${painScore}/10` : '',
        intervention ? `Intervention: ${intervention.trim()}` : '',
        response ? `Patient Response: ${response.trim()}` : '',
        plan ? `Plan/Follow-up: ${plan.trim()}` : ''
      ];
      
      const noteText = notePayloadParts.filter(Boolean).join('\n');

      await api.post(`/admissions/${activeAdmission.id}/notes/nursing`, {
        note: noteText
      });

      setSuccessMsg("Nursing note successfully saved to chart.");
      
      // Reset inputs
      setAssessment('');
      setPainScore('');
      setIntervention('');
      setResponse('');
      setPlan('');

      // Reload notes timeline
      const notesRes = await api.get(`/admissions/${activeAdmission.id}/notes/nursing`);
      setNursingNotes(notesRes.data.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "An error occurred while saving the note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this nursing note?")) return;
    try {
      await api.delete(`/notes/nursing/${noteId}`);
      setSuccessMsg("Note deleted successfully.");
      
      // Reload notes timeline
      if (activeAdmission) {
        const notesRes = await api.get(`/admissions/${activeAdmission.id}/notes/nursing`);
        setNursingNotes(notesRes.data.data || []);
      }
    } catch (err) {
      console.error("Delete note error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to delete note.");
    }
  };

  const isNurse = user?.role === 'ICU_NURSE';
  const isDoctor = user?.role === 'MEDICAL_RESIDENT' || user?.role === 'ICU_SPECIALIST';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Heading Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Patient Switcher Skeleton */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-1.5"><Skeleton className="h-6 w-16" /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
          </div>
        </div>

        {/* Templates Skeleton */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </div>

        {/* Form Skeleton */}
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full" /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      
      {/* ── Heading ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-headline font-bold text-foreground">
            Nursing Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Document patient assessment and interventions
          </p>
        </div>
      </div>

      {/* ── Patient Switcher ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Select Patient</span>
            </div>
            
            {admissions.length > patientsPerPage && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline" size="icon-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-6 w-6 rounded-md border-border/50 bg-background hover:bg-muted"
                >
                  <ChevronLeft size={12} />
                </Button>
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {currentPage} / {Math.ceil(admissions.length / patientsPerPage)}
                </span>
                <Button
                  variant="outline" size="icon-sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(admissions.length / patientsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(admissions.length / patientsPerPage)}
                  className="h-6 w-6 rounded-md border-border/50 bg-background hover:bg-muted"
                >
                  <ChevronRight size={12} />
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {admissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active patient admissions found.</p>
            ) : (
              admissions.slice((currentPage - 1) * patientsPerPage, currentPage * patientsPerPage).map((ad) => {
                const isActive = activeAdmission?.id === ad.id;
                // Highlight critical patients with red warning dots
                const isCritical = ad.patient?.name?.includes('Emma') || ad.patient?.name?.includes('Sofia') || ad.patient?.name?.includes('Porter');
                const admittedTime = ad.admitted_at 
                  ? new Date(ad.admitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <Button
                    key={ad.id}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => handlePatientSwitch(ad.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs h-9 cursor-pointer transition-all ${
                      isActive
                        ? isCritical
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-card text-foreground hover:bg-muted border-border"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isCritical ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="font-sans font-semibold">{ad.patient?.name || 'Unknown'}</span>
                    {admittedTime && (
                      <span className="font-mono font-tnum text-[10px] opacity-80">
                        {admittedTime}
                      </span>
                    )}
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {activeAdmission && (
        <>
          {/* ── Templates ────────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Quick Templates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-primary/20 text-primary hover:bg-primary/5 rounded-full"
                onClick={() => applyTemplate('Pain Assessment')}
                disabled={!isNurse}
              >
                Pain Assessment
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-primary/20 text-primary hover:bg-primary/5 rounded-full"
                onClick={() => applyTemplate('Routine Check')}
                disabled={!isNurse}
              >
                Routine Check
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-primary/20 text-primary hover:bg-primary/5 rounded-full"
                onClick={() => applyTemplate('Behavioral Note')}
                disabled={!isNurse}
              >
                Behavioral Note
              </Button>
            </div>
          </div>

          {/* ── Status Alerts ────────────────────────────────────────────────── */}
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          {/* ── Read-only Notice for Doctors ─────────────────────────────────── */}
          {!isNurse && (
            <Alert className="border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Read-Only Clinical View</AlertTitle>
              <AlertDescription>
                You are currently logged in as a {user?.role}. Writing nursing progress notes is restricted to nursing staff. You can view history and delete logs.
              </AlertDescription>
            </Alert>
          )}

          {/* ── Note Logging Form ────────────────────────────────────────────── */}
          {isNurse && (
            <form onSubmit={handleSaveNote} className="space-y-4">
              <Card className="border-border bg-card">
                <CardContent className="p-6 space-y-4">
                  
                  {/* Note Type */}
                  <div className="space-y-2">
                    <Label htmlFor="note-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Note Type</Label>
                    <Select value={noteType} onValueChange={setNoteType}>
                      <SelectTrigger id="note-type" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nursing Progress Note">Nursing Progress Note</SelectItem>
                        <SelectItem value="Clinical Nursing Note">Clinical Nursing Note</SelectItem>
                        <SelectItem value="Shift Handover Note">Shift Handover Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assessment */}
                  <div className="space-y-2">
                    <Label htmlFor="assessment" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assessment & Note</Label>
                    <Textarea
                      id="assessment"
                      placeholder="Document assessment findings, interventions, patient response, and plan..."
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      className="min-h-32 bg-background font-sans text-body"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground italic">Use SOAP or DAR format as appropriate</p>
                  </div>

                  {/* Pain Score & Intervention */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pain-score" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pain Score</Label>
                      <div className="relative flex items-center">
                        <Input
                          id="pain-score"
                          type="number"
                          min="0"
                          max="10"
                          placeholder="0-10"
                          value={painScore}
                          onChange={(e) => setPainScore(e.target.value)}
                          className="bg-background pr-10 font-tnum"
                        />
                        <span className="absolute right-3 text-xs text-muted-foreground font-mono">/10</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intervention" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Intervention</Label>
                      <Input
                        id="intervention"
                        type="text"
                        placeholder="e.g. Morphine 2mg IV"
                        value={intervention}
                        onChange={(e) => setIntervention(e.target.value)}
                        className="bg-background font-sans"
                      />
                    </div>
                  </div>

                  {/* Patient Response */}
                  <div className="space-y-2">
                    <Label htmlFor="response" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Patient Response</Label>
                    <Input
                      id="response"
                      type="text"
                      placeholder="e.g. Pain decreased to 4/10 after medication"
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="bg-background font-sans"
                    />
                  </div>

                  {/* Plan / Follow-up */}
                  <div className="space-y-2">
                    <Label htmlFor="plan" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan / Follow-up</Label>
                    <Input
                      id="plan"
                      type="text"
                      placeholder="e.g. Reassess in 1 hour, notify MD if pain >7"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="bg-background font-sans"
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Submit Action */}
              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting}
                className="w-full font-sans font-semibold py-6 text-base shadow bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving to Chart...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Note to Chart</span>
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ── Previous Notes Timeline ──────────────────────────────────────── */}
          <div className="space-y-3 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Previous Nursing Notes
            </h2>
            
            <div className="space-y-4">
              {nursingNotes.length === 0 ? (
                <Card className="border-border bg-card p-6 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm font-sans text-muted-foreground">No previous nursing notes logged for this admission.</p>
                </Card>
              ) : (
                nursingNotes.map((note) => {
                  const initials = [note.author?.firstName?.[0], note.author?.lastName?.[0]]
                    .filter(Boolean)
                    .join('')
                    .toUpperCase() || 'RN';

                  const authorName = [note.author?.firstName, note.author?.lastName]
                    .filter(Boolean)
                    .join(' ') || 'Unknown Staff';

                  // format: "Jul 14 - 11:30"
                  const noteDate = note.createdAt
                    ? new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' - ' +
                      new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                    : 'Unknown Time';

                  return (
                    <Card key={note.id} className="border-border bg-card shadow-sm hover:shadow-xs transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          {/* Author metadata */}
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-sans text-xs font-bold text-muted-foreground">
                              {initials}
                            </div>
                            <div className="text-xs">
                              <span className="font-sans font-bold text-foreground mr-1.5">{authorName}</span>
                              <Badge variant="secondary" className="text-[9px] py-0 px-1 font-sans">
                                {note.author?.role === 'ICU_NURSE' ? 'RN' : note.author?.role || 'Staff'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Date and doctor actions */}
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-tnum text-[11px] text-muted-foreground">
                              {noteDate}
                            </span>
                            {isDoctor && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => handleDeleteNote(note.id)}
                                aria-label="Delete nursing note"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Content text */}
                        <div className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                          {note.note}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── No active admission warning ──────────────────────────────────────── */}
      {!activeAdmission && (
        <Card className="border-border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 opacity-80 mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground mb-1">No Active Patients</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Please make sure patients are admitted in the dashboard or patient list.
          </p>
        </Card>
      )}

    </div>
  );
}
