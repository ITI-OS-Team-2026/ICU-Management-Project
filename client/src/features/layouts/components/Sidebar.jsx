import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BedDouble,
  Activity,
  Pill,
  FlaskConical,
  HeartPulse,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useAuthStore } from '../../store/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Sidebar nav config — one source of truth for every role's links
// ---------------------------------------------------------------------------
const SIDEBAR_NAV = {
  SYSTEM_ADMIN: [
    { to: '/',            label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/admin/users', label: 'Manage Users', icon: Users },
    { to: '/admin/beds',  label: 'Manage Beds',  icon: BedDouble },
  ],
  ICU_NURSE: [
    { to: '/',                          label: 'Dashboard',        icon: LayoutDashboard },
    { to: '/patients',                  label: 'Patient List',     icon: Users },
    { to: '/beds',                      label: 'Bed Overview',     icon: BedDouble },
    { to: '/vitals/entry',              label: 'Vitals Entry',     icon: Activity },
    { to: '/medications/administration',label: 'Med Administration', icon: Pill },
  ],
  MEDICAL_RESIDENT: [
    { to: '/',               label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/patients',       label: 'Patient List',   icon: Users },
    { to: '/patients/admit', label: 'Admit Patient',  icon: UserPlus },
    { to: '/beds',           label: 'Bed Overview',   icon: BedDouble },
    { to: '/vitals/monitor', label: 'Vitals Monitor', icon: Activity },
    { to: '/medications',    label: 'Medications',    icon: Pill },
    { to: '/labs',           label: 'Lab Results',    icon: FlaskConical },
  ],
  ICU_SPECIALIST: [
    { to: '/',               label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/patients',       label: 'Patient List',   icon: Users },
    { to: '/patients/admit', label: 'Admit Patient',  icon: UserPlus },
    { to: '/beds',           label: 'Bed Overview',   icon: BedDouble },
    { to: '/vitals/monitor', label: 'Vitals Monitor', icon: Activity },
    { to: '/medications',    label: 'Medications',    icon: Pill },
    { to: '/labs',           label: 'Lab Results',    icon: FlaskConical },
    { to: '/discharge',      label: 'Discharge',      icon: ClipboardList },
  ],
};

// Role display labels & badge variants
const ROLE_META = {
  SYSTEM_ADMIN:     { label: 'System Admin',     variant: 'outline' },
  ICU_NURSE:        { label: 'ICU Nurse',         variant: 'secondary' },
  MEDICAL_RESIDENT: { label: 'Medical Resident',  variant: 'secondary' },
  ICU_SPECIALIST:   { label: 'ICU Specialist',    variant: 'default' },
};

function SidebarLink({ to, label, icon: Icon, isCollapsed }) {
  const content = (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'flex items-center rounded-md py-2 text-sm font-medium transition-colors w-full',
          isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ].join(' ')
      }
    >
      <Icon size={16} aria-hidden />
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );

  if (isCollapsed) {
    return <TooltipTrigger asChild>{content}</TooltipTrigger>;
  }
  return content;
}

export function Sidebar({ isCollapsed }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const links = SIDEBAR_NAV[user?.role] ?? [];
  const roleMeta = ROLE_META[user?.role] ?? { label: user?.role ?? 'User', variant: 'outline' };

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';

  return (
    <aside className={`flex flex-shrink-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-60'}`}>
      {/* Brand */}
      <div className={`flex h-16 items-center border-b border-border overflow-hidden ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-5'}`}>
        <HeartPulse size={20} className="text-primary flex-shrink-0" aria-hidden />
        {!isCollapsed && (
          <span className="font-display text-base font-bold tracking-tight text-foreground whitespace-nowrap">
            SmartCare ICU
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4 gap-1" aria-label="Main navigation">
        {links.map((link) => (
          isCollapsed ? (
            <Tooltip key={link.to} delayDuration={0}>
              <SidebarLink {...link} isCollapsed={isCollapsed} />
              <TooltipContent side="right" className="text-xs">
                {link.label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <SidebarLink key={link.to} {...link} isCollapsed={isCollapsed} />
          )
        ))}
      </nav>

      {/* User profile & Sign Out */}
      <div className="flex flex-col border-t border-border p-4 gap-4 mt-auto">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
              <Badge variant={roleMeta.variant} className="mt-0.5 text-[10px] truncate max-w-full">
                {roleMeta.label}
              </Badge>
            </div>
          )}
        </div>
        
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="default" className="w-full justify-center px-0" onClick={handleLogout} aria-label="Sign out">
                <LogOut size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sign out
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="default" className="w-full justify-start gap-3 px-3" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign out</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
