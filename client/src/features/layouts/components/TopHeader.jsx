import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, HelpCircle, Keyboard } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';

import { MobileSidebar } from './MobileSidebar';
import { useShortcutStore } from '../../store/shortcutStore';
import { useAuthStore } from '../../store/authStore';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/patients': 'Patient List',
  '/patients/admit': 'Admit Patient',
  '/beds': 'Bed Overview',
  '/vitals/monitor': 'Vitals Monitor',
  '/vitals/entry': 'Vitals Entry',
  '/medications': 'Medications',
  '/medications/administration': 'Med Administration',
  '/labs': 'Lab Results',
  '/discharge': 'Discharge',
  '/help': 'Help & Documentation',
  '/admin/users': 'Manage Users',
  '/admin/beds': 'Manage Beds',
  '/admin/audit-logs': 'Audit Logs',
};

export function TopHeader({ isCollapsed, setIsCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const openShortcutHelp = useShortcutStore((state) => state.openShortcutHelp);
  const user = useAuthStore((state) => state.user);
  const pageTitle = ROUTE_TITLES[location.pathname] || 'SmartCare ICU';

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6 gap-3">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Desktop Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
        {/* Mobile Toggle */}
        <MobileSidebar />
      </div>

      <h1 className="flex-1 truncate text-center font-display text-base sm:text-lg font-semibold text-foreground">
        {pageTitle}
      </h1>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Shortcuts are worthless if nobody knows they exist; `?` alone is not
            discoverable, so it gets a button on every screen size — tablets and
            docked phones have keyboards too. */}
        {(user?.role === 'resident' || user?.role === 'specialist') && (
          <Button
            variant="ghost"
            size="icon"
            onClick={openShortcutHelp}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/help')}
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          title="Help & Documentation"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        <NotificationDropdown />
        <ThemeToggle />
      </div>
    </header>
  );
}
