import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Heart,
  Pill,
  Send,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { useDashboard } from '../hooks/useDashboard';
import { dashboardService } from '../services/dashboardService';
import { Card, CardHeader, CardTitle, CardContent  } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {Skeleton} from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea  } from '@/components/ui/scroll-area';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const user = useAuthStore((s) => s.user);
  const { stats, admissions, activities, isLoading, refetch } = useDashboard();

  // Selected patient for AI query (defaults to first active admission)
  const activeAdmissionId = searchParams.get('admissionId') || admissions[0]?.id || '';
  const selectedAdmission = useMemo(() => {
    return admissions.find((a) => a.id === activeAdmissionId) || admissions[0] || null;
  }, [admissions, activeAdmissionId]);

  // AI Assistant chat state
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState('');

  // Roles checking
  const isNurse = user?.role === 'ICU_NURSE';
  const isClinicalStaff = user?.role === 'ICU_SPECIALIST' || user?.role === 'MEDICAL_RESIDENT';

  const greetingName = useMemo(() => {
    if (!user) return 'User';
    if (user.role === 'ICU_SPECIALIST') return `Dr. ${user.last_name}`;
    return user.first_name;
  }, [user]);

  const currentFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedAdmission) return;

    const userQuestion = question.trim();
    setQuestion('');
    setChatError('');
    setIsAsking(true);

    // Append user question
    setChatLog((prev) => [...prev, { sender: 'user', text: userQuestion }]);

    try {
      const result = await dashboardService.askAiAssistant(selectedAdmission.id, userQuestion);
      
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: result.ai_response || 'No response returned.',
          citations: result.cited_sources || [],
        },
      ]);
    } catch (err) {
      console.error('AI assistant error:', err);
      setChatError(err?.response?.data?.message || 'AI Assistant is temporarily unavailable. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  const handlePatientSelect = (val) => {
    setSearchParams({ admissionId: val });
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-[calc(100vh-4rem)]">
      {/* ── Header Greeting Section ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Live · ICU Dashboard
          </span>
          <h1 className="font-display text-headline text-foreground font-bold">
            Good morning, {greetingName}
          </h1>
          <p className="text-sm font-sans text-muted-foreground mt-0.5">
            {currentFormattedDate} · Critical Care Unit
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.criticalCases > 0 ? (
            <Badge variant="destructive" className="animate-pulse gap-1.5 py-1.5 px-3 border border-destructive/20 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              {stats.criticalCases} Critical Alerts Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-status-available" />
              All Systems Normal
            </Badge>
          )}
        </div>
      </div>

      {/* ── Summary Stats Cards (4 Cards) ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Patients"
          value={isLoading ? '-' : stats.activePatients}
          subText="Across 3 ICU wards"
          badgeText="+2 today"
          badgeColor="bg-status-available/10 text-status-available border-status-available/20"
          icon={Users}
          iconClass="text-primary bg-primary/10"
        />
        <StatsCard
          title="Critical Cases"
          value={isLoading ? '-' : stats.criticalCases}
          subText="Require immediate attention"
          badgeText="+3 from yesterday"
          badgeColor="bg-destructive/10 text-destructive border-destructive/20"
          icon={AlertCircle}
          iconClass="text-destructive bg-destructive/10"
        />
        <StatsCard
          title="Pending Labs"
          value={isLoading ? '-' : stats.pendingLabs}
          subText="Awaiting physician review"
          badgeText="8 urgent"
          badgeColor="bg-status-reserved/10 text-status-reserved border-status-reserved/20"
          icon={Activity}
          iconClass="text-status-reserved bg-status-reserved/10"
        />
        <StatsCard
          title="AI Alerts"
          value={isLoading ? '-' : stats.aiAlerts}
          subText="Predictive model flags"
          badgeText="2 high confidence"
          badgeColor="bg-status-available/10 text-status-available border-status-available/20"
          icon={Sparkles}
          iconClass="text-primary bg-primary/10"
        />
      </div>

      {/* ── Bottom Layout columns ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (AI Assistant for Doctors / Action shortcuts for Nurses) */}
        <div className="lg:col-span-2 flex flex-col">
          {isClinicalStaff ? (
            /* SmartCare AI Assistant - RAG Interface */
            <Card className="rounded-[1.25rem] border-login-brand-ring bg-login-brand text-login-brand-foreground shadow-lg flex-1 flex flex-col min-h-[420px] overflow-hidden">
              <CardHeader className="pb-3 pt-5 px-6 border-b border-login-brand-ring/40 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary-foreground border border-primary/30">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-sm font-bold text-login-brand-foreground">
                      SmartCare AI Assistant
                    </CardTitle>
                    <span className="font-sans text-[10px] text-login-brand-muted mt-0.5 block">
                      GPT-4o · Fine-tuned on ICU data
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-status-available/20 text-status-available border-status-available/30 text-[10px] font-sans font-semibold">
                  Online
                </Badge>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-6 gap-4">
                {/* Active patient selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-login-brand-ring/30 p-3 rounded-lg border border-login-brand-ring/40">
                  <span className="font-sans text-xs font-semibold text-login-brand-muted">
                    Query Context:
                  </span>
                  <div className="w-full sm:w-64">
                    <Select value={activeAdmissionId} onValueChange={handlePatientSelect}>
                      <SelectTrigger className="w-full h-8 bg-login-brand border-login-brand-ring/60 text-xs font-sans">
                        <SelectValue placeholder="Select patient..." />
                      </SelectTrigger>
                      <SelectContent className="bg-login-brand text-login-brand-foreground border-login-brand-ring">
                        {admissions.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs font-sans focus:bg-login-brand-ring focus:text-login-brand-foreground">
                            {a.patient?.name} ({a.bed?.bed_number || 'No Bed'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Insight block */}
                {!selectedAdmission ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-login-brand-muted font-sans">
                    No active patients loaded.
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-4">
                    {chatLog.length === 0 ? (
                      <div className="flex-1 flex flex-col justify-center items-start bg-login-brand-ring/20 p-4 rounded-lg border border-login-brand-ring/30 gap-2">
                        <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] font-semibold">
                          AI Insight
                        </Badge>
                        <p className="font-sans text-sm text-login-brand-foreground font-semibold leading-relaxed">
                          3 high-risk patients flagged this morning. Patient in Bed 7 shows early signs of septic shock — recommend immediate vasopressor evaluation.
                        </p>
                        <span className="font-sans text-[10px] text-login-brand-muted block mt-1 font-tnum">
                          94% confidence · 8 min ago
                        </span>
                      </div>
                    ) : (
                      <ScrollArea className="flex-1 max-h-[220px] bg-login-brand-ring/10 p-3 rounded-lg border border-login-brand-ring/25">
                        <div className="space-y-4">
                          {chatLog.map((log, idx) => (
                            <div key={idx} className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}>
                              <span className="font-sans text-[10px] text-login-brand-muted mb-1 uppercase font-bold">
                                {log.sender === 'user' ? 'You' : 'SmartCare AI'}
                              </span>
                              <div className={`p-3 rounded-lg text-sm max-w-[85%] font-sans leading-relaxed ${
                                log.sender === 'user'
                                  ? 'bg-primary text-primary-foreground border border-primary/20'
                                  : 'bg-login-brand-ring/40 text-login-brand-foreground border border-login-brand-ring/50'
                              }`}>
                                {log.text}
                                {log.citations && log.citations.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-login-brand-ring/40 flex flex-wrap gap-1">
                                    <span className="text-[10px] text-login-brand-muted mr-1 font-bold">Sources:</span>
                                    {log.citations.map((cite, cidx) => (
                                      <span key={cidx} className="bg-login-brand/50 border border-login-brand-ring/30 text-[9px] px-1.5 py-0.5 rounded font-sans text-login-brand-muted">
                                        {cite}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    {chatError && (
                      <div className="bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-md font-sans">
                        {chatError}
                      </div>
                    )}

                    {/* Input action */}
                    <form onSubmit={handleAskAI} className="relative mt-auto">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask AI about your patients..."
                        disabled={isAsking || !selectedAdmission}
                        className="w-full bg-login-brand-ring/35 border-login-brand-ring/60 text-login-brand-foreground pr-10 font-sans h-10 placeholder:text-login-brand-muted"
                      />
                      <Button
                        type="submit"
                        disabled={isAsking || !question.trim() || !selectedAdmission}
                        size="icon"
                        variant="default"
                        className="absolute right-1 top-1 h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Clinical Shortcuts Card - Custom Nurse layout */
            <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex-1 flex flex-col p-6 min-h-[420px]">
              <CardHeader className="p-0 pb-5 border-b border-border/50">
                <CardTitle className="font-display text-sm font-bold text-foreground">
                  Clinical Quick Actions
                </CardTitle>
                <p className="text-xs font-sans text-muted-foreground mt-1">
                  Access direct clinical charts and bedside recording views
                </p>
              </CardHeader>
              <CardContent className="flex-1 grid grid-cols-2 gap-4 pt-6">
                <QuickActionButton
                  title="Vitals Entry"
                  desc="Record hourly vitals signs"
                  icon={Activity}
                  onClick={() => navigate('/vitals/entry')}
                />
                <QuickActionButton
                  title="Med Administration"
                  desc="Record MAR administrations"
                  icon={Pill}
                  onClick={() => navigate('/medications/administration')}
                />
                <QuickActionButton
                  title="Bed Overview"
                  desc="View wards census & occupancy"
                  icon={CheckCircle2}
                  onClick={() => navigate('/beds')}
                />
                <QuickActionButton
                  title="Admit Patient"
                  desc="Assign beds and specialists"
                  icon={UserPlus}
                  onClick={() => navigate('/patients/admit')}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (Recent Activity Feed) */}
        <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex flex-col">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-sm font-bold text-foreground">
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="text-xs font-sans font-semibold text-primary hover:bg-transparent">
              View all
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))
              ) : (
                activities.map((act, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${act.dotColor}`} />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-sans text-xs font-bold text-foreground truncate">
                        {act.title}
                      </span>
                      <span className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
                        {act.desc}
                      </span>
                    </div>
                    <span className="font-tnum text-[10px] text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap ml-2">
                      {act.time}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 text-border/80 border-t border-border/40 pt-4 mt-auto">
              <span className="h-2 w-2 rounded-full bg-status-available animate-pulse" />
              <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Live updates enabled
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subText, badgeText, badgeColor, icon: Icon, iconClass }) {
  return (
    <Card className="shadow-2xs border-border bg-card rounded-xl overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {title}
            </span>
            <span className="font-tnum text-[2.25rem] font-bold leading-none text-foreground mt-2">
              {value}
            </span>
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-auto">
          <span className="font-sans text-xs text-muted-foreground truncate">
            {subText}
          </span>
          <Badge variant="outline" className={`text-[10px] font-sans font-semibold border ${badgeColor} self-start sm:self-auto`}>
            {badgeText}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ title, desc, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start text-left p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 transition-all gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <span className="font-sans text-xs font-bold text-foreground block">
          {title}
        </span>
        <span className="font-sans text-[10px] text-muted-foreground mt-0.5 block leading-normal">
          {desc}
        </span>
      </div>
    </button>
  );
}
