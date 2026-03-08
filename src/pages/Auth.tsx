import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup' | 'forgot';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Login successful!');
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email for confirmation!');
        navigate('/');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const titles: Record<AuthMode, { title: string; desc: string }> = {
    login: { title: 'Login', desc: 'Enter your credentials to access your account' },
    signup: { title: 'Create Account', desc: 'Create a new account to get started' },
    forgot: { title: 'Reset Password', desc: 'Enter your email to receive a reset link' },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{titles[mode].title}</CardTitle>
          <CardDescription>{titles[mode].desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {mode !== 'forgot' && (
              <FormField
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                error={formError ?? undefined}
              />
            )}
            {mode === 'forgot' && formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? 'Processing...'
                : mode === 'login'
                  ? 'Login'
                  : mode === 'signup'
                    ? 'Sign Up'
                    : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <div>
                  Don't have an account?{' '}
                  <Button variant="link" onClick={() => { setMode('signup'); setFormError(null); }} className="p-0 h-auto">
                    Sign up
                  </Button>
                </div>
                <div>
                  <Button variant="link" onClick={() => { setMode('forgot'); setFormError(null); }} className="p-0 h-auto text-muted-foreground">
                    Forgot password?
                  </Button>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div>
                Already have an account?{' '}
                <Button variant="link" onClick={() => { setMode('login'); setFormError(null); }} className="p-0 h-auto">
                  Login
                </Button>
              </div>
            )}
            {mode === 'forgot' && (
              <div>
                <Button variant="link" onClick={() => { setMode('login'); setFormError(null); }} className="p-0 h-auto">
                  Back to login
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
