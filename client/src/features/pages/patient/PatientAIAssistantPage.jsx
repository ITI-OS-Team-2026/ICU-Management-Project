import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  RefreshCcw,
  Copy,
  Check,
  Clock,
  User,
  AlertCircle,
  FileText,
  Plus,
  Brain,
  CheckCircle2,
  Trash2,
  Loader2,
  Archive,
  RotateCcw,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { aiService } from '@/features/services/aiService';

// Checklist items displayed during AI generation loading experience
const LOADING_STEPS = [
  'Patient Information',
  'Diagnoses',
  'Vital Signs',
  'Laboratory Results',
  'Medications',
  'Clinical Notes',
  'Nursing Notes',
];

export default function PatientAIAssistantPage() {
  const { admissionId } = useParams();

  // Tab filter: 'active' or 'archived'
  const [activeTab, setActiveTab] = useState('active');

  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Soft Delete state
  const [summaryToDelete, setSummaryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Progressive loading checklist index animation
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // ── Fetch summary history ──────────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (autoSelectNewest = false, tab = activeTab) => {
      try {
        setIsLoadingHistory(true);
        setError(null);

        const params = tab === 'archived' ? { isArchived: 'true' } : { isArchived: 'false' };
        const data = await aiService.getSummaries(admissionId, params);
        
        // Sort descending by generatedAt / createdAt
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a, b) => new Date(b.generatedAt || b.generated_at || 0) - new Date(a.generatedAt || a.generated_at || 0)
        );

        setSummaries(sorted);

        if (autoSelectNewest && sorted.length > 0) {
          setSelectedSummary(sorted[0]);
        } else if (sorted.length > 0) {
          setSelectedSummary((prev) => {
            if (!prev) return sorted[0];
            const stillExists = sorted.find((s) => s.id === prev.id);
            return stillExists || sorted[0];
          });
        } else {
          setSelectedSummary(null);
        }
      } catch (err) {
        console.error('Failed to fetch AI summaries:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to load summary history.');
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [admissionId, activeTab]
  );

  useEffect(() => {
    fetchHistory(false, activeTab);
  }, [fetchHistory, activeTab]);

  // ── Handle Generation step progression ────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isGenerating) {
      setActiveStepIndex(0);
      interval = setInterval(() => {
        setActiveStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // ── Create New Summary Handler ─────────────────────────────────────────────
  const handleGenerateSummary = async () => {
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      setError(null);
      
      const newSummary = await aiService.generatePatientSummary(admissionId);

      // Switch to active tab and auto-select new summary
      setActiveTab('active');
      await fetchHistory(true, 'active');

      if (newSummary) {
        setSelectedSummary(newSummary);
      }
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to generate AI summary. Please verify service configuration and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Soft Delete (Archive) Summary Handler ──────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!summaryToDelete || isDeleting) return;

    const targetId = summaryToDelete.id;
    try {
      setIsDeleting(true);
      setDeleteError(null);

      await aiService.deleteSummary(targetId);

      // Optimistic state update: remove summary immediately from current history list
      const updatedSummaries = summaries.filter((item) => item.id !== targetId);
      setSummaries(updatedSummaries);

      // Auto-select another summary or null if no summaries remain
      if (selectedSummary?.id === targetId) {
        setSelectedSummary(updatedSummaries.length > 0 ? updatedSummaries[0] : null);
      }

      setSuccessMessage('Summary archived successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setSummaryToDelete(null);
    } catch (err) {
      console.error('Failed to archive summary:', err);
      const statusCode = err?.response?.status;
      let msg = 'Failed to archive summary. Please try again.';

      if (statusCode === 409) {
        msg = 'This summary has already been archived.';
      } else if (statusCode === 404) {
        msg = 'Summary not found.';
      } else if (statusCode === 403) {
        msg = 'You do not have permission to archive AI summaries.';
      } else if (err?.response?.data?.message) {
        msg = err.response.data.message;
      }
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Restore (Unarchive) Summary Handler ───────────────────────────────────
  const handleRestoreSummary = async (summaryId) => {
    if (restoringId) return;
    try {
      setRestoringId(summaryId);
      setError(null);

      await aiService.restoreSummary(summaryId);

      // Remove from archived list view
      const updatedSummaries = summaries.filter((item) => item.id !== summaryId);
      setSummaries(updatedSummaries);

      if (selectedSummary?.id === summaryId) {
        setSelectedSummary(updatedSummaries.length > 0 ? updatedSummaries[0] : null);
      }

      setSuccessMessage('Summary restored to Active successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to restore summary:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to restore summary.');
    } finally {
      setRestoringId(null);
    }
  };

  // ── Copy Summary Text Handler ──────────────────────────────────────────────
  const handleCopySummary = () => {
    const textToCopy = selectedSummary?.overallSummary || selectedSummary?.overall_summary || '';
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Helper to format dates cleanly ─────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ── 1. LOADING HISTORY STATE ───────────────────────────────────────────────
  if (isLoadingHistory && summaries.length === 0 && !isGenerating) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)]">
          <div className="lg:col-span-4 border border-border rounded-xl p-4 space-y-3 bg-card">
            <Skeleton className="h-6 w-full rounded" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-8 border border-border rounded-xl p-6 bg-card space-y-4">
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. GENERATING AI SUMMARY LOADING STATE ─────────────────────────────────
  if (isGenerating) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Card className="w-full border-border bg-card shadow-lg overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-border text-center py-8">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 animate-pulse">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-xl font-bold text-foreground">
              Generating AI Summary...
            </CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Synthesizing real-time clinical telemetry, diagnostic history, and nursing records via Bedrock.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3 max-w-md mx-auto">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Analyzing Clinical Data Sources
              </span>
              <div className="space-y-2 border border-border/60 rounded-xl p-4 bg-muted/20">
                {LOADING_STEPS.map((step, idx) => {
                  const isDone = idx < activeStepIndex;
                  const isCurrent = idx === activeStepIndex;

                  return (
                    <div
                      key={step}
                      className={`flex items-center justify-between text-sm font-sans transition-colors ${
                        isDone
                          ? 'text-foreground font-medium'
                          : isCurrent
                          ? 'text-primary font-semibold'
                          : 'text-muted-foreground/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : isCurrent ? (
                          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                        )}
                        <span>{step}</span>
                      </div>
                      {isDone && <span className="font-tnum text-xs text-muted-foreground">✓ Complete</span>}
                      {isCurrent && <span className="font-sans text-xs text-primary font-medium">Processing...</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 3. ERROR STATE ─────────────────────────────────────────────────────────
  if (error && summaries.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-14rem)]">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-display font-bold">Failed to load AI Summaries</AlertTitle>
          <AlertDescription className="font-sans text-sm mt-1">{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => fetchHistory(false, activeTab)} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry Loading
        </Button>
      </div>
    );
  }

  // ── 4. MAIN SUMMARY HISTORY & VIEWER WORKSPACE ─────────────────────────────
  const currentSummaryText = selectedSummary?.overallSummary || selectedSummary?.overall_summary || '';
  const currentGeneratedAt = selectedSummary?.generatedAt || selectedSummary?.generated_at;
  const isSelectedArchived = selectedSummary?.isArchived || selectedSummary?.is_archived;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-foreground">AI Summary</h1>
              <Badge variant="outline" className="font-sans text-xs font-semibold">
                {summaries.length} {activeTab === 'archived' ? 'archived' : 'active'}
              </Badge>
            </div>
            <p className="font-sans text-xs text-muted-foreground">
              Bedrock-powered clinical synthesis of vital signs, lab results, diagnoses, and progress notes.
            </p>
          </div>
        </div>

        <Button
          onClick={handleGenerateSummary}
          disabled={isGenerating}
          className="gap-2 font-sans font-semibold shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create New Summary
        </Button>
      </div>

      {successMessage && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 text-emerald-500" />
          <AlertTitle className="font-sans text-xs font-bold">Success</AlertTitle>
          <AlertDescription className="font-sans text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-sans text-xs font-bold">Error</AlertTitle>
          <AlertDescription className="font-sans text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Two Column Workspace ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Panel: History List with Active / Archived Tabs ────────── */}
        <Card className="lg:col-span-4 border-border bg-card shadow-sm flex flex-col h-[calc(100vh-16rem)] min-h-[480px]">
          <CardHeader className="p-4 pb-3 border-b border-border space-y-3">
            <CardTitle className="font-display text-sm font-bold text-foreground flex items-center justify-between">
              <span>Summary History</span>
              <span className="font-tnum text-xs text-muted-foreground font-normal">Newest → Oldest</span>
            </CardTitle>

            {/* Tab Filter: Active vs Archived */}
            <div className="flex bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-sans">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-1 px-2.5 rounded-md font-medium transition-all text-center ${
                  activeTab === 'active'
                    ? 'bg-card text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                className={`flex-1 py-1 px-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'archived'
                    ? 'bg-card text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Archive className="h-3 w-3" />
                Archive
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden">
            {summaries.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center justify-center h-full">
                <Archive className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="font-sans text-xs font-medium text-foreground">
                  No {activeTab} summaries
                </p>
                <p className="font-sans text-[11px] text-muted-foreground mt-1">
                  {activeTab === 'active'
                    ? 'No active summaries exist. Generate a summary to begin.'
                    : 'No archived summaries found.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {summaries.map((item, index) => {
                    const itemId = item.id;
                    const isSelected = selectedSummary?.id === itemId;
                    const itemDate = item.generatedAt || item.generated_at;
                    const itemType = item.summaryType || item.summary_type || 'ON_DEMAND';
                    const reqUser = item.requestedBy || item.requested_by;
                    const authorName =
                      typeof reqUser === 'object' && reqUser
                        ? `${reqUser.firstName || ''} ${reqUser.lastName || ''}`.trim()
                        : 'Clinician';
                    const isArchived = item.isArchived || item.is_archived;

                    return (
                      <div
                        key={itemId || index}
                        onClick={() => setSelectedSummary(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedSummary(item);
                          }
                        }}
                        className={`group relative w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-tnum text-xs font-semibold text-foreground truncate">
                              {formatDate(itemDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {index === 0 && !isArchived && (
                              <Badge
                                variant="default"
                                className="text-[10px] font-sans font-bold px-1.5 py-0 h-4 shrink-0 bg-emerald-600 hover:bg-emerald-600"
                              >
                                Latest
                              </Badge>
                            )}

                            {isArchived ? (
                              /* Restore Action for Archived summaries */
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreSummary(itemId);
                                }}
                                disabled={restoringId === itemId}
                                title="Restore Summary to Active"
                                aria-label={`Restore summary generated on ${formatDate(itemDate)}`}
                                className="h-6 w-6 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-500/10 rounded shrink-0 opacity-80 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              >
                                {restoringId === itemId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </Button>
                            ) : (
                              /* Archive / Delete Action for Active summaries */
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryToDelete(item);
                                  setDeleteError(null);
                                }}
                                title="Archive Summary"
                                aria-label={`Archive summary generated on ${formatDate(itemDate)}`}
                                className="h-6 w-6 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded shrink-0 opacity-80 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-sans text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {authorName}
                          </span>
                          <div className="flex items-center gap-1">
                            {isArchived && (
                              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/10">
                                Archived
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 h-4">
                              {itemType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ── Right Panel: Viewer or Default Placeholder ──────────────────── */}
        <Card className="lg:col-span-8 border-border bg-card shadow-sm flex flex-col h-[calc(100vh-16rem)] min-h-[480px]">
          {selectedSummary ? (
            <>
              {/* Selected Summary Header */}
              <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-foreground">Clinical AI Summary</h3>
                    {isSelectedArchived && (
                      <Badge variant="outline" className="font-mono text-xs border-amber-500/30 text-amber-600 bg-amber-500/10">
                        Archived
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedSummary.summaryType || selectedSummary.summary_type || 'ON_DEMAND'}
                    </Badge>
                  </div>
                  <p className="font-sans text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-tnum">Generated {formatDate(currentGeneratedAt)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySummary}
                    className="gap-1.5 text-xs font-sans"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Text
                      </>
                    )}
                  </Button>

                  {isSelectedArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreSummary(selectedSummary.id)}
                      disabled={restoringId === selectedSummary.id}
                      className="gap-1.5 text-xs font-sans text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                      title="Restore Summary to Active"
                    >
                      {restoringId === selectedSummary.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSummaryToDelete(selectedSummary);
                        setDeleteError(null);
                      }}
                      className="gap-1.5 text-xs font-sans text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Archive Summary"
                      aria-label="Archive current summary"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>

              {/* Summary Markdown Content Area */}
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full p-6">
                  <FormattedMarkdown content={currentSummaryText} />
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            /* Default State (Summaries exist but none selected) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-1">
                Select an AI Summary from the history
              </h3>
              <p className="font-sans text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                Choose an existing summary record from the left panel to review past clinical findings, or generate a new AI Summary using the patient's latest clinical information.
              </p>
              <Button onClick={handleGenerateSummary} disabled={isGenerating} className="gap-2 font-sans text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Create New Summary
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* ── Confirmation Modal Dialog for Soft Delete ─────────────────────── */}
      <Dialog open={!!summaryToDelete} onOpenChange={(open) => !open && !isDeleting && setSummaryToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold text-foreground">
              <Trash2 className="h-4 w-4 text-destructive" />
              Archive AI Summary
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-muted-foreground pt-1 leading-relaxed">
              Are you sure you want to archive this summary? Archived summaries will be moved to the Archive tab and will no longer appear in active history.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="my-1 py-2 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertTitle className="font-bold text-xs">Error</AlertTitle>
              <AlertDescription className="text-xs">{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSummaryToDelete(null)}
              disabled={isDeleting}
              className="font-sans text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-sans text-xs font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Archive Summary
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
