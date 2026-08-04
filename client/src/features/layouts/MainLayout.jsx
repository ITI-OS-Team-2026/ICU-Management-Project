import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { useShortcuts } from '../hooks/useShortcuts';

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  useShortcuts('global', {
    goToDashboard: () => navigate('/dashboard'),
    goToSettings: () => navigate('/settings'),
    focusSearch: () => document.querySelector('input[type="search"]')?.focus(),
  });

  return (
    <TooltipProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background font-sans">
        
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar isCollapsed={isCollapsed} />
        </div>

        {/* ── Main area ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          
          {/* Top header */}
          <TopHeader isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>

      </div>
    </TooltipProvider>
  );
}
