import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  CheckCircle2, 
  ShieldAlert, 
  Shield, 
  Upload, 
  Download, 
  UserPlus, 
  Search,
  MoreHorizontal,
  Inbox,
  Clock,
  KeyRound,
  Send,
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { passwordResetRequestService } from '../services/passwordResetRequestService';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminUsersPage() {
  // Hardcode initial filters for visual matching with mockup
  // Hardcode initial filters for visual matching with mockup
  const { users, stats, filters, setFilters, isLoading, error, createUser, updateUser, resetPassword } = useUsers({
    role: '',
    status: '',
    search: ''
  });

  const [searchInput, setSearchInput] = useState('');
  
  // Password Reset state
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState({ type: '', message: '' });

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetStatus({ type: '', message: '' });
    
    if (resetPasswordInput.length < 6) {
      setResetStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setIsResetting(true);
      await resetPassword(selectedUserForReset.id, resetPasswordInput);
      setResetStatus({ type: 'success', message: 'Password reset successfully!' });
      setTimeout(() => {
        setSelectedUserForReset(null);
        setResetPasswordInput('');
        setResetStatus({ type: '', message: '' });
      }, 2000);
    } catch (err) {
      setResetStatus({ type: 'error', message: err.response?.data?.message || 'Failed to reset password.' });
    } finally {
      setIsResetting(false);
    }
  };

  // ── Password Reset Requests Inbox ──────────────────────────────────────────
  const [resetRequests, setResetRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState({ id: null, type: '', message: '' });

  const fetchResetRequests = useCallback(async () => {
    try {
      setIsLoadingRequests(true);
      const data = await passwordResetRequestService.getAllRequests();
      setResetRequests(data);
    } catch {
      // silently fail
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchResetRequests();
  }, [fetchResetRequests]);

  const handleReply = async (requestId) => {
    if (!replyText.trim()) return;
    setReplyStatus({ id: requestId, type: '', message: '' });
    try {
      setIsReplying(true);
      await passwordResetRequestService.resolveRequest(requestId, replyText);
      setReplyStatus({ id: requestId, type: 'success', message: 'Reply sent successfully!' });
      setReplyText('');
      setActiveReplyId(null);
      fetchResetRequests();
    } catch (err) {
      setReplyStatus({ id: requestId, type: 'error', message: err.response?.data?.message || 'Failed to send reply.' });
    } finally {
      setIsReplying(false);
    }
  };

  const pendingCount = resetRequests.filter((r) => r.status === 'PENDING').length;
  
  // Add User modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'resident'
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      setIsSubmitting(true);
      await createUser(formData);
      setIsAddOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', password: '', role: 'resident' });
    } catch (err) {
      setAddError(err.response?.data?.message || err.message || 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle search submit (e.g. on enter or blur)
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Mock roles for the filter bar
  const roles = [
    { label: 'All', value: '' },
    { label: 'Medical Resident', value: 'MEDICAL_RESIDENT' },
    { label: 'ICU Nurse', value: 'ICU_NURSE' },
    { label: 'Specialist', value: 'ICU_SPECIALIST' },
    { label: 'Administrator', value: 'SYSTEM_ADMIN' }
  ];

  const statuses = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' }
  ];

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 bg-muted/20 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-2">
            Administration <span className="mx-1">&gt;</span> <span className="text-foreground font-medium">User Management</span>
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-1">User Management</h1>
          <p className="font-sans text-muted-foreground text-sm">
            Manage team accounts, roles, and access permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className={buttonVariants({ className: "font-sans bg-primary text-primary-foreground hover:bg-primary/90" })}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-sans">Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
                {addError && (
                  <div className="bg-destructive/10 text-destructive text-sm font-sans p-3 rounded-md border border-destructive/20">
                    {addError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="font-sans text-xs font-semibold">First Name</Label>
                    <Input 
                      id="first_name" 
                      required 
                      value={formData.first_name} 
                      onChange={e => setFormData({...formData, first_name: e.target.value})} 
                      className="font-sans text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="font-sans text-xs font-semibold">Last Name</Label>
                    <Input 
                      id="last_name" 
                      required 
                      value={formData.last_name} 
                      onChange={e => setFormData({...formData, last_name: e.target.value})} 
                      className="font-sans text-sm" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-sans text-xs font-semibold">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="font-sans text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-sans text-xs font-semibold">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    className="font-sans text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="font-sans text-xs font-semibold">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(val) => setFormData({...formData, role: val})}
                  >
                    <SelectTrigger className="w-full font-sans text-sm h-9">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="font-sans">Administrator</SelectItem>
                      <SelectItem value="nurse" className="font-sans">ICU Nurse</SelectItem>
                      <SelectItem value="resident" className="font-sans">Medical Resident</SelectItem>
                      <SelectItem value="specialist" className="font-sans">Specialist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="font-sans">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="font-sans bg-primary">
                    {isSubmitting ? 'Saving...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="h-5 w-5 text-purple-600" />} 
          iconBg="bg-purple-100"
          title="Total Users" 
          value={stats?.total ?? <Skeleton className="h-8 w-12" />} 
        />
        <StatCard 
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} 
          iconBg="bg-green-100"
          title="Active" 
          value={stats?.active ?? <Skeleton className="h-8 w-12" />} 
        />
        <StatCard 
          icon={<ShieldAlert className="h-5 w-5 text-red-600" />} 
          iconBg="bg-red-100"
          title="Suspended" 
          value={stats?.suspended ?? <Skeleton className="h-8 w-12" />} 
        />
        <StatCard 
          icon={<Shield className="h-5 w-5 text-orange-500" />} 
          iconBg="bg-orange-100"
          title="Pending 2FA" 
          value={stats?.pending2FA ?? <Skeleton className="h-8 w-12" />} 
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 px-1 scrollbar-none whitespace-nowrap">
        <div className="relative w-[280px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-9 bg-background border-border rounded-full font-sans"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
            onBlur={() => setFilters(prev => ({ ...prev, search: searchInput }))}
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-full border border-border/50 shrink-0">
          {roles.map(r => (
            <Button
              key={r.label}
              variant={filters.role === r.value ? "default" : "ghost"}
              className={`rounded-full h-8 px-4 text-[13px] font-sans transition-colors ${filters.role === r.value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              onClick={() => setFilters(prev => ({ ...prev, role: r.value }))}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-full border border-border/50 shrink-0">
          {statuses.map(s => (
            <Button
              key={s.label}
              variant={filters.status === s.value ? "default" : "ghost"}
              className={`rounded-full h-8 px-4 text-[13px] font-sans transition-colors ${filters.status === s.value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              onClick={() => setFilters(prev => ({ ...prev, status: s.value }))}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-background rounded-xl shadow-sm border border-border overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive font-sans">Error: {error}</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b-border">
                <TableHead className="font-sans font-semibold text-muted-foreground uppercase text-[11px] tracking-wider h-11 pl-6">User</TableHead>
                <TableHead className="font-sans font-semibold text-muted-foreground uppercase text-[11px] tracking-wider h-11">Role</TableHead>
                <TableHead className="font-sans font-semibold text-muted-foreground uppercase text-[11px] tracking-wider h-11">Status</TableHead>
                <TableHead className="font-sans font-semibold text-muted-foreground uppercase text-[11px] tracking-wider h-11">Last Active</TableHead>
                <TableHead className="font-sans font-semibold text-muted-foreground uppercase text-[11px] tracking-wider h-11 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b-border/50">
                    <TableCell className="pl-6"><Skeleton className="h-10 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  </TableRow>
                ))
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center font-sans text-muted-foreground">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((user) => (
                  <TableRow key={user.id} className="border-b-border/50 hover:bg-muted/20">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3 py-1">
                        <Avatar className="h-9 w-9 bg-primary/10">
                          <AvatarFallback className="bg-primary/10 text-primary font-sans font-medium text-xs">
                            {getInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-sans font-semibold text-sm text-foreground">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="font-sans text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-sans text-sm font-medium text-foreground">
                      {formatRole(user.role)}
                    </TableCell>

                    <TableCell>
                      <StatusDisplay status={user.status} />
                    </TableCell>

                    <TableCell className="font-sans text-xs text-muted-foreground">
                      {formatTimeAgo(user.lastLogin)}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" className="h-8 w-8 p-0" />
                        }>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-sans">
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => setSelectedUserForReset(user)}
                          >
                            Reset Password
                          </DropdownMenuItem>
                          {user.status === 'ACTIVE' ? (
                            <DropdownMenuItem 
                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
                              onClick={() => updateUser(user.id, { status: 'INACTIVE' })}
                            >
                              Deactivate User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-emerald-600 focus:bg-emerald-600 focus:text-emerald-50 cursor-pointer"
                              onClick={() => updateUser(user.id, { status: 'ACTIVE' })}
                            >
                              Activate User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Reset Password Modal */}
      <Dialog 
        open={!!selectedUserForReset} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedUserForReset(null);
            setResetPasswordInput('');
            setResetStatus({ type: '', message: '' });
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-sans">Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-4">
            {resetStatus.message && (
              <div className={`text-sm font-sans p-3 rounded-md border ${resetStatus.type === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {resetStatus.message}
              </div>
            )}
            <p className="font-sans text-sm text-muted-foreground">
              Enter a new temporary password for <strong>{selectedUserForReset?.first_name} {selectedUserForReset?.last_name}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="newTempPassword" className="font-sans text-xs font-semibold">New Password</Label>
              <Input 
                id="newTempPassword" 
                type="text" 
                required 
                value={resetPasswordInput} 
                onChange={e => setResetPasswordInput(e.target.value)} 
                className="font-sans text-sm" 
                placeholder="Must be at least 6 characters"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setSelectedUserForReset(null)} className="font-sans">
                Cancel
              </Button>
              <Button type="submit" disabled={isResetting || resetStatus.type === 'success'} className="font-sans bg-primary">
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Password Reset Requests Inbox ──────────────────────────── */}
      <div className="bg-background rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h2 className="font-sans text-base font-semibold text-foreground">Password Reset Requests</h2>
            {pendingCount > 0 && (
              <span className="h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {pendingCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={fetchResetRequests}
            className="font-sans text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="divide-y divide-border">
          {isLoadingRequests ? (
            <div className="p-6 space-y-3">
              {[1,2].map(i => <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />)}
            </div>
          ) : resetRequests.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-sans text-sm">No password reset requests yet.</p>
            </div>
          ) : (
            resetRequests.map((req) => (
              <div key={req.id} className="p-5 space-y-3">
                {/* Request header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${req.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div>
                      <p className="font-sans text-sm font-semibold text-foreground">
                        {req.requester.first_name} {req.requester.last_name}
                        <span className="ml-2 font-normal text-muted-foreground text-xs">{req.requester.email}</span>
                      </p>
                      <p className="font-sans text-xs text-muted-foreground">
                        {formatRole(req.requester.role)} · {formatDateShort(req.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {req.status}
                  </span>
                </div>

                {/* User message */}
                {req.message && (
                  <div className="ml-5 bg-muted/30 rounded-md px-3 py-2">
                    <p className="font-sans text-xs text-muted-foreground mb-0.5">Message:</p>
                    <p className="font-sans text-sm text-foreground">{req.message}</p>
                  </div>
                )}

                {/* Admin reply */}
                {req.status === 'RESOLVED' && req.adminReply && (
                  <div className="ml-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
                    <p className="font-sans text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-0.5">Temp password sent:</p>
                    <p className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-300">{req.adminReply}</p>
                    <p className="font-sans text-xs text-emerald-600 mt-1">Resolved by {req.resolvedByName} · {formatDateShort(req.resolvedAt)}</p>
                  </div>
                )}

                {/* Reply form (only for pending) */}
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
                          <Button
                            size="sm"
                            className="gap-1.5 h-9 bg-primary"
                            disabled={isReplying || !replyText.trim()}
                            onClick={() => handleReply(req.id)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {isReplying ? 'Sending...' : 'Send'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9"
                            onClick={() => { setActiveReplyId(null); setReplyText(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-sans gap-1.5"
                        onClick={() => { setActiveReplyId(req.id); setReplyText(''); }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reply with Temp Password
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Helper components & functions

function StatCard({ title, value, icon, iconBg }) {
  return (
    <Card className="border-none shadow-sm bg-background">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex items-center justify-center h-12 w-12 rounded-full ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="font-sans text-xs text-muted-foreground font-medium mb-1">{title}</p>
          <div className="font-display text-2xl font-semibold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDisplay({ status }) {
  const isOk = status === 'ACTIVE';
  const colorClass = isOk ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50';
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colorClass}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
      <span className="font-sans text-xs font-semibold capitalize tracking-wide">
        {status?.toLowerCase()}
      </span>
    </div>
  );
}

function formatRole(roleStr) {
  if (!roleStr) return '';
  const map = {
    'SYSTEM_ADMIN': 'Administrator',
    'ICU_PHYSICIAN': 'ICU Physician',
    'ICU_NURSE': 'ICU Nurse',
    'ICU_SPECIALIST': 'Specialist',
    'MEDICAL_RESIDENT': 'Medical Resident',
    'SUPPORT': 'Support'
  };
  return map[roleStr] || roleStr.replace('_', ' ');
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
