import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        toast({ title: 'Welcome back!' });
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!username.trim()) {
          toast({ title: 'Please enter a username', variant: 'destructive' });
          setLoading(false);
          return;
        }
        await signUp(email, password, username);
        toast({ title: 'Account created! Welcome to CBT Nexus.' });
        navigate('/dashboard');
      } else {
        await resetPassword(email);
        toast({ title: 'Password reset email sent! Check your inbox.' });
        setMode('login');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-16 w-16 rounded-xl" />
          </div>
          <CardTitle className="text-2xl gradient-text">
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to continue your preparation' : mode === 'signup' ? 'Join CBT Nexus and start preparing' : 'Enter your email to reset password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')} className="text-sm text-primary hover:underline block w-full">Forgot password?</button>
                <p className="text-sm text-muted-foreground">Don't have an account? <button onClick={() => setMode('signup')} className="text-primary hover:underline">Sign up</button></p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-sm text-muted-foreground">Already have an account? <button onClick={() => setMode('login')} className="text-primary hover:underline">Sign in</button></p>
            )}
            {mode === 'reset' && (
              <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline">Back to login</button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
