import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Activity, StickyNote, Send } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { dashboardService } from '../../services/dashboardService';
import { patientsService } from '../../services/patientsService';

const formatRelativeTime = (timestamp) => {
  const now = new Date().getTime();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

function TimelineDiffView({ oldValues, newValues }) {
  if (!oldValues && !newValues) return null;
  
  const formatVal = (v) => typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? 'none');
  
  const ignoredKeys = ['id', 'createdAt', 'updatedAt', 'isArchived', 'archivedAt'];
  const shouldShowKey = (key) => {
    if (ignoredKeys.includes(key)) return false;
    if (key.endsWith('Id')) return false; // Ignore foreign keys
    return true;
  };
  
  // If no oldValues (e.g. CREATE)
  if (!oldValues || Object.keys(oldValues).length === 0) {
    const visibleEntries = Object.entries(newValues || {}).filter(([key]) => shouldShowKey(key));
    if (visibleEntries.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Values</span>
        <div className="bg-muted p-3 rounded-md border border-border space-y-1.5 max-h-[300px] overflow-auto">
          {visibleEntries.map(([key, val]) => (
             <div key={key} className="text-xs font-sans flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
               <span className="font-semibold text-muted-foreground">{key}</span>
               <span className="sm:col-span-2 text-foreground font-mono font-tnum break-all">{formatVal(val)}</span>
             </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Compute diff
  const allKeys = Array.from(new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]));
  const changedKeys = allKeys.filter(key => 
    shouldShowKey(key) && JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
  );
  
  if (changedKeys.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">No visible fields changed.</div>
    );
  }
  
  return (
    <div className="space-y-2">
      <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Changes</span>
      <div className="bg-muted p-3 rounded-md border border-border space-y-3 max-h-[300px] overflow-auto">
        {changedKeys.map(key => (
          <div key={key} className="text-xs font-sans flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="font-semibold text-foreground">{key}</span>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 text-[11px] font-mono font-tnum">
               <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded line-through break-all w-full sm:w-auto">{formatVal(oldValues[key])}</span>
               <span className="text-muted-foreground hidden sm:inline-block shrink-0">→</span>
               <span className="text-status-available bg-status-available/10 px-1.5 py-0.5 rounded break-all w-full sm:w-auto">{formatVal(newValues[key])}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineFeed({ isLoading, activities }) {
  if (isLoading) {
    return (
      <div className="flex flex-col p-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex gap-3 p-3">
            <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col py-12 px-6 text-center items-center justify-center h-full min-h-[200px]">
        <span className="text-sm font-sans font-medium text-foreground">No timeline events</span>
        <span className="text-xs font-sans text-muted-foreground mt-1 text-balance leading-relaxed max-w-[200px]">
          No clinical events have been recorded for this patient yet.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 gap-1">
      {activities.map((act) => (
        <Dialog key={act.id}>
          <DialogTrigger
            render={
              <button className="flex w-full text-left items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${act.dotColor}`} />
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <span className="font-sans text-xs font-bold text-foreground truncate">
                    {act.title}
                  </span>
                  <span className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
                    {act.desc}
                  </span>
                </div>
                <span className="font-tnum text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap">
                  {act.time}
                </span>
              </button>
            }
          />
          <DialogContent className="max-w-[90vw] sm:max-w-lg w-full p-4 sm:p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="shrink-0 text-left">
              <DialogTitle className="font-display text-lg sm:text-xl pr-6 leading-tight">{act.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 overflow-y-auto flex-1 min-h-0 pr-1">
              <div className="text-xs sm:text-sm font-sans flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-semibold text-foreground">Action:</span>
                <span className="text-muted-foreground break-words">{act.desc}</span>
              </div>
              <TimelineDiffView oldValues={act.oldValues} newValues={act.newValues} />
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}

export default function PatientTimelinePage() {
  const { admissionId } = useParams();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!admissionId) return;
    try {
      setIsLoading(true);
      const clinicalLogs = await dashboardService.getClinicalLogs(admissionId);
      
      const gatheredActivities = clinicalLogs.map((log) => {
        let dotColor = 'bg-status-available';
        if (log.action === 'ARCHIVE') dotColor = 'bg-destructive';
        else if (log.action === 'UPDATE') dotColor = 'bg-status-maintenance';
        
        if (log.targetTable === 'Medication') dotColor = 'bg-primary';
        if (log.targetTable === 'MedicationAdministration') dotColor = 'bg-status-available';
        if (log.targetTable === 'ClinicalNote' || log.targetTable === 'NursingNote') dotColor = 'bg-muted-foreground';
        if (log.targetTable === 'Diagnosis') dotColor = 'bg-status-occupied';
        if (log.targetTable === 'LabResult' || log.targetTable === 'InvestigationOrder') dotColor = 'bg-status-reserved';

        const type = log.targetTable.toLowerCase();
        
        let title = `${log.targetTable} ${log.action.toLowerCase()}d`;
        if (log.targetTable === 'VitalSign') title = `Vitals ${log.action.toLowerCase()}d`;
        if (log.targetTable === 'MedicationAdministration') title = `Medication Administered`;
        if (log.targetTable === 'ClinicalNote') title = `Clinical Note ${log.action.toLowerCase()}d`;
        if (log.targetTable === 'NursingNote') title = `Nursing Note ${log.action.toLowerCase()}d`;
        
        let desc = `By ${log.user?.name || 'System'}`;
        if (log.targetTable === 'Medication' && log.newValues?.drugName) {
          desc += ` — ${log.newValues.drugName}`;
        }
        if (log.targetTable === 'ClinicalNote' && log.newValues?.content) {
          desc += ` — ${log.newValues.content.substring(0, 50)}${log.newValues.content.length > 50 ? '...' : ''}`;
        }
        if (log.targetTable === 'NursingNote' && log.newValues?.note) {
          desc += ` — ${log.newValues.note.substring(0, 50)}${log.newValues.note.length > 50 ? '...' : ''}`;
        }
        
        return {
          id: log.id,
          rawType: type, // keep original for filtering
          type: type === 'vitalsign' ? 'vitals' : type,
          severity: ['critical', 'warning'].includes(type) ? 'critical' : 'info',
          title,
          desc,
          dotColor,
          timestamp: new Date(log.createdAt).getTime(),
          oldValues: log.oldValues,
          newValues: log.newValues,
        };
      });

      const sortedActivities = gatheredActivities
        .filter((act) => !Number.isNaN(act.timestamp))
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((act) => ({ ...act, time: formatRelativeTime(act.timestamp) }));

      setActivities(sortedActivities);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setIsLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Calculate some stats for the panel
  const totalEvents = activities.length;
  const eventsLast24h = activities.filter(act => (new Date().getTime() - act.timestamp) < 24 * 60 * 60 * 1000).length;
  const criticalEvents = activities.filter(act => act.severity === 'critical').length;
  
  const handlePostNote = async () => {
    if (!noteContent.trim() || isPostingNote) return;
    try {
      setIsPostingNote(true);
      await patientsService.createClinicalNote(admissionId, noteContent);
      setNoteContent('');
      await fetchTimeline(); // Refresh feed
    } catch (err) {
      console.error('Failed to post note:', err);
    } finally {
      setIsPostingNote(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4 p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          Patient Timeline
        </h1>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        
        {/* Timeline Feed - 8 cols */}
        <div className="lg:col-span-8 flex flex-col h-[500px] shrink-0 lg:h-full">
          <Card className="flex-1 border-border shadow-2xs bg-card overflow-hidden min-h-0 flex flex-col">
            <ScrollArea className="h-full w-full">
              <div className="p-1 sm:p-2">
                <TimelineFeed 
                  isLoading={isLoading}
                  activities={activities}
                />
              </div>
            </ScrollArea>
          </Card>
        </div>
        
        {/* Analytics & Filters Panel - 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-6 shrink-0 lg:h-full lg:overflow-y-auto lg:pr-1 pb-6 lg:pb-0">
          
          <Card className="shadow-2xs border-border bg-card shrink-0">
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Stats</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total Events</span>
                <span className="font-tnum text-xl font-bold">{totalEvents}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Last 24h</span>
                <span className="font-tnum text-xl font-bold">{eventsLast24h}</span>
              </div>
            </div>
          </Card>

          <Card className="shadow-2xs border-border bg-card flex flex-col shrink-0 min-h-[250px]">
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Note</h2>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              <Textarea 
                placeholder="Type a clinical note to add to the timeline..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="flex-1 min-h-[100px] resize-none text-sm font-sans"
              />
              <Button 
                onClick={handlePostNote} 
                disabled={isPostingNote || !noteContent.trim()}
                className="w-full flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isPostingNote ? 'Posting...' : 'Post Note'}
              </Button>
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
