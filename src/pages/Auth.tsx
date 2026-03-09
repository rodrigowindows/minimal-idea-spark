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

type AuthMode = 'login' | 'signup' | 'forgot';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
