import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { passwordResetRequestService } from '../services/passwordResetRequestService';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  MessageSquarePlus,
  Inbox,
  Clock,
  CheckCircle2,
  KeyRound,
  Send,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ROLE_LABEL = {
  SYSTEM_ADMIN: 'System Admin',
  ICU_NURSE: 'ICU Nurse',
  MEDICAL_RESIDENT: 'Medical Resident',
  ICU_SPECIALIST: 'ICU Specialist',
};

// ── User request card (shown in non-admin inbox) ──────────────────────────────
function RequestCard({ request, isNew }) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${isNew ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {request.status === 'PENDING'
            ? <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
          <span className="font-sans text-sm font-semibold text-foreground">
            {request.status === 'PENDING' ? 'Awaiting Admin Response' : 'Admin Replied'}
          </span>
          {isNew && (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">New</span>
          )}
        </div>
        <span className="font-sans text-xs text-muted-foreground shrink-0">{formatDate(request.createdAt)}</span>
      </div>

      {request.message && (
        <div className="bg-muted/40 rounded-md px-3 py-2">
          <p className="font-sans text-xs text-muted-foreground font-medium mb-1">Your message:</p>
          <p className="font-sans text-sm text-foreground">{request.message}</p>
        </div>
      )}

      {request.status === 'RESOLVED' && request.adminReply && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
            <p className="font-sans text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              Temporary password from {request.resolvedByName || 'Admin'}:
            </p>
          </div>
          <p className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
            {request.adminReply}
          </p>
          <p className="font-sans text-xs text-emerald-600 dark:text-emerald-500 mt-1.5">
            Use this to log in, then change it in this Settings page immediately.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Admin inbox card (shown only to admins) ───────────────────────────────────
function AdminRequestCard({ req, activeReplyId, setActiveReplyId, replyText, setReplyText, isReplying, replyStatus, onReply }) {
  return (
    <div className="p-5 space-y-3 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${req.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">
              {req.requester.first_name} {req.requester.last_name}
              <span className="ml-2 font-normal text-muted-foreground text-xs">{req.requester.email}</span>
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              {ROLE_LABEL[req.requester.role] || req.requester.role} · {formatDateShort(req.createdAt)}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {req.status}
        </span>
      </div>

      {req.message && (
        <div className="ml-5 bg-muted/30 rounded-md px-3 py-2">
          <p className="font-sans text-xs text-muted-foreground mb-0.5">Message:</p>
          <p className="font-sans text-sm text-foreground">{req.message}</p>
        </div>
      )}

      {req.status === 'RESOLVED' && req.adminReply && (
        <div className="ml-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
          <p className="font-sans text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-0.5">Temp password sent:</p>
          <p className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-300">{req.adminReply}</p>
          <p className="font-sans text-xs text-emerald-600 mt-1">
            Resolved by {req.resolvedByName} · {formatDateShort(req.resolvedAt)}
          </p>
        </div>
      )}

      {req.status === 'PENDING' && (
        <div className="ml-5">
          {activeReplyId === req.id ? (
            <div className="space-y-2">
              {replyStatus.id === req.id && replyStatus.message && (
                <p className={`font-sans text-xs ${replyStatus.type === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
                  {replyStatus.message}
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Enter new temporary password..."
                  className="font-sans text-sm h-9 flex-1"
                />
                <Button size="sm" className="gap-1.5 h-9 bg-primary" disabled={isReplying || !replyText.trim()} onClick={() => onReply(req.id)}>
                  <Send className="h-3.5 w-3.5" />
                  {isReplying ? 'Sending...' : 'Send'}
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => { setActiveReplyId(null); setReplyText(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs font-sans gap-1.5" onClick={() => { setActiveReplyId(req.id); setReplyText(''); }}>
              <KeyRound className="h-3.5 w-3.5" />
              Reply with Temp Password
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SYSTEM_ADMIN';

  // ── Change-password ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwStatus, setPwStatus] = useState({ type: '', message: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showForgotSection, setShowForgotSection] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwStatus({ type: '', message: '' });
    if (formData.newPassword !== formData.confirmPassword) {
      setPwStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (formData.newPassword.length < 6) {
      setPwStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }
    try {
      setIsUpdating(true);
      await authService.changePassword({ currentPassword: formData.currentPassword, newPassword: formData.newPassword });
      setPwStatus({ type: 'success', message: 'Your password has been successfully updated.' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPwStatus({ type: 'error', message: error?.response?.data?.message || 'Failed to update password. Please try again.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Non-admin: send request ──────────────────────────────────────────────
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState({ type: '', message: '' });

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setRequestStatus({ type: '', message: '' });
    try {
      setIsSubmittingRequest(true);
      await passwordResetRequestService.createRequest(requestMessage);
      setRequestStatus({ type: 'success', message: 'Request sent! Check your inbox below for the admin reply.' });
      setRequestMessage('');
      fetchMyRequests();
    } catch (error) {
      setRequestStatus({ type: 'error', message: error?.response?.data?.message || 'Failed to send request.' });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // ── Non-admin: own requests inbox ────────────────────────────────────────
  const [myRequests, setMyRequests] = useState([]);
  const [isLoadingMyRequests, setIsLoadingMyRequests] = useState(true);

  const fetchMyRequests = useCallback(async () => {
    try {
      setIsLoadingMyRequests(true);
      const data = await passwordResetRequestService.getMyRequests();
      setMyRequests(data);
      const hasUnseen = data.some((r) => r.status === 'RESOLVED' && !r.seenByUser);
      if (hasUnseen) await passwordResetRequestService.markSeen();
    } catch { /* silently fail */ }
    finally { setIsLoadingMyRequests(false); }
  }, []);

  // ── Admin: all requests inbox ────────────────────────────────────────────
  const [allRequests, setAllRequests] = useState([]);
  const [isLoadingAllRequests, setIsLoadingAllRequests] = useState(true);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState({ id: null, type: '', message: '' });

  const fetchAllRequests = useCallback(async () => {
    try {
      setIsLoadingAllRequests(true);
      const data = await passwordResetRequestService.getAllRequests();
      setAllRequests(data);
    } catch { /* silently fail */ }
    finally { setIsLoadingAllRequests(false); }
  }, []);

  const handleReply = async (requestId) => {
    if (!replyText.trim()) return;
    setReplyStatus({ id: requestId, type: '', message: '' });
    try {
      setIsReplying(true);
      await passwordResetRequestService.resolveRequest(requestId, replyText);
      setReplyStatus({ id: requestId, type: 'success', message: 'Reply sent!' });
      setReplyText('');
      setActiveReplyId(null);
      fetchAllRequests();
    } catch (err) {
      setReplyStatus({ id: requestId, type: 'error', message: err.response?.data?.message || 'Failed to send reply.' });
    } finally {
      setIsReplying(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAllRequests();
    else fetchMyRequests();
  }, [isAdmin, fetchAllRequests, fetchMyRequests]);

  const hasPending = myRequests.some((r) => r.status === 'PENDING');
  const pendingCount = allRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 bg-muted/20 min-h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="text-center space-y-2 pt-4">
        <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h1 className="font-display text-3xl text-foreground font-bold">Security Settings</h1>
        <p className="font-sans text-sm text-muted-foreground">Manage your account password and security options.</p>
      </div>

      {/* ── Change Password ─────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
          <CardTitle className="font-sans text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <form onSubmit={handlePasswordSubmit}>
          <CardContent className="space-y-5 pt-6">
            {pwStatus.message && (
              <Alert
                variant={pwStatus.type === 'error' ? 'destructive' : 'default'}
                className={pwStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : ''}
              >
                {pwStatus.type === 'error' && <AlertCircle className="h-4 w-4" />}
                {pwStatus.type === 'success' && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                <AlertDescription className="font-sans text-xs font-medium ml-1">{pwStatus.message}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="font-sans text-xs font-semibold">Current Password</Label>
              <Input id="currentPassword" type="password" required value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="font-sans text-sm" placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="font-sans text-xs font-semibold">New Password</Label>
              <Input id="newPassword" type="password" required value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="font-sans text-sm" placeholder="At least 6 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-sans text-xs font-semibold">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" required value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="font-sans text-sm" placeholder="Type new password again" />
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-6 border-t border-border/50 bg-muted/10 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6">
            {/* Only non-admins see the "forgot password" link */}
            {!isAdmin ? (
              <button type="button" onClick={() => setShowForgotSection((p) => !p)}
                className="font-sans text-xs text-primary hover:underline cursor-pointer bg-transparent border-none p-0">
                Forgot your current password? Request a reset →
              </button>
            ) : <div />}
            <Button type="submit" disabled={isUpdating} className="font-sans font-semibold bg-primary w-full sm:w-auto">
              {isUpdating ? 'Updating...' : 'Update Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* ── Non-admin: Forgot Password Request form ─────────────────── */}
      {!isAdmin && showForgotSection && (
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <CardTitle className="font-sans text-sm font-semibold flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-amber-500" />
              Request Password Reset from Admin
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSendRequest}>
            <CardContent className="space-y-4 pt-6">
              {requestStatus.message && (
                <Alert variant={requestStatus.type === 'error' ? 'destructive' : 'default'}
                  className={requestStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : ''}>
                  <AlertDescription className="font-sans text-xs font-medium">{requestStatus.message}</AlertDescription>
                </Alert>
              )}
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Send a message to the System Administrator. They will reset it and provide a temporary password below.
              </p>
              {hasPending && (
                <Alert className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="font-sans text-xs font-medium ml-1">
                    You already have a pending request. Wait for the admin to respond before sending another.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="requestMessage" className="font-sans text-xs font-semibold">Message (optional)</Label>
                <Textarea id="requestMessage" value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)}
                  className="font-sans text-sm resize-none" rows={3}
                  placeholder="e.g. I forgot my password..." disabled={hasPending} />
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-6 border-t border-border/50 bg-muted/10 mt-2 px-6 flex justify-end">
              <Button type="submit" disabled={isSubmittingRequest || hasPending} className="font-sans font-semibold gap-2">
                <Send className="h-4 w-4" />
                {isSubmittingRequest ? 'Sending...' : 'Send Request to Admin'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* ── Non-admin: Personal Inbox ───────────────────────────────── */}
      {!isAdmin && (
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <CardTitle className="font-sans text-sm font-semibold flex items-center gap-2">
                <Inbox className="w-4 h-4 text-primary" />
                Password Reset Inbox
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={fetchMyRequests}>Refresh</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            {isLoadingMyRequests ? (
              <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-sans text-sm">No requests yet.</p>
                <p className="font-sans text-xs mt-1">Use the "Forgot your password?" link above to contact the admin.</p>
              </div>
            ) : (
              myRequests.map((req) => (
                <RequestCard key={req.id} request={req} isNew={req.status === 'RESOLVED' && !req.seenByUser} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Admin: All Requests Inbox ───────────────────────────────── */}
      {isAdmin && (
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="font-sans text-sm font-semibold flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-primary" />
                  Password Reset Requests
                </CardTitle>
                {pendingCount > 0 && (
                  <div className="flex items-center ml-1 gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                    </span>
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      {pendingCount} Pending
                    </span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={fetchAllRequests}>Refresh</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingAllRequests ? (
              <div className="p-6 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />)}
              </div>
            ) : allRequests.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-sans text-sm">No password reset requests yet.</p>
              </div>
            ) : (
              allRequests.map((req) => (
                <AdminRequestCard
                  key={req.id}
                  req={req}
                  activeReplyId={activeReplyId}
                  setActiveReplyId={setActiveReplyId}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  isReplying={isReplying}
                  replyStatus={replyStatus}
                  onReply={handleReply}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
