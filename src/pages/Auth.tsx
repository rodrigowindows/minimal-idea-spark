import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success('Login successful!');
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : 'Create Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Enter your credentials to access your account' : 'Create a new account to get started'}
          </CardDescription>
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
            <FormField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={formError ?? undefined}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto">
                  Sign up
                </Button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto">
                  Login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
