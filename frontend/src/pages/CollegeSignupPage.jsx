import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../utils/api';
import { Mic, Eye, EyeOff } from 'lucide-react';

const CollegeSignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    admin_email: '',
    admin_password: '',
    admin_full_name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/colleges/create', formData);
      await login(formData.admin_email, formData.admin_password);
      toast.success('College registered successfully!');
      navigate('/college/dashboard');
    } catch (error) {
      console.error("Registration error:", error);
      const detail = error.response?.data?.detail;
      let errorMessage = 'Registration failed';

      if (Array.isArray(detail)) {
        // Handle FastAPI validation errors
        errorMessage = detail.map(err => {
          const field = err.loc[err.loc.length - 1];
          return `${field}: ${err.msg}`;
        }).join(', ');
      } else if (typeof detail === 'string') {
        errorMessage = detail;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-ar-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Mic className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-brand-gradient">Viva Platform</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Create College Account</h1>
          <p className="text-muted-foreground">Register your institution to get started</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form data-testid="signup-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">College Name</label>
              <Input
                data-testid="college-name-input"
                type="text"
                placeholder="Your College Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="bg-muted/50 border-border focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Admin Full Name</label>
              <Input
                data-testid="admin-name-input"
                type="text"
                placeholder="Admin Name"
                value={formData.admin_full_name}
                onChange={(e) => setFormData({...formData, admin_full_name: e.target.value})}
                required
                className="bg-muted/50 border-border focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Admin Email</label>
              <Input
                data-testid="admin-email-input"
                type="email"
                placeholder="admin@college.edu"
                value={formData.admin_email}
                onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                required
                className="bg-muted/50 border-border focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Password</label>
              <div className="relative">
                <Input
                  data-testid="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
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

            <Button
              data-testid="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-success-gradient text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all mt-4"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeSignupPage;