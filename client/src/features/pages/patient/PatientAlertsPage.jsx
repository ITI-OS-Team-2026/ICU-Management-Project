import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { alertsService } from '../../services/alertsService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function PatientAlertsPage() {
  const { admissionId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review state
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [admissionId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsService.getAdmissionAlerts(admissionId);
      setAlerts(data.data || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert || !reviewNotes.trim()) return;

    try {
      setSubmitting(true);
      await alertsService.submitReview(selectedAlert.id, {
        review_notes: reviewNotes,
        accepted: true
      });
      setSelectedAlert(null);
      setReviewNotes('');
      fetchAlerts(); // Refresh list
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const canReview = user?.role === 'MEDICAL_RESIDENT' || user?.role === 'ICU_SPECIALIST';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">No Active Alerts</h2>
          <p className="text-muted-foreground mt-1">This patient's vital signs are currently stable.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Active Alerts</h2>
            <p className="text-muted-foreground mt-1">Automated early warning system based on NEWS2 scoring.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'P0';
            const isResolved = alert.status === 'REVIEWED' || alert.status === 'RESOLVED';
            
            return (
              <Card 
                key={alert.id} 
                className={`overflow-hidden transition-all duration-200 border-l-4 ${
                  isResolved ? 'border-l-muted opacity-70' : 
                  isCritical ? 'border-l-destructive border-destructive/20 shadow-sm shadow-destructive/10' : 
                  'border-l-warning border-warning/20'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isCritical ? (
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                      <CardTitle className="text-lg">
                        {alert.title}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={isResolved ? 'outline' : 'default'} className={
                        !isResolved && isCritical ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 
                        !isResolved && !isCritical ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''
                      }>
                        {alert.severity}
                      </Badge>
                      <Badge variant="secondary" className="font-tnum">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Generated automatically by NEWS2 Vital Signs Monitor
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {alert.triggeringMetrics && Object.entries(alert.triggeringMetrics).map(([key, data]) => {
                      if (key === 'news2_total') return null;
                      return (
                        <div key={key} className="flex flex-col">
                          <span className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="font-tnum font-medium text-foreground">{data.value}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-tnum ${
                              data.score === 3 ? 'bg-destructive/10 text-destructive' :
                              data.score === 2 ? 'bg-orange-500/10 text-orange-500' :
                              'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              +{data.score}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-col border-l border-border pl-4">
                      <span className="text-xs font-semibold text-muted-foreground">Total Score</span>
                      <span className="font-tnum font-bold text-xl text-foreground mt-0.5">
                        {alert.triggeringMetrics?.news2_total || '?'}
                      </span>
                    </div>
                  </div>

                  {alert.reviews && alert.reviews.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clinical Reviews</h4>
                      {alert.reviews.map(review => (
                        <div key={review.id} className="bg-muted/30 rounded-md p-3 border border-border/50">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-foreground">
                              {review.reviewer?.role === 'ICU_NURSE' ? 'Nurse' : 'Dr.'} {review.reviewer?.firstName} {review.reviewer?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-tnum">
                              {new Date(review.reviewedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">
                            {review.reviewNotes}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-muted/20 border-t border-border/50 pt-4 pb-4">
                  <div className="w-full flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Status: <strong className="text-foreground capitalize">{alert.status.toLowerCase()}</strong>
                    </div>
                    
                    {!isResolved && (
                      <Dialog open={selectedAlert?.id === alert.id} onOpenChange={(open) => !open && setSelectedAlert(null)}>
                        <DialogTrigger render={
                          <Button 
                            variant={isCritical ? 'destructive' : 'default'}
                            size="sm"
                            disabled={!canReview}
                            onClick={() => setSelectedAlert(alert)}
                          >
                            {canReview ? 'Review & Acknowledge' : 'View Only (Requires Doctor)'}
                          </Button>
                        } />
                        
                        {selectedAlert?.id === alert.id && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Alert</DialogTitle>
                              <DialogDescription>
                                Acknowledge this alert and add clinical notes. This action will mark the alert as REVIEWED.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <form onSubmit={handleReviewSubmit} className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Clinical Notes / Intervention</label>
                                <textarea 
                                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Patient given oxygen... BP stabilized..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setSelectedAlert(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={submitting || !reviewNotes.trim()}>
                                  {submitting ? 'Submitting...' : 'Submit Review'}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        )}
                      </Dialog>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
