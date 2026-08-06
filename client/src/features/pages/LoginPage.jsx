import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { getAuthErrorMessage } from '../services/authService';
import { passwordResetRequestService } from '../services/passwordResetRequestService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';

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

function LoginMedicalMotifs() {
  return (
    <div className="login-page-motifs pointer-events-none absolute inset-0" aria-hidden>
      <span className="login-motif login-motif--cross login-motif--cross-a" />
      <span className="login-motif login-motif--cross login-motif--cross-b" />
      <span className="login-motif login-motif--cross login-motif--cross-c" />
      <span className="login-motif login-motif--ring login-motif--ring-a" />
      <span className="login-motif login-motif--ring login-motif--ring-b" />
      <span className="login-motif login-motif--ring login-motif--ring-c" />
      <svg
        className="login-motif login-motif--ekg login-motif--ekg-a"
        viewBox="0 0 240 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 24h42l8-14 10 28 12-22 8 14h40l7-12 11 26 13-28 8 14h81"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        className="login-motif login-motif--ekg login-motif--ekg-b"
        viewBox="0 0 200 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 20h28l6-10 8 22 9-18 6 10h36l5-8 8 18 10-22 6 12h68"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="login-motif login-motif--dot login-motif--dot-a" />
      <span className="login-motif login-motif--dot login-motif--dot-b" />
      <span className="login-motif login-motif--dot login-motif--dot-c" />
      <span className="login-motif login-motif--capsule login-motif--capsule-a" />
      <span className="login-motif login-motif--capsule login-motif--capsule-b" />
    </div>
  );
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

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please provide a valid email address'),
  message: z.string().max(500, 'Keep it under 500 characters').optional(),
});

/**
 * The one entry point for a clinician who is locked out and has no session —
 * the authenticated request-a-reset flow on the Settings page structurally
 * cannot serve them, since it requires the very login they're stuck on.
 * Identifies the account by email instead, and always reports the same
 * generic outcome (see passwordResetRequestService/passwordReset.service.js
 * on the backend) so the response itself can't be used to probe which emails
 * are registered.
 */
function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', message: '' },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      // Reset only after the close animation would have finished reading —
      // reopening mid-session shouldn't show a stale success state.
      setSubmitted(false);
      setServerError(null);
      form.reset();
    }
  };

  async function onSubmit(values) {
    setServerError(null);
    try {
      await passwordResetRequestService.createPublicRequest(values.email, values.message);
      setSubmitted(true);
    } catch (error) {
      if (error?.response?.status === 429) {
        setServerError('Too many attempts. Please try again in an hour.');
      } else {
        setSubmitted(true);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
        }
      />

      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <DialogTitle>Request sent</DialogTitle>
            <DialogDescription>
              If that email belongs to an account, an administrator has been
              notified and will follow up with a new temporary password.
            </DialogDescription>
            <DialogClose render={<Button className="mt-2 w-full">Done</Button>} />
          </div>
        ) : (
          <>
            <DialogHeader>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="size-4" aria-hidden />
              </span>
              <DialogTitle>Reset your password</DialogTitle>
              <DialogDescription>
                Tell us the email on your account. An administrator reviews
                every request and sets a new temporary password — there is no
                self-service reset.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={(event) => {
                  // This form is portaled into document.body (DialogContent),
                  // but React bubbles synthetic events through the *component*
                  // tree, not the DOM tree — and this dialog is a JSX child of
                  // the sign-in form below. Without stopping it here, sending a
                  // reset request also fires the sign-in form's own submit,
                  // running its validation against fields nobody touched and
                  // showing "required" errors on an untouched email/password.
                  event.stopPropagation();
                  form.handleSubmit(onSubmit)(event);
                }}
                className="flex flex-col gap-4"
                noValidate
              >
                {serverError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Could not send request</AlertTitle>
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
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Note for the admin{' '}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="e.g. locked out after too many attempts"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      'Send request'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
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

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError(getAuthErrorMessage(error));
    }
  }

  return (
    /* Hallmark · macrostructure: Workbench · tone: utilitarian · theme: design.md
     * enrichment: medical motifs (cross / EKG / pulse rings) · responsive: card < xl · split ≥ xl
     */
    <div className="relative flex min-h-svh items-center justify-center overflow-x-clip bg-login-page px-4 py-16 sm:px-6 sm:py-20 md:px-8 xl:p-8">
      <div className="login-page-atmosphere pointer-events-none absolute inset-0" aria-hidden />
      <LoginMedicalMotifs />

      <div className="absolute top-4 left-4 z-20 sm:top-5 sm:left-5">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to="/" />}
          className="gap-1.5 rounded-full border-border bg-background pl-2.5 pr-3.5 shadow-sm hover:bg-muted"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to home
        </Button>
      </div>

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

              <div className="flex items-center justify-between gap-3">
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

                <ForgotPasswordDialog />
              </div>

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
        </section>
      </div>
    </div>
  );
}
