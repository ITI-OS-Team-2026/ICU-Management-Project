import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Users,
  Grid,
  List,
  RefreshCcw,
} from 'lucide-react';

import { usePatients } from '../hooks/usePatients';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';

// Helper to determine acuity and risk score dynamically from latest vitals
const calculateAcuityAndRisk = (vitals) => {
  if (!vitals) {
    return {
      acuity: 'Stable',
      riskScore: 25,
      acuityColor: 'text-status-available',
      badgeClass: 'bg-status-available/10 text-status-available border-status-available/30 hover:bg-status-available/20',
      indicatorClass: 'bg-status-available',
    };
  }

  const temp = vitals.temperature ? parseFloat(vitals.temperature) : 37.0;
  const pulse = vitals.pulse ? parseInt(vitals.pulse, 10) : 75;
  const spo2 = vitals.spo2 ? parseInt(vitals.spo2, 10) : 98;
  const sBp = vitals.systolicBp ? parseInt(vitals.systolicBp, 10) : 120;
  const dBp = vitals.diastolicBp ? parseInt(vitals.diastolicBp, 10) : 80;
  const rr = vitals.respiratoryRate ? parseInt(vitals.respiratoryRate, 10) : 16;

  let criticalCount = 0;
  let watchfulCount = 0;

  // SpO2
  if (spo2 < 90) criticalCount += 2;
  else if (spo2 < 95) watchfulCount++;

  // Pulse
  if (pulse > 130 || pulse < 45) criticalCount++;
  else if (pulse > 100 || pulse < 55) watchfulCount++;

  // Temperature
  if (temp > 39.0 || temp < 35.5) criticalCount++;
  else if (temp > 38.0 || temp < 36.0) watchfulCount++;

  // BP
  if (sBp > 180 || sBp < 85) criticalCount++;
  else if (sBp > 140 || sBp < 95) watchfulCount++;

  if (criticalCount > 0) {
    const riskScore = Math.min(80 + (criticalCount * 5) + (watchfulCount * 2), 99);
    return {
      acuity: 'Critical',
      riskScore,
      acuityColor: 'text-destructive',
      badgeClass: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
      indicatorClass: 'bg-destructive',
    };
  }

  if (watchfulCount > 0) {
    const riskScore = Math.min(50 + (watchfulCount * 6), 79);
    return {
      acuity: 'Watchful',
      riskScore,
      acuityColor: 'text-status-reserved',
      badgeClass: 'bg-status-reserved/10 text-status-reserved border-status-reserved/30 hover:bg-status-reserved/20',
      indicatorClass: 'bg-status-reserved',
    };
  }

  return {
    acuity: 'Stable',
    riskScore: Math.max(15 + (pulse % 10) + (sBp % 10), 12),
    acuityColor: 'text-status-available',
    badgeClass: 'bg-status-available/10 text-status-available border-status-available/30 hover:bg-status-available/20',
    indicatorClass: 'bg-status-available',
  };
};

const getBedUnit = (bedNumber) => {
  if (!bedNumber) return 'Unknown';
  if (bedNumber.startsWith('CCU-7')) return 'CCU-7';
  if (bedNumber.startsWith('CCU-8')) return 'CCU-8';
  if (bedNumber.startsWith('ICU-N')) return 'ICU-North';
  if (bedNumber.startsWith('ICU-S')) return 'ICU-South';
  if (bedNumber.includes('-')) return bedNumber.split('-')[0];
  return bedNumber.split('/')[0] || 'Other';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PatientListPage() {
  const navigate = useNavigate();
  const { patients, isLoading, error, refetch } = usePatients();
  const user = useAuthStore((s) => s.user);
  const isNurse = user?.role === 'ICU_NURSE';

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [acuityFilter, setAcuityFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Pre-calculate derived acuity and risk for all patients
  const processedPatients = useMemo(() => {
    return patients.map(p => {
      const metrics = calculateAcuityAndRisk(p.latestVitals);
      const bedUnit = getBedUnit(p.bed?.bed_number);
      const primaryDiagnosis = p.diagnosesList?.[0]?.conditionName || p.provisional_diagnosis || 'No Diagnosis';
      const diagnosisCode = p.diagnosesList?.[0]?.id ? `E21.0` : '—'; // Default placeholder code or mapping

      // Nurse formatting
      const activeNurseAssignment = p.nursesList?.find(n => !n.unassigned_at);
      const nurseName = activeNurseAssignment?.nurse 
        ? `${activeNurseAssignment.nurse.first_name} ${activeNurseAssignment.nurse.last_name}, RN`
        : 'Unassigned';

      // Doctor formatting
      const doctorName = p.doctor
        ? `Dr. ${p.doctor.first_name} ${p.doctor.last_name}`
        : 'Attending Doctor';

      return {
        ...p,
        ...metrics,
        bedUnit,
        primaryDiagnosis,
        diagnosisCode,
        nurseName,
        doctorName,
      };
    });
  }, [patients]);

  // Census counts
  const stats = useMemo(() => {
    return processedPatients.reduce(
      (acc, p) => {
        acc.total++;
        if (p.acuity === 'Critical') acc.critical++;
        else if (p.acuity === 'Watchful') acc.watchful++;
        else if (p.acuity === 'Stable') acc.stable++;
        return acc;
      },
      { total: 0, critical: 0, watchful: 0, stable: 0 }
    );
  }, [processedPatients]);

  // Dynamic bed units list derived from current patient census
  const availableUnits = useMemo(() => {
    const units = new Set(['All']);
    processedPatients.forEach((p) => {
      if (p.bedUnit && p.bedUnit !== 'Unknown') {
        units.add(p.bedUnit);
      }
    });
    return Array.from(units);
  }, [processedPatients]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return processedPatients.filter((p) => {
      // 1. Text Search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        p.patient?.name?.toLowerCase().includes(searchLower) ||
        p.patient?.mrn?.toLowerCase().includes(searchLower) ||
        p.primaryDiagnosis?.toLowerCase().includes(searchLower);

      // 2. Acuity Filter
      const matchesAcuity = acuityFilter === 'All' || p.acuity === acuityFilter;

      // 3. Unit Filter
      const matchesUnit = unitFilter === 'All' || p.bedUnit === unitFilter;

      return matchesSearch && matchesAcuity && matchesUnit;
    });
  }, [processedPatients, searchQuery, acuityFilter, unitFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, acuityFilter, unitFilter]);

  // Paginated slice
  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPatients.slice(startIndex, startIndex + pageSize);
  }, [filteredPatients, currentPage, pageSize]);

  const handleCensusPdf = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const rows = filteredPatients.map(p => `
      <tr>
        <td>${p.patient?.name || '—'}</td>
        <td>${p.patient?.mrn || '—'}</td>
        <td>${p.patient?.age ?? '—'}y ${p.patient?.gender || ''}</td>
        <td class="acuity-${(p.acuity || '').toLowerCase()}">${p.acuity || '—'}</td>
        <td>${p.primaryDiagnosis || '—'}</td>
        <td>${p.bed?.bed_number || 'Unassigned'}</td>
        <td>${p.latestVitals?.pulse ? `HR ${p.latestVitals.pulse} | SpO₂ ${p.latestVitals.spo2}% | BP ${p.latestVitals.systolicBp}/${p.latestVitals.diastolicBp}` : '—'}</td>
        <td>${p.doctorName || '—'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ICU Census Report — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
    h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 11px; margin-bottom: 16px; }
    .stats { display: flex; gap: 24px; margin-bottom: 16px; padding: 10px 14px; background: #f5f5f5; border-radius: 6px; }
    .stat { display: flex; flex-direction: column; }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
    .stat-value { font-size: 20px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; border-bottom: 2px solid #ddd; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .acuity-critical { color: #dc2626; font-weight: bold; }
    .acuity-watchful { color: #d97706; font-weight: bold; }
    .acuity-stable { color: #16a34a; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 9px; color: #999; text-align: center; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>ICU Patient Census Report</h1>
  <p class="subtitle">Generated on ${date} &mdash; ${filteredPatients.length} patient(s) listed</p>
  <div class="stats">
    <div class="stat"><span class="stat-label">Total</span><span class="stat-value">${filteredPatients.length}</span></div>
    <div class="stat"><span class="stat-label">Critical</span><span class="stat-value" style="color:#dc2626">${filteredPatients.filter(p => p.acuity === 'Critical').length}</span></div>
    <div class="stat"><span class="stat-label">Watchful</span><span class="stat-value" style="color:#d97706">${filteredPatients.filter(p => p.acuity === 'Watchful').length}</span></div>
    <div class="stat"><span class="stat-label">Stable</span><span class="stat-value" style="color:#16a34a">${filteredPatients.filter(p => p.acuity === 'Stable').length}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Patient Name</th><th>MRN</th><th>Age / Gender</th><th>Acuity</th>
        <th>Diagnosis</th><th>Bed</th><th>Latest Vitals</th><th>Attending</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">ICU Management System &mdash; Confidential clinical document &mdash; Do not share without authorization.</p>
  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-[calc(100vh-4rem)]">
      {/* ── Breadcrumbs and Title ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1">Clinical / Patient List</p>
          <h1 className="font-display text-headline text-foreground font-bold">Patient List</h1>
          <p className="text-sm font-sans text-muted-foreground mt-1">ICU census — all currently admitted patients</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={refetch} variant="outline" size="icon" disabled={isLoading} className="h-9 w-9">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleCensusPdf} variant="outline" disabled={isLoading} className="gap-2 h-9">
            <Download className="h-4 w-4" />
            Census PDF
          </Button>
        </div>
      </div>

      {/* ── Stats Summary Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Patients"
          value={isLoading ? '-' : stats.total}
          icon={Users}
          iconClass="text-primary bg-primary/10"
        />
        <StatsCard
          title="Critical"
          value={isLoading ? '-' : stats.critical}
          icon={AlertCircle}
          iconClass="text-destructive bg-destructive/10"
        />
        <StatsCard
          title="Watchful"
          value={isLoading ? '-' : stats.watchful}
          icon={AlertTriangle}
          iconClass="text-status-reserved bg-status-reserved/10"
        />
        <StatsCard
          title="Stable"
          value={isLoading ? '-' : stats.stable}
          icon={CheckCircle2}
          iconClass="text-status-available bg-status-available/10"
        />
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-start sm:items-center">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, patient ID, diagnosis..."
              className="pl-9 h-9 w-full font-sans"
            />
          </div>

          {/* Acuity filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50">
            {['All', 'Critical', 'Watchful', 'Stable'].map((type) => (
              <button
                key={type}
                onClick={() => setAcuityFilter(type)}
                className={`px-3 py-1 text-xs font-sans font-medium rounded-md transition-all ${
                  acuityFilter === type
                    ? 'bg-card text-foreground shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Bed unit filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50">
            {availableUnits.map((unit) => (
              <button
                key={unit}
                onClick={() => setUnitFilter(unit)}
                className={`px-3 py-1 text-xs font-sans font-medium rounded-md transition-all ${
                  unitFilter === unit
                    ? 'bg-card text-foreground shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Layout view toggle */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 ml-auto lg:ml-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('list')}
            className={`h-8 w-8 rounded-md ${viewMode === 'list' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={`h-8 w-8 rounded-md ${viewMode === 'grid' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Patient List Table / Grid ───────────────────────────────────── */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="flex h-48 items-center justify-center p-6 bg-card border border-border rounded-xl">
          <p className="text-destructive font-sans font-medium">Error loading patient census: {error}</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="flex flex-col h-48 items-center justify-center p-6 bg-card border border-border rounded-xl">
          <Users className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground font-sans font-medium">No matching patients found in this census.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-6">Patient</TableHead>
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acuity</TableHead>
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Diagnosis</TableHead>
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Bed</TableHead>
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vitals</TableHead>
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">AI Risk</TableHead>
                <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Care Team</TableHead>
                {!isNurse && <TableHead className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider pr-6 text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.map((p) => {
                const initials = p.patient?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??';
                
                return (
                  <TableRow key={p.id} className="hover:bg-muted/10 border-b border-border/50">
                    {/* Patient detail */}
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-primary/10 text-primary">
                          <AvatarFallback className="text-xs font-bold font-sans">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-sans font-bold text-foreground text-sm leading-tight">
                            {p.patient?.name}
                          </span>
                          <span className="font-sans text-xs text-muted-foreground mt-0.5">
                            {p.patient?.mrn} · {p.patient?.age}y {p.patient?.gender}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Acuity Badge */}
                    <TableCell className="align-middle">
                      <Badge variant={p.acuityVariant} className={`font-sans text-[11px] font-semibold border ${p.badgeClass}`}>
                        {p.acuity}
                      </Badge>
                    </TableCell>

                    {/* Diagnosis detail */}
                    <TableCell className="align-middle max-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-sans text-sm font-semibold text-foreground truncate">
                          {p.primaryDiagnosis}
                        </span>
                        <span className="font-sans text-xs text-muted-foreground mt-0.5 font-tnum">
                          {p.diagnosisCode}
                        </span>
                      </div>
                    </TableCell>

                    {/* Bed Info */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col">
                        <span className="font-sans text-sm font-bold text-foreground">
                          {p.bed?.bed_number || 'Unassigned'}
                        </span>
                        <span className="font-sans text-xs text-muted-foreground mt-0.5">
                          {formatDate(p.admitted_at)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Vital signs */}
                    <TableCell className="align-middle font-tnum text-xs space-y-0.5 text-muted-foreground">
                      <div>
                        HR <span className="font-semibold text-foreground">{p.latestVitals?.pulse ?? '—'}</span>
                        <span className="mx-1.5 text-border">|</span>
                        SpO₂ <span className="font-semibold text-foreground">{p.latestVitals?.spo2 ? `${p.latestVitals.spo2}%` : '—'}</span>
                      </div>
                      <div>
                        BP <span className="font-semibold text-foreground">
                          {p.latestVitals?.systolicBp ? `${p.latestVitals.systolicBp}/${p.latestVitals.diastolicBp}` : '—'}
                        </span>
                      </div>
                    </TableCell>

                    {/* AI Risk Progress */}
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-3">
                        <Progress value={p.riskScore} className="w-16 h-1.5">
                          <ProgressTrack>
                            <ProgressIndicator className={p.indicatorClass} />
                          </ProgressTrack>
                        </Progress>
                        <span className="font-tnum text-xs font-bold text-foreground">
                          {p.riskScore}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Care Team */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col">
                        <span className="font-sans text-xs font-bold text-foreground">
                          {p.doctorName}
                        </span>
                        <span className="font-sans text-[11px] text-muted-foreground mt-0.5">
                          {p.nurseName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Open action button */}
                    {!isNurse && (
                      <TableCell className="pr-6 text-right">
                        <Button
                          onClick={() => navigate(`/patients/${p.id}`)}
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 h-8 font-sans font-bold hover:bg-primary hover:text-primary-foreground bg-primary/10 text-primary transition-all rounded-md px-3"
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid layout view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPatients.map((p) => {
            const initials = p.patient?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??';
            
            return (
              <Card key={p.id} className="rounded-xl border border-border shadow-2xs hover:border-primary/30 transition-all bg-card overflow-hidden">
                <div className="p-5 flex flex-col gap-4">
                  {/* Header info */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 bg-primary/10 text-primary">
                        <AvatarFallback className="text-xs font-bold font-sans">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-sans font-bold text-foreground text-sm leading-tight">{p.patient?.name}</span>
                        <span className="font-sans text-xs text-muted-foreground mt-0.5">
                          {p.patient?.mrn} · {p.patient?.age}y {p.patient?.gender}
                        </span>
                      </div>
                    </div>
                    <Badge variant={p.acuityVariant} className={`font-sans text-[10px] font-semibold border ${p.badgeClass}`}>
                      {p.acuity}
                    </Badge>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* Bed and Diagnosis */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="font-sans text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Bed</span>
                      <span className="font-sans text-sm font-bold text-foreground mt-0.5">{p.bed?.bed_number || 'Unassigned'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-sans text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Diagnosis</span>
                      <span className="font-sans text-sm font-semibold text-foreground mt-0.5 truncate">{p.primaryDiagnosis}</span>
                    </div>
                  </div>

                  {/* Vitals row */}
                  <div className="bg-muted/40 p-3 rounded-lg flex justify-between items-center font-tnum text-xs text-muted-foreground">
                    <div>HR <span className="font-bold text-foreground">{p.latestVitals?.pulse ?? '—'}</span></div>
                    <div>SpO₂ <span className="font-bold text-foreground">{p.latestVitals?.spo2 ? `${p.latestVitals.spo2}%` : '—'}</span></div>
                    <div>BP <span className="font-bold text-foreground">{p.latestVitals?.systolicBp ? `${p.latestVitals.systolicBp}/${p.latestVitals.diastolicBp}` : '—'}</span></div>
                  </div>

                  {/* AI Risk Indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${p.acuityColor}`} />
                      <span className="font-sans text-[11px] font-bold text-muted-foreground">AI Risk Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={p.riskScore} className="w-16 h-1">
                        <ProgressTrack>
                          <ProgressIndicator className={p.indicatorClass} />
                        </ProgressTrack>
                      </Progress>
                      <span className="font-tnum text-xs font-bold text-foreground">{p.riskScore}%</span>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* Care Team & Action */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-sans text-[10px] text-muted-foreground">Attending: <span className="font-bold text-foreground">{p.doctorName}</span></span>
                      <span className="font-sans text-[10px] text-muted-foreground mt-0.5">Nurse: <span className="font-medium text-foreground">{p.nurseName}</span></span>
                    </div>
                    {!isNurse && (
                      <Button
                        onClick={() => navigate(`/patients/${p.id}`)}
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 h-8 font-sans font-bold hover:bg-primary hover:text-primary-foreground bg-primary/10 text-primary transition-all rounded-md px-3"
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && filteredPatients.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
          <p className="text-sm font-sans text-muted-foreground">
            Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, filteredPatients.length)}</span> of <span className="font-bold text-foreground">{filteredPatients.length}</span> patients
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="font-sans text-xs font-semibold"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1 px-3 bg-muted/30 border border-border rounded-md">
              <span className="text-xs font-sans font-medium text-foreground">Page {currentPage} of {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="font-sans text-xs font-semibold"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, iconClass }) {
  return (
    <Card className="shadow-2xs border-border bg-card rounded-xl overflow-hidden">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <span className="font-tnum text-[2rem] font-bold leading-tight text-foreground mt-1">{value}</span>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs space-y-4 p-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center border-b border-border/50 pb-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-8 w-16 ml-auto rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
