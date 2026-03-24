import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Mic, ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Sun, Moon } from 'lucide-react';

const plans = [
  { name: 'Starter', price: '4,999', id: 'basic', students: '100 Students', exams: '500 Exams/mo' },
  { name: 'Pro', price: '9,999', id: 'standard', students: '500 Students', exams: '2,000 Exams/mo', popular: true },
  { name: 'Enterprise', price: '19,999', id: 'premium', students: 'Unlimited Students', exams: 'Unlimited Exams' },
];

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, college } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('custom');
  const [customDetails, setCustomDetails] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!college) {
      toast.error("College information not found.");
      return;
    }

    const payload = {
      college_id: college.id,
      plan_name: selectedPlan,
      payment_method: paymentMethod,
      custom_payment_details: paymentMethod === 'custom' ? customDetails : null,
    };

    try {
      await api.post('/subscriptions/create', payload);
      toast.success('Subscription request submitted. Please wait for admin approval.');
      navigate('/college/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit subscription.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-lg">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">Institutional Access</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/college/dashboard')} className="gap-2 rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Elevate Your Institution</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Select the plan that best fits your college's examination needs. All plans include full AI voice integration and real-time analytics.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12 animate-fade-in">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="relative">
                <RadioGroupItem value={plan.id} id={plan.id} className="peer sr-only" />
                <Label
                  htmlFor={plan.id}
                  className={`flex flex-col h-full rounded-3xl border-2 p-8 transition-all cursor-pointer card-hover ${
                    selectedPlan === plan.id 
                      ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/5' 
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-gradient text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg">
                      Recommended
                    </span>
                  )}
                  <div className="mb-6">
                    <span className="text-lg font-bold block mb-1">{plan.name}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold">₹{plan.price}</span>
                      <span className="text-sm text-muted-foreground font-medium">/month</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-success-gradient" /> {plan.students}
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-success-gradient" /> {plan.exams}
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-success-gradient" /> 24/7 Support
                    </li>
                  </ul>

                  <div className={`w-full py-3 rounded-xl text-center font-bold text-sm transition-colors ${
                    selectedPlan === plan.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedPlan === plan.id ? 'Selected Plan' : 'Choose Plan'}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Payment Method</h3>
                  <p className="text-sm text-muted-foreground">Secure your institutional license via manual transfer.</p>
                </div>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                <div className="flex items-center space-x-3 p-4 border border-border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex-1 cursor-pointer font-bold">Manual Transfer (UPI/NEFT)</Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border border-border rounded-xl opacity-50 cursor-not-allowed">
                  <RadioGroupItem value="razorpay" id="razorpay" disabled />
                  <Label htmlFor="razorpay" className="flex-1 font-bold">Razorpay (Online Payment)</Label>
                  <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter">Coming Soon</span>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === 'custom' && (
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-success-gradient/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Verification Details</h3>
                    <p className="text-sm text-muted-foreground">Provide payment reference for instant approval.</p>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-2xl mb-6 border border-border border-dashed">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Institutional UPI ID</p>
                  <p className="text-lg font-mono font-bold text-primary">8449910075@ybl</p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="customDetails" className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Transaction Reference</Label>
                  <Textarea
                    id="customDetails"
                    placeholder="Enter Transaction ID or UTR number"
                    value={customDetails}
                    onChange={(e) => setCustomDetails(e.target.value)}
                    required
                    className="bg-muted/50 border-border rounded-2xl h-24 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center pt-8">
            <Button 
              type="submit" 
              className="bg-brand-gradient text-white h-14 px-16 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform btn-hover"
            >
              Confirm Subscription Request
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default SubscriptionPage;