import { useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

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
  '/admin/users': 'Manage Users',
  '/admin/beds': 'Manage Beds',
};

export function TopHeader({ isCollapsed, setIsCollapsed }) {
  const location = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] || 'SmartCare ICU';

  return (
    <header className="relative flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
      </div>

      <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-lg font-semibold text-foreground">
        {pageTitle}
      </h1>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
