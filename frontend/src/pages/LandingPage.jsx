import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { Mic, Users, BarChart3, Shield, Clock, Award, Sun, Moon, CheckCircle2 } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ar-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">
                Viva Platform
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Button 
                data-testid="login-btn"
                onClick={() => navigate('/login')} 
                variant="ghost" 
                className="hidden sm:inline-flex"
              >
                Login
              </Button>
              <Button 
                data-testid="signup-btn"
                onClick={() => navigate('/college-signup')} 
                className="bg-success-gradient text-white hover:opacity-90 transition-opacity shadow-md"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            New: AI Voice Evaluation 2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            The Future of <br />
            <span className="bg-clip-text text-transparent bg-brand-gradient inline-block">
              Voice Examinations
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Conduct fair, automated, and secure viva examinations with our advanced 
            AI voice technology. Save thousands of hours in manual evaluation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => navigate('/college-signup')} 
              size="lg" 
              className="h-14 px-8 text-lg rounded-2xl bg-food-gradient text-white shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              Start institutional Trial
            </Button>
            <Button 
              onClick={() => navigate('/login')} 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-lg rounded-2xl border-2"
            >
              Request Demo
            </Button>
          </div>
          
          <div className="mt-16 flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
            {['Trusted by 50+ Institutions', 'GDPR Compliant', '99.9% Accuracy'].map((item, i) => (
              <span key={i} className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-primary" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Modern Education</h2>
            <p className="text-muted-foreground">Everything you need to modernize your examination workflow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Mic className="w-8 h-8" />,
                title: 'Multi-lingual Voice AI',
                description: 'Advanced recognition for English, Hindi, and Hinglish with natural processing.',
                gradient: 'bg-ar-gradient'
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Smart Student Batches',
                description: 'Automated scheduling and attendance tracking for large student groups.',
                gradient: 'bg-food-gradient'
              },
              {
                icon: <Award className="w-8 h-8" />,
                title: 'Instant AI Evaluation',
                description: 'Fair, consistent scoring with detailed performance feedback in real-time.',
                gradient: 'bg-success-gradient'
              },
            ].map((feature, index) => (
              <div 
                key={index} 
                className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5"
              >
                <div className={`w-16 h-16 ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">Choose a plan that scales with your institution</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Starter', price: '₹4,999', features: ['100 Students', '500 Exams/mo', 'Email Support'] },
              { name: 'Pro', price: '₹9,999', features: ['500 Students', '2,000 Exams/mo', 'Priority Support'], popular: true },
              { name: 'Enterprise', price: 'Custom', features: ['Unlimited Students', 'Unlimited Exams', '24/7 Dedicated Support'] },
            ].map((plan, index) => (
              <div 
                key={index} 
                className={`relative p-8 rounded-3xl bg-card border ${plan.popular ? 'border-primary shadow-2xl shadow-primary/10' : 'border-border'} transition-all`}
              >
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-extrabold mb-6">
                  {plan.price}
                  {plan.price !== 'Custom' && <span className="text-lg font-normal text-muted-foreground">/mo</span>}
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-success-gradient" /> {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => navigate('/college-signup')} 
                  className={`w-full h-12 rounded-xl font-bold ${plan.popular ? 'bg-primary text-primary-foreground' : 'variant-outline'}`}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-ar-gradient rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div> 
            <span className="bg-clip-text text-lg font-bold bg-brand-gradient text-transparent inline-block">Viva Platform</span>
          </div>
          <p className="text-muted-foreground mb-4">© 2026 Viva Platform. Empowering Education with AI.</p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-primary transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;