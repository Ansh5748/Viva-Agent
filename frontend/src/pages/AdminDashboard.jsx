import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Users, School, BookOpen, CheckCircle, Mic, LogOut, Sun, Moon } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState(null);
  const [pendingSubs, setPendingSubs] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'global_admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [statsRes, subsRes] = await Promise.all([
        api.get('/analytics/global'),
        api.get('/subscriptions/pending'),
      ]);
      setStats(statsRes.data);
      setPendingSubs(subsRes.data || []);
    } catch (error) {
      toast.error('Failed to load admin data.');
    }
  };

  const handleApprove = async (subId) => {
    try {
      await api.post(`/subscriptions/${subId}/approve`);
      toast.success('Subscription approved!');
      loadData();
    } catch (error) {
      toast.error('Failed to approve subscription.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">
                Admin Central
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                Welcome, {user?.full_name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Global Overview</h1>
          <p className="text-muted-foreground">Monitor platform growth and approve institutional access.</p>
        </header>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: <School />, label: 'Institutions', value: stats.total_colleges, gradient: 'bg-brand-gradient' },
              { icon: <CheckCircle />, label: 'Active Licenses', value: stats.active_colleges, gradient: 'bg-success-gradient' },
              { icon: <Users />, label: 'Total Students', value: stats.total_students, gradient: 'bg-ar-gradient' },
              { icon: <BookOpen />, label: 'Exams Conducted', value: stats.total_exams, gradient: 'bg-food-gradient' },
            ].map((stat, index) => (
              <div key={index} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow card-hover">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${stat.gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    {React.cloneElement(stat.icon, { className: 'w-6 h-6' })}
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Pending Approvals</h2>
            <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20">
              {pendingSubs.length} Action Required
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-6 py-4 font-semibold text-sm">Institution ID</th>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Plan Level</th>
                    <th className="text-left px-6 py-4 font-semibold text-sm">Reference</th>
                    <th className="text-right px-6 py-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingSubs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center px-6 py-16 text-muted-foreground italic">
                        All clear! No pending subscriptions at the moment.
                      </td>
                    </tr>
                  ) : (
                    pendingSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{sub.college_id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                            sub.plan_name === 'premium' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {sub.plan_name?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{sub.custom_payment_details}</td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            onClick={() => handleApprove(sub.id)}
                            className="bg-brand-gradient text-white hover:opacity-90 btn-hover"
                            size="sm"
                          >
                            Approve Access
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;