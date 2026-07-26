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
  FileText,
  LogOut,
  History,
  Settings,
  HelpCircle,
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
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
    { to: '/help',        label: 'Help & Docs',  icon: HelpCircle },
  ],
  ICU_NURSE: [
    { to: '/',                          label: 'Dashboard',        icon: LayoutDashboard },
    { to: '/patients',                  label: 'Patient List',     icon: Users },
    { to: '/beds',                      label: 'Bed Overview',     icon: BedDouble },
    { to: '/vitals/entry',              label: 'Vitals Entry',     icon: Activity },
    { to: '/medications/administration',label: 'Med Administration', icon: Pill },
    { to: '/labs',                      label: 'Upload Documents', icon: FlaskConical },
    { to: '/nursing-notes',             label: 'Nursing Notes',    icon: FileText },
    { to: '/help',                      label: 'Help & Docs',      icon: HelpCircle },
  ],
  MEDICAL_RESIDENT: [
    { to: '/',               label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/patients',       label: 'Patient List',   icon: Users },
    { to: '/patients/admit', label: 'Admit Patient',  icon: UserPlus },
    { to: '/beds',           label: 'Bed Overview',   icon: BedDouble },
    { to: '/vitals/monitor', label: 'Vitals Monitor', icon: Activity },
    { to: '/medications',    label: 'Medications',    icon: Pill },
    { to: '/labs',           label: 'Lab Results',    icon: FlaskConical },
    { to: '/nursing-notes',  label: 'Nursing Notes',  icon: FileText },
    { to: '/help',           label: 'Help & Docs',    icon: HelpCircle },
  ],
  ICU_SPECIALIST: [
    { to: '/',               label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/patients',       label: 'Patient List',   icon: Users },
    { to: '/patients/admit', label: 'Admit Patient',  icon: UserPlus },
    { to: '/beds',           label: 'Bed Overview',   icon: BedDouble },
    { to: '/discharge',      label: 'Discharge',      icon: ClipboardList },
    { to: '/nursing-notes',  label: 'Nursing Notes',  icon: FileText },
    { to: '/help',           label: 'Help & Docs',    icon: HelpCircle },
  ],
};

// Role display labels & badge variants
const ROLE_META = {
  SYSTEM_ADMIN:     { label: 'System Admin',     variant: 'outline' },
  ICU_NURSE:        { label: 'ICU Nurse',         variant: 'secondary' },
  MEDICAL_RESIDENT: { label: 'Medical Resident',  variant: 'secondary' },
  ICU_SPECIALIST:   { label: 'ICU Specialist',    variant: 'default' },
};

function SidebarLink({ to, label, icon: Icon, isCollapsed, onNavClick }) {
  const content = (
    <NavLink
      to={to}
      // Exact match so /patients is not active on /patients/admit
      end
      className={({ isActive }) =>
        [
          to === '/' ? 'nav-home' : `nav-${to.split('/').filter(Boolean).join('-')}`,
          'flex items-center rounded-md py-2 text-sm font-medium transition-colors w-full cursor-pointer',
          isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ].join(' ')
      }
      onClick={onNavClick}
    >
      <Icon size={16} aria-hidden />
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );

  if (isCollapsed) {
    return <TooltipTrigger render={content} />;
  }
  return content;
}

export function Sidebar({ isCollapsed, isMobile = false, onNavClick }) {
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
    <aside className={`flex flex-shrink-0 flex-col bg-card transition-all duration-300 ease-in-out ${isMobile ? 'w-full h-full border-none' : `border-r border-border ${isCollapsed ? 'w-16' : 'w-60'}`}`}>
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
          isCollapsed && !isMobile ? (
            <Tooltip key={link.to} delayDuration={0}>
              <SidebarLink {...link} isCollapsed={isCollapsed} onNavClick={onNavClick} />
              <TooltipContent side="right" className="text-xs">
                {link.label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <SidebarLink key={link.to} {...link} isCollapsed={isCollapsed && !isMobile} onNavClick={onNavClick} />
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
        
        <div className="flex flex-col gap-1 w-full">
          {isCollapsed && !isMobile ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger render={
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center justify-center rounded-md py-2 text-sm font-medium transition-colors w-full cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                  }
                  onClick={onNavClick}
                >
                  <Settings size={16} aria-hidden />
                </NavLink>
              } />
              <TooltipContent side="right" className="text-xs">
                Settings
              </TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
              }
              onClick={onNavClick}
            >
              <Settings size={16} aria-hidden />
              <span>Settings</span>
            </NavLink>
          )}

          {isCollapsed && !isMobile ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger render={
                <Button
                  variant="ghost"
                  className="w-full justify-center px-0 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </Button>
              } />
              <TooltipContent side="right" className="text-xs">
                Log out
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Log out</span>
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
