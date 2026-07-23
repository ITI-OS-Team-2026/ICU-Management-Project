import { useLoaderData, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function HomePage() {
  const { user: loaderUser } = useLoaderData();
  const storeUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const user = loaderUser || storeUser;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            SmartCare ICU
          </p>
          <p className="text-sm text-muted-foreground">Clinical workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="default" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
        <Card className="shadow-sm [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="font-display text-xl font-semibold">
              Hello, {user?.first_name} {user?.last_name}
            </CardTitle>
            <CardDescription>
              You are signed in. Dashboard modules will land here next.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{user?.role}</Badge>
            {user?.email ? (
              <span className="font-mono text-sm text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
