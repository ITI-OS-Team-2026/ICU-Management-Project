import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  FileText,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Public entry point at "/". Unauthenticated visitors land here; the route
 * loader (landingLoader) bounces anyone with a session straight to
 * /dashboard, so this component only ever renders for guests.
 *
 * Visually a continuation of LoginPage's split brand-panel language (same
 * login-brand tokens, EKG motif, monitor glyph) rather than a separate
 * marketing skin — the two pages are a clinician's first and second click.
 */

const FEATURES = [
  {
    icon: MessagesSquare,
    title: 'Medical Assistant',
    description:
      'Ask clinical questions and get answers grounded in your institutional knowledge base, with sources cited on every reply.',
  },
  {
    icon: FileText,
    title: 'Chat-scoped documents',
    description:
      'Attach a protocol or paper to a conversation. It is indexed and searchable only inside that chat — never shared across cases.',
  },
  {
    icon: Activity,
    title: 'Live patient signal',
    description:
      'Vitals, labs, medications, and notes in one continuously updated view, built for the pace of a shift.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-scoped access',
    description:
      'Nurses, residents, and specialists each see exactly what their role permits — enforced on every request, not just the UI.',
  },
];

const CAPABILITIES = [
  { value: '24/7', label: 'Continuous vitals monitoring' },
  { value: '3', label: 'Clinical roles, distinct workflows' },
  { value: '100%', label: 'Actions attributed in the audit log' },
];

function BrandMark({ variant = 'default' }) {
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2.5"
      aria-label="SmartCare ICU home"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p
          className={`font-display text-base font-semibold leading-none tracking-tight ${
            variant === 'onBrand' ? 'text-login-brand-foreground' : 'text-foreground'
          }`}
        >
          SmartCare ICU
        </p>
        <p
          className={`mt-1.5 font-sans text-[0.65rem] font-medium tracking-[0.08em] uppercase ${
            variant === 'onBrand' ? 'text-login-brand-muted' : 'text-muted-foreground'
          }`}
        >
          AI Clinical Platform
        </p>
      </div>
    </Link>
  );
}

function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-border/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark />
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button
            nativeButton={false}
            render={<Link to="/login" />}
            size="sm"
            className="h-9 px-4 sm:h-10 sm:px-5"
          >
            Sign in
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroMonitor() {
  return (
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
        <Stethoscope className="size-8" />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-login-brand text-login-brand-foreground">
      <div className="login-brand-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="login-page-motifs pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <span className="login-motif login-motif--cross login-motif--cross-a" />
        <span className="login-motif login-motif--cross login-motif--cross-b" />
        <span className="login-motif login-motif--ring login-motif--ring-a" />
        <span className="login-motif login-motif--ring login-motif--ring-b" />
        <span className="login-motif login-motif--dot login-motif--dot-a" />
        <span className="login-motif login-motif--dot login-motif--dot-b" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:py-28 xl:px-8">
        <div className="min-w-0 space-y-6">
          <Badge
            variant="secondary"
            className="gap-1.5 border-0 bg-primary/20 font-medium text-login-brand-foreground hover:bg-primary/20"
          >
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            AI powered
          </Badge>

          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-[3.25rem]">
            Clinical decisions,{' '}
            <span className="text-primary">backed by evidence</span> — in
            seconds, not searches.
          </h1>

          <p className="max-w-[42ch] text-pretty text-base leading-relaxed text-login-brand-muted sm:text-lg">
            SmartCare ICU puts real-time vitals, patient history, and a
            source-cited medical assistant in one place — so your team spends
            less time hunting for information and more time at the bedside.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button
              nativeButton={false}
              render={<Link to="/login" />}
              size="lg"
              className="h-12 gap-2 whitespace-nowrap px-6 text-base font-medium"
            >
              Sign in to your account
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <p className="text-xs leading-relaxed text-login-brand-muted sm:max-w-[22ch]">
              Institutional accounts only — access is provisioned by your
              hospital administrator.
            </p>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-col items-center justify-center gap-6">
          <HeroMonitor />
          <div className="css-ekg h-10 w-full max-w-xs opacity-70 sm:max-w-sm" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="max-w-2xl">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Built for the unit
        </p>
        <h2 className="mt-3 text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Everything a shift actually needs, nothing it doesn't
        </h2>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="ring-1 ring-border">
            <CardHeader className="gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <CardTitle className="font-display text-base font-semibold tracking-tight text-foreground">
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CapabilityStrip() {
  return (
    <section className="border-y border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 sm:py-14 lg:px-8">
        {CAPABILITIES.map(({ value, label }) => (
          <div key={label} className="min-w-0 border-l-2 border-primary/40 pl-4">
            <p className="font-tnum font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {value}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="flex flex-col items-start gap-6 rounded-2xl bg-login-brand px-6 py-10 text-login-brand-foreground sm:px-10 sm:py-14 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 max-w-lg space-y-2">
          <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Sign in with your institutional credentials
          </h2>
          <p className="text-sm leading-relaxed text-login-brand-muted sm:text-base">
            Access is provisioned per clinician by your hospital's
            administrator — there is no self-service sign-up.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link to="/login" />}
          size="lg"
          className="h-12 shrink-0 gap-2 whitespace-nowrap px-6 text-base font-medium"
        >
          Go to sign in
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} SmartCare ICU. Institutional clinical platform.</p>
        <p>Role-based access · Sessions secured with HttpOnly cookies</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <FeatureGrid />
        <CapabilityStrip />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
