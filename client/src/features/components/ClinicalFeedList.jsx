import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';

export function ClinicalFeedList({ isLoading, activities, emptyTitle, emptyDesc }) {
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
      <div className="flex flex-col py-8 px-6 text-center items-center justify-center h-full min-h-[150px]">
        <span className="text-sm font-sans font-medium text-foreground">{emptyTitle}</span>
        <span className="text-xs font-sans text-muted-foreground mt-1 text-balance leading-relaxed max-w-[200px]">
          {emptyDesc}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 gap-1">
      {activities.map((act, idx) => (
        <Dialog key={idx}>
          <DialogTrigger
            render={
              <button className="flex w-full text-left gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${act.dotColor}`} />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-sans text-xs font-bold text-foreground truncate">
                    {act.title}
                  </span>
                  <span className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
                    {act.desc}
                  </span>
                </div>
                <span className="font-tnum text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap ml-2">
                  {act.time}
                </span>
              </button>
            }
          />
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">{act.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="text-sm font-sans flex items-center gap-2">
                <span className="font-semibold text-foreground">Action:</span>
                <span className="text-muted-foreground">{act.desc}</span>
              </div>
              <ObjectDiffView oldValues={act.oldValues} newValues={act.newValues} />
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}

function ObjectDiffView({ oldValues, newValues }) {
  if (!oldValues && !newValues) return null;
  
  const formatVal = (v) => typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? 'none');
  
  const ignoredKeys = ['id', 'createdAt', 'updatedAt', 'isArchived', 'archivedAt'];
  const shouldShowKey = (key) => {
    if (ignoredKeys.includes(key)) return false;
    if (key.endsWith('Id')) return false; // Ignore foreign keys like patientId, admissionId
    return true;
  };
  
  // If no oldValues (e.g. CREATE), just list the new values cleanly
  if (!oldValues || Object.keys(oldValues).length === 0) {
    const visibleEntries = Object.entries(newValues || {}).filter(([key]) => shouldShowKey(key));
    
    if (visibleEntries.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Values</span>
        <div className="bg-muted p-3 rounded-md border border-border space-y-1.5 max-h-[250px] overflow-auto">
          {visibleEntries.map(([key, val]) => (
             <div key={key} className="text-xs font-sans grid grid-cols-3 gap-2 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
               <span className="font-semibold text-muted-foreground">{key}</span>
               <span className="col-span-2 text-foreground font-mono break-all">{formatVal(val)}</span>
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
      <div className="bg-muted p-3 rounded-md border border-border space-y-3 max-h-[250px] overflow-auto">
        {changedKeys.map(key => (
          <div key={key} className="text-xs font-sans flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="font-semibold text-foreground">{key}</span>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
               <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded line-through break-all">{formatVal(oldValues[key])}</span>
               <span className="text-muted-foreground">→</span>
               <span className="text-status-available bg-status-available/10 px-1.5 py-0.5 rounded break-all">{formatVal(newValues[key])}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
