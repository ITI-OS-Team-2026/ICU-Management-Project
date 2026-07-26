import { useState } from 'react';
import { authService } from '../services/authService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (formData.newPassword !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (formData.newPassword.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      setIsLoading(true);
      await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setStatus({ type: 'success', message: 'Your password has been successfully updated.' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to update password. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-muted/20">
      <div className="w-full max-w-md">
        
        <div className="mb-8 text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-headline text-foreground font-bold">
            Security Settings
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            Manage your account security and update your password.
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <CardTitle className="font-sans text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Change Password
            </CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-6">
              
              {status.message && (
                <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className={status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                  {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  {status.type === 'success' && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                  <AlertDescription className="font-sans text-xs font-medium ml-1">
                    {status.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="font-sans text-xs font-semibold">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  required
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="font-sans text-sm"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-sans text-xs font-semibold">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="font-sans text-sm"
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-sans text-xs font-semibold">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="font-sans text-sm"
                  placeholder="Type new password again"
                />
              </div>

            </CardContent>
            
            <CardFooter className="pt-2 pb-6 border-t border-border/50 bg-muted/10 mt-6 flex justify-end px-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="font-sans font-semibold bg-primary w-full sm:w-auto"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  );
}
