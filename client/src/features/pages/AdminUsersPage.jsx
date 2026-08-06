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
import { useAuthStore } from '../store/authStore';

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
  const currentUser = useAuthStore((state) => state.user);
  
  const { users, stats, meta, filters, setFilters, isLoading, error, createUser, updateUser } = useUsers({
    role: '',
    status: '',
    search: '',
    page: 1,
    limit: 10
  });

  const [searchInput, setSearchInput] = useState('');

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
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
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
    { label: 'Inactive', value: 'INACTIVE' }
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
        <div className="flex items-center justify-end gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          icon={<Shield className="h-5 w-5 text-gray-500" />} 
          iconBg="bg-gray-100"
          title="Inactive" 
          value={stats?.inactive ?? <Skeleton className="h-8 w-12" />} 
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-2 px-1">
        <div className="relative w-full sm:w-[280px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-9 bg-background border-border rounded-full font-sans"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
            onBlur={() => setFilters(prev => ({ ...prev, search: searchInput, page: 1 }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 min-w-0 w-full sm:w-auto">
          {/* Role Filters */}
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-full border border-border/50 max-w-full overflow-x-auto scrollbar-none">
            {roles.map(r => (
              <Button
                key={r.label}
                variant={filters.role === r.value ? "default" : "ghost"}
                className={`rounded-full h-8 px-4 text-[13px] font-sans transition-colors shrink-0 ${filters.role === r.value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                onClick={() => setFilters(prev => ({ ...prev, role: r.value, page: 1 }))}
              >
                {r.label}
              </Button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-full border border-border/50 max-w-full overflow-x-auto scrollbar-none">
            {statuses.map(s => (
              <Button
                key={s.label}
                variant={filters.status === s.value ? "default" : "ghost"}
                className={`rounded-full h-8 px-4 text-[13px] font-sans transition-colors shrink-0 ${filters.status === s.value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                onClick={() => setFilters(prev => ({ ...prev, status: s.value, page: 1 }))}
              >
                {s.label}
              </Button>
            ))}
          </div>
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
                          {user.id === currentUser?.id ? (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              Cannot modify own status
                            </DropdownMenuItem>
                          ) : (
                            <>
                              {user.status === 'ACTIVE' ? (
                                <DropdownMenuItem 
                                  className="text-orange-600 focus:bg-orange-600 focus:text-orange-50 cursor-pointer"
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
                            </>
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

        {/* Pagination Section */}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
            <span className="font-sans text-xs font-medium text-muted-foreground">
              Showing {Math.min((meta.page - 1) * meta.limit + 1, meta.total)} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} users
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-sans text-xs h-8"
                disabled={meta.page <= 1 || isLoading}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-sans text-xs h-8"
                disabled={meta.page * meta.limit >= meta.total || isLoading}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
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
