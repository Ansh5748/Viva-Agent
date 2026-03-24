import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import api from '../utils/api';
import {
  Mic, Upload, Users, BookOpen, Calendar, BarChart3, 
  LogOut, FileText, CheckCircle, Clock, TrendingUp, Plus, Sun, Moon, Trash2, Folder, ChevronRight, ChevronDown, X, Search, Filter, ArrowUpDown, Edit2, Save, Activity, Layers, PieChart, Award, MessageSquare
} from 'lucide-react';

const CollegeDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [college, setCollege] = useState(null);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [examSets, setExamSets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [viewingExamSet, setViewingExamSet] = useState(null); // For modal
  const [selectedReportExam, setSelectedReportExam] = useState(null); // For detailed report modal

  // Student Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBatchFilter, setStudentBatchFilter] = useState('all');
  const [studentSort, setStudentSort] = useState('name_asc'); // name_asc, name_desc

  useEffect(() => {
    if (!user || user.role !== 'college_admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [collegeRes, studentsRes, questionsRes, examSetsRes, analyticsRes] = await Promise.all([
        api.get('/colleges/my'),
        api.get('/students/my-college'),
        api.get('/questions/my-college'),
        api.get('/exam-sets/my-college'),
        api.get('/analytics/college')
      ]);

      setCollege(collegeRes.data);
      setStudents(studentsRes.data || []);
      setQuestions(questionsRes.data || []);
      setExamSets(examSetsRes.data || []);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const toastId = toast.loading("Uploading students...");

    try {
      await api.post('/students/bulk-upload', formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      await loadData();
      toast.success('Students uploaded successfully!', { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed', { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset file input to allow re-uploading the same file
    }
  };

  const handleQuestionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const toastId = toast.loading("Uploading questions...");

    try {
      await api.post('/questions/bulk-upload', formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      await loadData();
      toast.success('Questions uploaded successfully!', { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed', { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset file input
    }
  };

  const handleDeleteStudent = async (id) => {
    if(!window.confirm("Are you sure? This will delete the student's account.")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Student deleted");
      loadData();
    } catch (e) { toast.error("Failed to delete"); }
  };

  const handleDeleteQuestion = async (id) => {
    if(!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/questions/${id}`);
      toast.success("Question deleted");
      loadData();
    } catch (e) { toast.error("Failed to delete"); }
  };

  const handleViewDetails = async (setId) => {
    const toastId = toast.loading("Fetching exam details...");
    try {
      const res = await api.get(`/exam-sets/${setId}`);
      setViewingExamSet(res.data);
      toast.success("Details loaded", { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to fetch details", { id: toastId });
    }
  };

  const closeDetailModal = () => {
    setViewingExamSet(null);
  };

  const handleDeleteExamSet = async (id) => {
    if(!window.confirm("Are you sure? This will delete the exam set and all associated student schedules.")) return;
    try {
      await api.delete(`/exam-sets/${id}`);
      toast.success("Exam set deleted");
      loadData();
    } catch (e) { toast.error("Failed to delete exam set"); }
  };

  const handleViewDetailedReport = async (examId) => {
    const toastId = toast.loading("Loading full report...");
    try {
      const res = await api.get(`/viva-exams/${examId}/report`);
      setSelectedReportExam(res.data);
      toast.dismiss(toastId);
    } catch (error) {
      toast.error("Failed to load report", { id: toastId });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-xl">Initializing Dashboard...</div>
      </div>
    );
  }

  // Group questions by Subject -> Topic
  const groupedQuestions = questions.reduce((acc, q) => {
    const sub = q.subject || 'General';
    const top = q.topic || 'General';
    if (!acc[sub]) acc[sub] = {};
    if (!acc[sub][top]) acc[sub][top] = [];
    acc[sub][top].push(q);
    return acc;
  }, {});

  const toggleSubject = (sub) => setExpandedSubjects(prev => ({...prev, [sub]: !prev[sub]}));
  const toggleTopic = (sub, top) => setExpandedTopics(prev => ({...prev, [`${sub}-${top}`]: !prev[`${sub}-${top}`]}));

  // Filter and Sort Students
  const getFilteredStudents = () => {
    let result = [...students];

    if (studentSearch) {
      const lowerTerm = studentSearch.toLowerCase();
      result = result.filter(s => 
        s.full_name.toLowerCase().includes(lowerTerm) || 
        s.email.toLowerCase().includes(lowerTerm) || 
        (s.phone_number && s.phone_number.includes(lowerTerm))
      );
    }

    if (studentBatchFilter !== 'all') {
      result = result.filter(s => s.batch === studentBatchFilter);
    }

    result.sort((a, b) => {
      if (studentSort === 'name_asc') return a.full_name.localeCompare(b.full_name);
      if (studentSort === 'name_desc') return b.full_name.localeCompare(a.full_name);
      return 0;
    });

    return result;
  };

  const filteredStudents = getFilteredStudents();
  const uniqueBatches = [...new Set(students.map(s => s.batch).filter(Boolean))];

  // Analytics Calculations
  const totalCompleted = analytics?.completed_exams || 0;
  const avgScore = analytics?.average_score || 0;

  // Calculate Subject Performance
  const subjectStats = analytics?.student_reports?.reduce((acc, report) => {
    const sub = report.subject || 'General';
    if (!acc[sub]) acc[sub] = { total: 0, count: 0, exams: 0 };
    acc[sub].total += report.score;
    acc[sub].count += 1;
    return acc;
  }, {}) || {};

  // Top Performers
  const topPerformers = analytics?.student_reports
    ? [...analytics.student_reports].sort((a, b) => b.score - a.score).slice(0, 5)
    : [];


  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar (Mobile friendly) */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        <aside className="w-full lg:w-64 bg-card border-r border-border p-6 lg:sticky lg:top-0 lg:h-screen flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-ar-gradient rounded-xl flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient">Viva Pro</span>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'overview', icon: <BarChart3 />, label: 'Overview' },
              { id: 'students', icon: <Users />, label: 'Students' },
              { id: 'questions', icon: <FileText />, label: 'Question Bank' },
              { id: 'exams', icon: <Calendar />, label: 'Exam Sets' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-border">
            <div className="p-4 bg-muted/50 rounded-xl mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Institution</p>
              <p className="text-sm font-bold truncate">{college?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="w-5 h-5" /> Logout
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-xl flex-shrink-0"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Welcome, Admin</h1>
                  <p className="text-muted-foreground">Here's what's happening at {college?.name} today.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => setShowAnalyticsModal(true)} variant="outline" className="rounded-xl gap-2">
                      <PieChart className="w-4 h-4" /> Reports & Analytics
                  </Button>
                  <Button onClick={() => navigate('/create-exam')} className="bg-success-gradient text-white btn-hover rounded-xl gap-2">
                    <Plus className="w-4 h-4" /> Create Exam
                  </Button>
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Students', value: students.length, icon: <Users />, gradient: 'bg-ar-gradient' },
                  { label: 'Questions', value: questions.length, icon: <FileText />, gradient: 'bg-food-gradient' },
                  { label: 'Exam Sets', value: examSets.length, icon: <Calendar />, gradient: 'bg-brand-gradient' },
                  { label: 'Avg Score', value: `${avgScore}/10`, icon: <TrendingUp />, gradient: 'bg-success-gradient' },
                ].map((stat, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm card-hover">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${stat.gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                        {React.cloneElement(stat.icon, { className: 'w-6 h-6' })}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Department / Subject Performance */}
                <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" /> Subject Performance
                  </h3>
                  <div className="space-y-4">
                    {Object.keys(subjectStats).length > 0 ? Object.keys(subjectStats).map((subject, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {subject.charAt(0)}
                            </div>
                            <span className="font-bold">{subject}</span>
                          </div>
                          <div className="text-right">
                            <span className="block font-bold text-lg text-primary">{(subjectStats[subject].total / subjectStats[subject].count).toFixed(1)}/10</span>
                            <span className="text-xs text-muted-foreground">Avg Score ({subjectStats[subject].count} Tests)</span>
                          </div>
                        </div>
                      )) : <p className="text-muted-foreground">No data available yet.</p>}
                  </div>
                </div>

                {/* Recent Activity / Top Students */}
                <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-500" /> Recent Activity
                  </h3>
                  <div className="space-y-6 relative">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border"></div>
                    {analytics?.student_reports?.slice(0, 5).map((report, i) => (
                      <div key={i} className="relative pl-8">
                        <div className="absolute left-[0.35rem] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                        <p className="text-sm font-bold">{report.student_name} - {report.exam_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                    {(!analytics?.student_reports || analytics.student_reports.length === 0) && (
                      <p className="text-muted-foreground pl-8">No recent activity.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6 animate-fade-in">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Student Management</h2>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleStudentUpload}
                    className="hidden"
                    id="student-upload"
                    disabled={isUploading}
                  />
                  <label 
                    htmlFor="student-upload" 
                    className={`flex items-center gap-2 bg-success-gradient text-white px-6 py-3 rounded-xl shadow-lg hover:opacity-90 transition-all font-bold btn-hover ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isUploading ? 'Uploading...' : <><Upload className="w-5 h-5" /> Bulk Upload Students</>}
                  </label>
                </div>
              </header>

              {/* Filters and Sort */}
              <div className="flex flex-col md:flex-row gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, or phone..." 
                    className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="relative min-w-[150px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select 
                      className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={studentBatchFilter}
                      onChange={(e) => setStudentBatchFilter(e.target.value)}
                    >
                      <option value="all">All Batches</option>
                      {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => setStudentSort(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc')}
                    className="flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors"
                  >
                    <ArrowUpDown className="w-4 h-4" /> {studentSort === 'name_asc' ? 'A-Z' : 'Z-A'}
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-4 font-bold text-sm whitespace-nowrap">Student ID</th>
                        <th className="text-left px-4 py-4 font-bold text-sm whitespace-nowrap">Full Name</th>
                        <th className="text-left px-4 py-4 font-bold text-sm whitespace-nowrap">Email</th>
                        <th className="text-left px-4 py-4 font-bold text-sm whitespace-nowrap">Phone</th>
                        <th className="text-left px-4 py-4 font-bold text-sm whitespace-nowrap">Password</th>
                        <th className="text-left px-4 py-4 font-bold text-sm whitespace-nowrap">Batch</th>
                        <th className="text-right px-4 py-4 font-bold text-sm whitespace-nowrap"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-20 text-muted-foreground italic">No students found matching your criteria.</td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-4 font-bold text-primary whitespace-nowrap">{s.student_id}</td>
                            <td className="px-4 py-4 font-medium whitespace-nowrap">{s.full_name}</td>
                            <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{s.email}</td>
                            <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{s.phone_number || 'N/A'}</td>
                            <td className="px-4 py-4 font-mono text-muted-foreground whitespace-nowrap">{s.password || 'Student@123'}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {s.batch ? (
                                <span className="px-3 py-1 bg-muted rounded-full text-xs font-bold">{s.batch}</span>
                              ) : (<span className="text-muted-foreground">N/A</span>)}
                            </td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(s.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-6 animate-fade-in">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Question Bank</h2>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleQuestionUpload}
                    className="hidden"
                    id="question-upload"
                    disabled={isUploading}
                  />
                  <label 
                    htmlFor="question-upload" 
                    className={`flex items-center gap-2 bg-success-gradient text-white px-6 py-3 rounded-xl shadow-lg hover:opacity-90 transition-all font-bold btn-hover ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isUploading ? 'Uploading...' : <><Upload className="w-5 h-5" /> Bulk Upload Questions</>}
                  </label>
                </div>
              </header>

              <div className="space-y-4">
                {Object.keys(groupedQuestions).length === 0 ? (
                  <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl text-muted-foreground">
                    Question bank is empty. Upload questions to get started.
                  </div>
                ) : (
                  Object.entries(groupedQuestions).map(([subject, topics]) => (
                    <div key={subject} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div 
                        className="p-4 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleSubject(subject)}
                      >
                        <div className="flex items-center gap-3">
                          <Folder className="w-5 h-5 text-primary" />
                          <h3 className="font-bold text-lg">{subject}</h3>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{Object.values(topics).flat().length} Qs</span>
                        </div>
                        {expandedSubjects[subject] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>

                      {expandedSubjects[subject] && (
                        <div className="p-4 space-y-3 bg-card">
                          {Object.entries(topics).map(([topic, qs]) => (
                            <div key={topic} className="border border-border rounded-xl overflow-hidden">
                              <div 
                                className="p-3 bg-muted/10 flex items-center justify-between cursor-pointer hover:bg-muted/20"
                                onClick={() => toggleTopic(subject, topic)}
                              >
                                <div className="flex items-center gap-2 pl-4">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{topic}</span>
                                  <span className="text-xs text-muted-foreground">({qs.length})</span>
                                </div>
                                {expandedTopics[`${subject}-${topic}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </div>

                              {expandedTopics[`${subject}-${topic}`] && (
                                <div className="divide-y divide-border">
                                  {qs.map(q => (
                                    <div key={q.id} className="p-3 pl-10 flex justify-between items-center hover:bg-muted/10 text-sm">
                                      <div className="flex-1">
                                        <p className="font-medium">{q.question_text}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Ans: {q.answer_key}</p>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                                          q.difficulty_level === 'hard' ? 'bg-red-100 text-red-600' : 
                                          q.difficulty_level === 'medium' ? 'bg-orange-100 text-orange-600' : 
                                          'bg-green-100 text-green-600'
                                        }`}>{q.difficulty_level}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-6 animate-fade-in">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Examination Sets</h2>
                <Button onClick={() => navigate('/create-exam')} className="bg-success-gradient text-white font-bold rounded-xl shadow-lg px-8 h-12 btn-hover">
                  Schedule New Set
                </Button>
              </header>

              <div className="grid md:grid-cols-2 gap-6">
                {examSets.length === 0 ? (
                  <div className="md:col-span-2 text-center py-20 bg-card border border-dashed border-border rounded-3xl text-muted-foreground">
                    No examination sets scheduled. Start by creating one!
                  </div>
                ) : (
                  examSets.map((set) => (
                    <div key={set.id} className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all card-hover">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold">{set.name}</h4>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-success-gradient/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/20">Active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div className="flex items-center gap-2 text-muted-foreground col-span-2"><Calendar className="w-4 h-4" /> {new Date(set.start_time).toLocaleString()}</div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" /> <span>{set.exam_config?.duration_minutes || 0} Minutes</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" /> <span>{set.student_ids?.length || 0} Students</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleViewDetails(set.id)} variant="outline" className="flex-1 rounded-xl border-2 font-bold hover:bg-muted">View Details</Button>
                        <Button onClick={() => handleDeleteExamSet(set.id)} variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Exam Set Detail Modal */}
      {viewingExamSet && (
        <ExamSetDetailModal 
          examSetDetails={viewingExamSet}
          allStudents={students}
          onClose={closeDetailModal}
          onUpdate={loadData}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <AnalyticsModal
          analytics={analytics}
          topPerformers={topPerformers}
          onClose={() => setShowAnalyticsModal(false)}
          onViewReport={handleViewDetailedReport}
        />
      )}

      {/* Detailed Report Modal */}
      {selectedReportExam && (
        <DetailedReportModal 
          report={selectedReportExam} 
          onClose={() => setSelectedReportExam(null)} 
        />
      )}
    </div>
  );
};

const AnalyticsModal = ({ analytics, topPerformers, onClose, onViewReport }) => {
  const [expandedExam, setExpandedExam] = useState(null);

  const reportsByExamSet = (analytics?.student_reports || []).reduce((acc, report) => {
    const setId = report.exam_set_id || 'unknown';
    if (!acc[setId]) {
      acc[setId] = {
        exam_name: report.exam_name || 'General/Practice Exams',
        reports: []
      };
    }
    acc[setId].reports.push(report);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        <header className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-xl font-bold">Reports & Analytics</h3>
            <p className="text-sm text-muted-foreground">Deep dive into student performance and exam metrics.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
        </header>

        <div className="p-6 overflow-y-auto space-y-8">
          {/* Top Performers Chart */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-8">
              <Award className="w-5 h-5 text-yellow-500" /> Top Performing Students
            </h3>
            <div className="flex items-end gap-4 h-64 w-full overflow-x-auto pb-4">
              {topPerformers.length > 0 ? topPerformers.map((student, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 min-w-[80px] flex-1 group">
                  <div className="relative w-full bg-muted/30 rounded-t-xl overflow-hidden h-full flex items-end justify-center group-hover:bg-muted/50 transition-colors">
                    <div 
                      className="w-full mx-2 bg-brand-gradient rounded-t-lg transition-all duration-1000 relative group-hover:opacity-90"
                      style={{ height: `${(student.score / (student.max_score || 10)) * 100}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-sm bg-background border border-border px-2 py-0.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        {student.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-center truncate w-full px-1">{student.student_name}</p>
                  <p className="text-[10px] text-muted-foreground">{student.exam_name}</p>
                </div>
              )) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No performance data available</div>
              )}
            </div>
          </div>

          {/* Detailed Exam Reports Table */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6">All Exam Reports</h3>
            <div className="space-y-4">
              {Object.keys(reportsByExamSet).length > 0 ? (
                Object.entries(reportsByExamSet).map(([setId, data]) => (
                  <div key={setId} className="border border-border rounded-2xl overflow-hidden">
                    <button 
                      className="w-full p-4 bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedExam(expandedExam === setId ? null : setId)}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5 text-primary" />
                        <h4 className="font-bold">{data.exam_name}</h4>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{data.reports.length} Students</span>
                      </div>
                      {expandedExam === setId ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {expandedExam === setId && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="text-left px-6 py-3 font-bold text-sm">Student</th>
                              <th className="text-left px-6 py-3 font-bold text-sm">Score</th>
                              <th className="text-left px-6 py-3 font-bold text-sm">Date</th>
                              <th className="text-right px-6 py-3 font-bold text-sm">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-sm">
                            {data.reports.map((report) => (
                              <tr key={report.viva_exam_id} className="hover:bg-muted/30">
                                <td className="px-6 py-3 font-medium">{report.student_name} <span className="text-xs text-muted-foreground">({report.student_id})</span></td>
                                <td className="px-6 py-3 font-bold text-primary">{report.score.toFixed(1)} / {report.max_score.toFixed(0)}</td>
                                <td className="px-6 py-3 text-muted-foreground">{new Date(report.date).toLocaleDateString()}</td>
                                <td className="px-6 py-3 text-right">
                                  <Button size="sm" variant="outline" onClick={() => onViewReport(report.viva_exam_id)} className="rounded-lg text-xs">
                                    View Full Report
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No completed exams yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExamSetDetailModal = ({ examSetDetails, allStudents, onClose, onUpdate }) => {
  const { exam_set, students } = examSetDetails;
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(exam_set.start_time ? new Date(exam_set.start_time).toISOString().slice(0, 16) : '');
  const [currentStudentIds, setCurrentStudentIds] = useState(exam_set.student_ids || []);
  const [studentToAdd, setStudentToAdd] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'scheduled': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSave = async () => {
    try {
      await api.patch(`/exam-sets/${exam_set.id}`, {
        start_time: startTime,
        student_ids: currentStudentIds
      });
      toast.success("Exam set updated successfully");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update exam set");
    }
  };

  const handleAddStudent = () => {
    if (studentToAdd && !currentStudentIds.includes(studentToAdd)) {
      setCurrentStudentIds([...currentStudentIds, studentToAdd]);
      setStudentToAdd('');
    }
  };

  const handleRemoveStudent = (id) => {
    setCurrentStudentIds(currentStudentIds.filter(sid => sid !== id));
  };

  // Filter students available to add (not already in the list)
  const availableStudents = allStudents.filter(s => !currentStudentIds.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <header className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{exam_set.name}</h3>
            <p className="text-sm text-muted-foreground">{isEditing ? 'Edit Schedule & Students' : 'Student Status Overview'}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
               <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2 rounded-xl">
                 <Edit2 className="w-4 h-4" /> Edit
               </Button>
            ) : (
              <Button variant="default" size="sm" onClick={handleSave} className="gap-2 rounded-xl bg-success-gradient text-white">
                 <Save className="w-4 h-4" /> Save
               </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
          </div>
        </header>
        <div className="p-6 overflow-y-auto">
          {isEditing && (
            <div className="mb-6 space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Reschedule Start Time</label>
                <input 
                  type="datetime-local" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Add Student</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2 rounded-lg border border-border bg-background"
                    value={studentToAdd}
                    onChange={(e) => setStudentToAdd(e.target.value)}
                  >
                    <option value="">Select a student...</option>
                    {availableStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>
                    ))}
                  </select>
                  <Button onClick={handleAddStudent} disabled={!studentToAdd} size="sm">Add</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* If editing, we show currentStudentIds mapped to student objects. If viewing, we show the 'students' prop which has status */}
            {(isEditing 
              ? allStudents.filter(s => currentStudentIds.includes(s.id)) 
              : students
            ).map(student => (
              <div key={student.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-bold">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{student.student_id} - {student.email}</p>
                </div>
                {isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(student.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <span className={`px-3 py-1 text-xs font-bold rounded-full capitalize ${getStatusBadge(student.viva_exam?.status)}`}>
                    {student.viva_exam?.status?.replace('_', ' ') || 'Not Started'}
                  </span>
                )}
              </div>
            ))}
            {((isEditing ? currentStudentIds : students).length === 0) && <p className="text-muted-foreground text-center py-4">No students assigned.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailedReportModal = ({ report, onClose }) => {
  const { qa_records, exam_details, exam_set } = report;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <header className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-xl font-bold">{exam_set?.name || 'Exam Report'}</h3>
            <p className="text-sm text-muted-foreground">Detailed Conversation Analysis</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
        </header>
        
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Score Summary */}
          <div className="flex items-center justify-center gap-8 p-6 bg-muted/20 rounded-2xl border border-border">
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground uppercase">Total Score</p>
              <p className="text-4xl font-extrabold text-primary">{report.total_score.toFixed(1)} <span className="text-lg text-muted-foreground">/ {report.max_score}</span></p>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground uppercase">Questions</p>
              <p className="text-2xl font-bold">{qa_records.length}</p>
            </div>
          </div>

          {/* Conversation History */}
          <div className="space-y-6">
            <h4 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Viva Transcript</h4>
            
            {qa_records.map((record, idx) => (
              <div key={idx} className="border border-border rounded-2xl overflow-hidden">
                <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Question {idx + 1}</span>
                    <p className="font-medium mt-1">{record.question_text}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.score >= 7 ? 'bg-green-100 text-green-700' : record.score >= 4 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                    {record.score}/10
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Student Answer</p>
                    <p className="text-sm italic">"{record.student_answer}"</p>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-xl">
                    <p className="text-xs font-bold text-primary uppercase mb-1">AI Feedback</p>
                    <p className="text-sm">{record.evaluation?.feedback || "No feedback provided."}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeDashboard;