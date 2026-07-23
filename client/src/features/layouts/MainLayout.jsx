import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background font-sans">
        
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <Sidebar isCollapsed={isCollapsed} />

        {/* ── Main area ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          
          {/* Top header */}
          <TopHeader isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-muted/30 p-8">
            <Outlet />
          </main>
        </div>

      </div>
    </TooltipProvider>
  );
}
