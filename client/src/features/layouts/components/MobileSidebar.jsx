import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground -ml-2"
          aria-label="Open sidebar"
        />
      }>
        <Menu size={18} />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-r border-border">
        {/* Render the Sidebar in mobile mode. 
            Pass onNavClick to close the sheet when a link is clicked. */}
        <Sidebar isMobile={true} onNavClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
