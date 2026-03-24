import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../utils/api';
import { Mic, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-success-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">We've sent a password reset link to {email}</p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-brand-gradient text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-brand-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Mic className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-brand-gradient">Viva Platform</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
          <p className="text-muted-foreground">Enter your email to receive a reset link</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form data-testid="forgot-password-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Address</label>
              <Input
                data-testid="email-input"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/50 border-border focus:ring-primary"
              />
            </div>

            <Button
              data-testid="submit-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand-gradient text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;