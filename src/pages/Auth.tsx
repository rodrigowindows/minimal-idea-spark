import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { PasswordStrengthMeter, isPasswordStrong } from '@/components/PasswordStrengthMeter';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';

type AuthMode = 'login' | 'signup' | 'forgot';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validate = (): string | null => {
    if (!email.trim()) return 'Email é obrigatório';
    if (mode === 'signup' && !isPasswordStrong(password)) {
      return 'A senha não atende aos requisitos mínimos';
    }
    if (mode === 'signup' && password !== confirmPassword) {
      return 'As senhas não coincidem';
    }
    if (mode === 'login' && password.length < 6) return 'Senha deve ter pelo menos 6 caracteres';
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
    setConfirmPassword('');
  };

  const titles: Record<AuthMode, { title: string; desc: string }> = {
    login: { title: 'Welcome back', desc: 'Sign in to your command center' },
    signup: { title: 'Get started', desc: 'Create your LifeOS account' },
    forgot: { title: 'Reset password', desc: 'Enter your email to receive a reset link' },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md space-y-6"
      >
        {/* Brand */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5"
          >
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">LifeOS</span>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Your personal command center for goals, habits & productivity
          </p>
        </div>

        <Card className="border-border/60 shadow-lg overflow-hidden">
          <CardHeader className="pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CardTitle className="text-xl">{titles[mode].title}</CardTitle>
                <CardDescription>{titles[mode].desc}</CardDescription>
              </motion.div>
            </AnimatePresence>
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
              <AnimatePresence>
                {mode !== 'forgot' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FormField
                      id="password"
                      label="Senha"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    {mode === 'signup' && <PasswordStrengthMeter password={password} />}
                    {mode === 'signup' && (
                      <div className="pt-2">
                        <FormField
                          id="confirmPassword"
                          label="Confirmar senha"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                        />
                        {confirmPassword && password !== confirmPassword && (
                          <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
                        )}
                        {confirmPassword && password === confirmPassword && password.length > 0 && (
                          <p className="text-xs text-green-600 mt-1">✓ Senhas coincidem</p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {formError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {formError}
                  </motion.p>
                )}
              </AnimatePresence>
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

            {mode !== 'forgot' && (
              <>
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    ou
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isGoogleLoading || isLoading}
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    try {
                      const result = await lovable.auth.signInWithOAuth('google', {
                        redirect_uri: window.location.origin,
                      });
                      if (result.error) {
                        toast.error(result.error.message || 'Google sign-in failed');
                      }
                    } catch (err) {
                      toast.error('Google sign-in failed');
                    } finally {
                      setIsGoogleLoading(false);
                    }
                  }}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continuar com Google
                </Button>
              </>
            )}

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
                  <Button variant="link" onClick={() => switchMode('login')} className="p-0 h-auto inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Back to login
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our terms of service
        </p>
      </motion.div>
    </div>
  );
}
