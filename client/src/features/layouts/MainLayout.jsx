import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { useShortcuts } from '../hooks/useShortcuts';
import { useShortcutStore } from '../store/shortcutStore';
import KeyboardShortcutsDialog from '../components/shortcuts/KeyboardShortcutsDialog';

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const toggleShortcutHelp = useShortcutStore((state) => state.toggleShortcutHelp);

  useShortcuts('global', {
    showShortcuts: toggleShortcutHelp,
    goToDashboard: () => navigate('/dashboard'),
    goToSettings: () => navigate('/settings'),
    // Screens opt in by tagging their search box, rather than relying on
    // input[type="search"] — which no input in this app actually uses.
    focusSearch: () => document.querySelector('[data-shortcut="search"]')?.focus(),
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

      {/* Reachable from every screen with `?`. */}
      <KeyboardShortcutsDialog />
    </TooltipProvider>
  );
}
