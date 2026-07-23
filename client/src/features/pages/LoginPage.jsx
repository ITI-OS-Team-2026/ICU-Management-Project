import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { getAuthErrorMessage } from '../services/authService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const REMEMBER_EMAIL_KEY = 'smartcare_remember_email';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function LoginBrandPanel() {
  return (
    <aside className="relative hidden min-h-0 min-w-0 flex-col justify-between overflow-hidden bg-login-brand p-10 text-login-brand-foreground xl:flex">
      <div className="login-brand-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <div className="relative z-10 flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-none tracking-tight">
            SmartCare ICU
          </p>
          <p className="mt-1.5 font-sans text-[0.7rem] font-medium tracking-[0.08em] text-login-brand-muted uppercase">
            AI Clinical Platform
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-10">
        <div className="login-monitor" aria-hidden>
          <div className="login-monitor__ring" />
          <div className="login-monitor__ring login-monitor__ring--mid" />
          <div className="login-monitor__ring login-monitor__ring--inner" />
          <span className="login-monitor__spoke login-monitor__spoke--1" />
          <span className="login-monitor__spoke login-monitor__spoke--2" />
          <span className="login-monitor__spoke login-monitor__spoke--3" />
          <span className="login-monitor__spoke login-monitor__spoke--4" />
          <span className="login-monitor__spoke login-monitor__spoke--5" />
          <div className="login-monitor__core">
            <ShieldCheck className="size-8" />
          </div>
        </div>
        <Badge
          variant="secondary"
          className="mt-6 border-0 bg-primary/20 text-login-brand-foreground hover:bg-primary/20"
        >
          AI powered
        </Badge>
      </div>

      <div className="relative z-10 min-w-0 space-y-3">
        <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-balance">
          Intelligent ICU care,{' '}
          <span className="text-primary">powered by AI</span>
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-login-brand-muted">
          Real-time vitals. Predictive insights. Smart clinical decision support
          — built for the most demanding environments.
        </p>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 overflow-hidden opacity-60"
        aria-hidden
      >
        <div className="css-ekg" />
      </div>
    </aside>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(null);

  const rememberedEmail = readRememberedEmail();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail,
      password: '',
      remember: Boolean(rememberedEmail),
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values) {
    setServerError(null);
    try {
      await login({ email: values.email, password: values.password });

      try {
        if (values.remember) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        // Ignore storage failures (private mode, etc.)
      }

      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getAuthErrorMessage(error));
    }
  }

  return (
    /* Hallmark · macrostructure: Workbench · tone: utilitarian · theme: design.md
     * responsive: centered card < xl · split panel from xl
     */
    <div className="relative flex min-h-svh items-center justify-center overflow-x-clip bg-login-page px-4 py-16 sm:px-6 sm:py-20 md:px-8 xl:p-8">
      <div className="login-page-atmosphere pointer-events-none absolute inset-0" aria-hidden />
      <div className="login-page-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />

      <div className="absolute top-4 right-4 z-20 sm:top-5 sm:right-5">
        <ThemeToggle />
      </div>

      {/*
        < xl: single centered card (phones, tablets, iPad Pro portrait)
        ≥ xl: two-column split shell
      */}
      <div className="relative z-10 grid w-full min-w-0 max-w-[26rem] overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-foreground/10 sm:max-w-md md:max-w-lg xl:h-[min(40rem,calc(100svh-4rem))] xl:max-w-5xl xl:grid-cols-2">
        <LoginBrandPanel />

        <section className="flex min-w-0 flex-col justify-center bg-card p-6 sm:p-8 md:p-10 xl:p-12">
          {/* Brand mark only when the left panel is hidden */}
          <div className="mb-6 xl:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold leading-none tracking-tight text-foreground">
                  SmartCare ICU
                </p>
                <p className="mt-1.5 font-sans text-[0.7rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  AI Clinical Platform
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-3 sm:mb-8">
            <Badge
              variant="secondary"
              className="gap-1.5 font-medium whitespace-nowrap text-accent-foreground"
            >
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              Secure access
            </Badge>
            <div className="min-w-0 space-y-1.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem] xl:text-3xl">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in with your institutional credentials.
              </p>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
              noValidate
            >
              {serverError ? (
                <Alert variant="destructive">
                  <Lock className="size-4" aria-hidden />
                  <AlertTitle>Sign-in failed</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <InputGroup className="h-11 min-w-0">
                      <InputGroupAddon align="inline-start">
                        <Mail className="size-4" aria-hidden />
                      </InputGroupAddon>
                      <FormControl>
                        <InputGroupInput
                          type="email"
                          autoComplete="email"
                          placeholder="you@hospital.org"
                          disabled={isSubmitting}
                          className="min-w-0"
                          {...field}
                        />
                      </FormControl>
                    </InputGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <InputGroup className="h-11 min-w-0">
                      <InputGroupAddon align="inline-start">
                        <Lock className="size-4" aria-hidden />
                      </InputGroupAddon>
                      <FormControl>
                        <InputGroupInput
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          disabled={isSubmitting}
                          className="min-w-0"
                          {...field}
                        />
                      </FormControl>
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={isSubmitting}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <Checkbox
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      disabled={isSubmitting}
                      id="remember"
                    />
                    <Label
                      htmlFor="remember"
                      className="cursor-pointer font-normal text-muted-foreground"
                    >
                      Remember this device
                    </Label>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="mt-1 h-11 w-full whitespace-nowrap font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 space-y-4">
            <Separator />
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Role-based access · Session secured with HttpOnly cookies
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
