import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../utils/api';
import { Mic, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Password reset successful!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-success-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
            <p className="text-muted-foreground mb-6">You can now login with your new password</p>
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
          <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form data-testid="reset-password-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">New Password</label>
              <div className="relative">
                <Input
                  data-testid="new-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-muted/50 border-border focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Confirm New Password</label>
              <div className="relative">
                <Input
                  data-testid="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-muted/50 border-border focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand-gradient text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all mt-4"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;