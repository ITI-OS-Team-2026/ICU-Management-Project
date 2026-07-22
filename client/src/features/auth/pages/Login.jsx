import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Activity, ShieldCheck, HeartPulse } from 'lucide-react';


import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import useAuthStore from '../store/authStore';

// Define the validation schema using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to where the user was going, or dashboard by default
  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4 lg:p-12">
      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row bg-card rounded-3xl overflow-hidden shadow-2xl border border-border min-h-[700px]">
        
        {/* Left Column: Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 relative bg-background">
        
        {/* Mobile Logo Header (Hidden on large screens where right panel is visible) */}
        <div className="flex lg:hidden flex-col items-center justify-center space-y-2 text-center mb-8">
          <div className="bg-primary/10 p-3 rounded-md mb-2">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-display tracking-tight font-bold">SmartCare ICU</h1>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-2 hidden lg:block mb-10">
            <h2 className="text-display font-bold">Welcome back</h2>
            <p className="text-body text-muted-foreground">
              Enter your credentials to access the clinical dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@hospital.org"
                {...register('email')}
                className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base mt-4 shadow-none" // shadow-none to enforce flat-by-default
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="pt-8 flex flex-col space-y-2 text-center">
            <p className="text-xs text-muted-foreground">
              Authorized personnel only. All access is logged.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Branding / Information Panel */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col items-start justify-between p-12 lg:p-24 relative overflow-hidden">
        
        {/* E7 Tactile Texture (Abstract Background) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in oklch, var(--color-primary) 100%, var(--color-accent) 20%) 100%)'
            }}
          />
          <svg width="0" height="0" className="absolute">
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            </filter>
          </svg>
          <div 
            className="absolute inset-0" 
            style={{ 
              filter: 'url(#grain)', 
              opacity: 0.08, 
              mixBlendMode: 'multiply' 
            }} 
          />
        </div>

        {/* Top left branding */}
        <div className="flex items-center space-x-3 text-primary-foreground z-10">
          <div className="bg-background/20 p-2 rounded-md">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-title font-bold tracking-tight">SmartCare ICU</span>
        </div>

        {/* Tier A: Custom CSS Art (EKG Trace) */}
        <div className="css-ekg" aria-hidden="true"></div>

        {/* Center message / abstract data representation */}
        <div className="space-y-6 z-10 max-w-lg mt-20">
          <h1 className="text-display font-bold text-primary-foreground leading-tight">
            High-Precision Clinical Intelligence.
          </h1>
        </div>

        {/* Bottom features indicator */}
        <div className="flex space-x-8 text-primary-foreground/60 mt-auto z-10">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            <span className="text-label uppercase tracking-widest text-primary-foreground/80">End-to-End Encryption</span>
          </div>
          <div className="flex items-center space-x-2">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
            <span className="text-label uppercase tracking-widest text-primary-foreground/80">Live Telemetry</span>
          </div>
        </div>

      </div>

      </div>
    </div>
  );
};

export default Login;
