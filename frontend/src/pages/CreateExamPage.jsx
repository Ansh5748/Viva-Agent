import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mic, ArrowLeft, Settings, Users, Clock, Sun, Moon, Filter } from 'lucide-react';
import Select from 'react-select';

const CreateExamPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [allStudents, setAllStudents] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectionMode, setSelectionMode] = useState('custom'); // 'custom' | 'alphabetical'
  const [alphaRange, setAlphaRange] = useState({ start: 'A', end: 'F' });
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  
  const [formData, setFormData] = useState({
    name: '',
    student_ids: [],
    selected_subject: '',
    selected_topics: [],
    start_time: '',
    exam_config: {
      duration_minutes: 20,
      mode: 'global', // 'global' or 'topic_wise'
      total_easy: 3,
      total_medium: 4,
      total_hard: 2,
      topic_rules: []
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stuRes, qRes] = await Promise.all([
          api.get('/students/my-college'),
          api.get('/questions/my-college')
        ]);

        const sortedStudents = stuRes.data.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setAllStudents(sortedStudents);
        setStudentOptions(sortedStudents.map(s => ({ value: s.id, label: `${s.full_name} (${s.student_id})` })));

        setAvailableQuestions(qRes.data);
        
        // Extract unique subjects
        const uniqueSubjects = [...new Set(qRes.data.map(q => q.subject || 'General'))];
        setSubjects(uniqueSubjects.map(s => ({ value: s, label: s })));

        // Extract unique batches
        const uniqueBatches = [...new Set(stuRes.data.map(s => s.batch).filter(Boolean))];
        setBatches(uniqueBatches.map(b => ({ value: b, label: b })));

      } catch (error) {
        toast.error('Failed to load initial data.');
      }
    };
    fetchData();
  }, []);
  
  // Filter student options and handle selection modes
  useEffect(() => {
    // 1. Filter all students based on selected batches
    let filteredStudents = allStudents;
    if (selectedBatches.length > 0) {
      const batchValues = selectedBatches.map(b => b.value);
      filteredStudents = allStudents.filter(s => batchValues.includes(s.batch));
    }

    // Update the dropdown options for 'custom' mode
    setStudentOptions(filteredStudents.map(s => ({ value: s.id, label: `${s.full_name} (${s.student_id})` })));

    // 2. Handle selection based on mode
    if (selectionMode === 'alphabetical') {
      const startChar = alphaRange.start.charCodeAt(0);
      const endChar = alphaRange.end.charCodeAt(0);
      
      // Ensure start <= end for logic
      const actualStart = Math.min(startChar, endChar);
      const actualEnd = Math.max(startChar, endChar);

      const selectedIds = filteredStudents
        .filter(s => {
          const firstChar = s.full_name.trim().toUpperCase().charCodeAt(0);
          return firstChar >= actualStart && firstChar <= actualEnd;
        })
        .map(s => s.id);
      
      setFormData(prev => ({ ...prev, student_ids: selectedIds }));
    } else {
      // In custom mode, we retain existing selections if they are still in the filtered list (valid for the batch)
      setFormData(prev => ({
        ...prev,
        student_ids: prev.student_ids.filter(id => filteredStudents.find(s => s.id === id))
      }));
    }
  }, [selectedBatches, allStudents, selectionMode, alphaRange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      exam_config: { ...prev.exam_config, [name]: parseInt(value) || 0 },
    }));
  };

  const handleStudentSelect = (selectedOptions) => {
    setFormData(prev => ({ ...prev, student_ids: selectedOptions.map(o => o.value) }));
  };

  const handleSubjectSelect = (option) => {
    setFormData(prev => ({ 
      ...prev, 
      selected_subject: option.value,
      selected_topics: [],
      exam_config: { ...prev.exam_config, topic_rules: [] }
    }));
    
    // Filter topics for this subject
    const subjectQs = availableQuestions.filter(q => (q.subject || 'General') === option.value);
    const uniqueTopics = [...new Set(subjectQs.map(q => q.topic || 'General'))];
    setTopics(uniqueTopics.map(t => ({ value: t, label: t })));
  };

  const handleTopicSelect = (selectedOptions) => {
    const newTopics = selectedOptions.map(o => o.value);
    setFormData(prev => {
      // Initialize rules for new topics
      const currentRules = prev.exam_config.topic_rules;
      const newRules = newTopics.map(t => {
        const existing = currentRules.find(r => r.topic === t);
        return existing || { topic: t, easy_count: 1, medium_count: 1, hard_count: 1 };
      });

      return {
        ...prev,
        selected_topics: newTopics,
        exam_config: { ...prev.exam_config, topic_rules: newRules }
      };
    });
  };

  const handleTopicRuleChange = (topic, field, value) => {
    setFormData(prev => ({
      ...prev,
      exam_config: {
        ...prev.exam_config,
        topic_rules: prev.exam_config.topic_rules.map(r => 
          r.topic === topic ? { ...r, [field]: parseInt(value) || 0 } : r
        )
      }
    }));
  };

  const handleBatchSelect = (options) => {
    setSelectedBatches(options || []);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exam-sets/create', formData);
      toast.success('Exam set created successfully!');
      navigate('/college/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create exam set.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ar-gradient rounded-lg flex items-center justify-center shadow-lg">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">Viva Scheduler</span>
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

      <main className="max-w-4xl mx-auto p-6 lg:p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Create New Exam Set</h1>
          <p className="text-muted-foreground mt-1">Configure your AI-powered viva session and select eligible students.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Session Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., Computer Science Finals - Batch A"
                value={formData.name} 
                onChange={handleChange} 
                required 
                className="bg-muted/50 border-border h-12 rounded-xl focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                <Select
                  options={subjects}
                  onChange={handleSubjectSelect}
                  placeholder="Select Subject..."
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', minHeight: '3rem' }),
                    menu: (base) => ({ ...base, backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? 'hsl(var(--muted))' : 'transparent', color: 'hsl(var(--foreground))' }),
                    singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' })
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Topics (Optional)</Label>
                <Select
                  isMulti
                  options={topics}
                  onChange={handleTopicSelect}
                  value={topics.filter(t => formData.selected_topics.includes(t.value))}
                  placeholder="Select Topics..."
                  isDisabled={!formData.selected_subject}
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', minHeight: '3rem' }),
                    menu: (base) => ({ ...base, backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? 'hsl(var(--muted))' : 'transparent', color: 'hsl(var(--foreground))' }),
                    multiValue: (base) => ({ ...base, backgroundColor: 'hsl(var(--primary) / 0.1)', borderRadius: '0.5rem' }),
                    multiValueLabel: (base) => ({ ...base, color: 'hsl(var(--primary))', fontWeight: '600' })
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Filter by Batch
                </Label>
                <Select
                  isMulti
                  options={batches}
                  onChange={handleBatchSelect}
                  placeholder="Select Batches..."
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', minHeight: '3rem' }),
                    menu: (base) => ({ ...base, backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? 'hsl(var(--muted))' : 'transparent', color: 'hsl(var(--foreground))' }),
                    multiValue: (base) => ({ ...base, backgroundColor: 'hsl(var(--primary) / 0.1)', borderRadius: '0.5rem' }),
                    multiValueLabel: (base) => ({ ...base, color: 'hsl(var(--primary))', fontWeight: '600' })
                  }}
                />
              </div>
              
            <div className="grid grid-cols-1 gap-6 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="start_time" className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Start Time
                </Label>
                <Input 
                  id="start_time" 
                  name="start_time" 
                  type="datetime-local" 
                  value={formData.start_time} 
                  onChange={handleChange} 
                  required 
                  className="bg-muted/50 border-border h-12 rounded-xl"
                />
              </div>
            </div>
          </div>

            <div className="grid gap-2 pt-2">
                <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> Eligible Students
                </Label>
                
                {/* Selection Mode Tabs */}
                <div className="flex gap-4 mb-2">
                  <Button
                    type="button"
                    variant={selectionMode === 'custom' ? 'default' : 'outline'}
                    onClick={() => setSelectionMode('custom')}
                    className="flex-1 rounded-xl"
                  >
                    Manual Selection
                  </Button>
                  <Button
                    type="button"
                    variant={selectionMode === 'alphabetical' ? 'default' : 'outline'}
                    onClick={() => setSelectionMode('alphabetical')}
                    className="flex-1 rounded-xl"
                  >
                    Alphabetical Range
                  </Button>
                </div>

                {selectionMode === 'alphabetical' ? (
                  <div className="p-6 border border-border rounded-xl bg-muted/30 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs font-bold mb-2 block">Start Letter</Label>
                        <select 
                          className="w-full h-12 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={alphaRange.start}
                          onChange={(e) => setAlphaRange(prev => ({ ...prev, start: e.target.value }))}
                        >
                          {alphabet.map(char => <option key={char} value={char}>{char}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center pt-6 text-muted-foreground font-bold">TO</div>
                      <div className="flex-1">
                        <Label className="text-xs font-bold mb-2 block">End Letter</Label>
                        <select 
                          className="w-full h-12 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={alphaRange.end}
                          onChange={(e) => setAlphaRange(prev => ({ ...prev, end: e.target.value }))}
                        >
                          {alphabet.map(char => <option key={char} value={char}>{char}</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium text-center bg-background/50 p-2 rounded-lg border border-border">
                      {formData.student_ids.length} students selected in range {alphaRange.start}-{alphaRange.end}
                    </p>
                  </div>
                ) : (
                  <Select
                    isMulti
                    options={studentOptions}
                    value={studentOptions.filter(o => formData.student_ids.includes(o.value))}
                    onChange={handleStudentSelect}
                    placeholder="Search and select students..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: 'transparent',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.75rem',
                        minHeight: '3rem',
                        boxShadow: 'none',
                        '&:hover': { borderColor: 'hsl(var(--primary))' }
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused ? 'hsl(var(--muted))' : 'transparent',
                        color: 'hsl(var(--foreground))',
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                        borderRadius: '0.5rem',
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: 'hsl(var(--primary))',
                        fontWeight: '600',
                      })
                    }}
                  />
                )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Exam Configuration</h3>
                <p className="text-sm text-muted-foreground">Define the complexity and duration of each viva.</p>
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Question Selection Mode</Label>
              <div className="flex gap-4">
                <Button 
                  type="button"
                  variant={formData.exam_config.mode === 'global' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, exam_config: { ...prev.exam_config, mode: 'global' } }))}
                  className="flex-1"
                >
                  Global Distribution (Mix)
                </Button>
                <Button 
                  type="button"
                  variant={formData.exam_config.mode === 'topic_wise' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, exam_config: { ...prev.exam_config, mode: 'topic_wise' } }))}
                  className="flex-1"
                  disabled={formData.selected_topics.length === 0}
                >
                  Topic-wise Rules
                </Button>
              </div>
            </div>

            {formData.exam_config.mode === 'global' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { name: 'total_easy', label: 'Total Easy', color: 'text-emerald-500' },
                  { name: 'total_medium', label: 'Total Medium', color: 'text-orange-500' },
                  { name: 'total_hard', label: 'Total Hard', color: 'text-red-500' },
                  { name: 'duration_minutes', label: 'Duration (Mins)', color: 'text-blue-500' },
                ].map((field) => (
                  <div key={field.name} className="grid gap-2">
                    <Label htmlFor={field.name} className={`text-xs font-bold uppercase tracking-wider ${field.color}`}>{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={formData.exam_config[field.name]}
                      onChange={handleConfigChange}
                      className="bg-muted/50 border-border h-12 rounded-xl font-bold"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-blue-500">Duration (Mins)</Label>
                  <Input
                    name="duration_minutes"
                    type="number"
                    value={formData.exam_config.duration_minutes}
                    onChange={handleConfigChange}
                    className="bg-muted/50 border-border h-12 rounded-xl font-bold max-w-[200px]"
                  />
                </div>
                {formData.exam_config.topic_rules.map((rule, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-xl bg-muted/30">
                    <h4 className="font-bold mb-3">{rule.topic}</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label className="text-xs text-emerald-500">Easy</Label><Input type="number" value={rule.easy_count} onChange={(e) => handleTopicRuleChange(rule.topic, 'easy_count', e.target.value)} className="h-10" /></div>
                      <div><Label className="text-xs text-orange-500">Medium</Label><Input type="number" value={rule.medium_count} onChange={(e) => handleTopicRuleChange(rule.topic, 'medium_count', e.target.value)} className="h-10" /></div>
                      <div><Label className="text-xs text-red-500">Hard</Label><Input type="number" value={rule.hard_count} onChange={(e) => handleTopicRuleChange(rule.topic, 'hard_count', e.target.value)} className="h-10" /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => navigate('/college/dashboard')}
              className="h-12 px-8 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-success-gradient text-white h-12 px-10 rounded-xl font-bold shadow-lg shadow-primary/20 btn-hover"
            >
              Initialize Exam Set
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateExamPage;