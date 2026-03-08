import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (mode !== 'forgot' && password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsLoading(true);

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
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email for confirmation!');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setFormError(null);
  };

  const titles: Record<AuthMode, { title: string; desc: string }> = {
    login: { title: 'Welcome back', desc: 'Sign in to your command center' },
    signup: { title: 'Get started', desc: 'Create your LifeOS account' },
    forgot: { title: 'Reset password', desc: 'Enter your email to receive a reset link' },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">LifeOS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your personal command center for goals, habits & productivity
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{titles[mode].title}</CardTitle>
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
                autoComplete="email"
              />
              {mode !== 'forgot' && (
                <FormField
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              )}
              {formError && (
                <p className="text-sm text-destructive" role="alert">{formError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : mode === 'login'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Create Account'
                    : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center text-sm">
              {mode === 'login' && (
                <>
                  <div>
                    Don't have an account?{' '}
                    <Button variant="link" onClick={() => switchMode('signup')} className="p-0 h-auto font-semibold">
                      Sign up
                    </Button>
                  </div>
                  <div>
                    <Button variant="link" onClick={() => switchMode('forgot')} className="p-0 h-auto text-muted-foreground text-xs">
                      Forgot password?
                    </Button>
                  </div>
                </>
              )}
              {mode === 'signup' && (
                <div>
                  Already have an account?{' '}
                  <Button variant="link" onClick={() => switchMode('login')} className="p-0 h-auto font-semibold">
                    Sign in
                  </Button>
                </div>
              )}
              {mode === 'forgot' && (
                <div>
                  <Button variant="link" onClick={() => switchMode('login')} className="p-0 h-auto">
                    ← Back to login
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
