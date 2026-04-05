import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import api from '../utils/api';
import { Mic, Calendar, Clock, CheckCircle, Play, LogOut, BookOpen, Award, Sun, Moon, Loader2, TrendingUp, BarChart3, X, Target, Zap, MessageSquare } from 'lucide-react';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [processingExamId, setProcessingExamId] = useState(null);
  const [selectedExamAnalysis, setSelectedExamAnalysis] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/login');
      return;
    }
    loadExams(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExams = async () => {
    try {
      const response = await api.get('/viva-exams/my-exams');
      setExams(response.data || []);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (exam) => {
    setProcessingExamId(exam.id);
    try {
      // Only call start endpoint if it's the first time (scheduled)
      if (exam.status === 'scheduled') {
        await api.post(`/viva-exams/${exam.id}/start`);
      }
      navigate(`/viva/${exam.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Cannot start exam. Please contact your administrator.');
      setProcessingExamId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-bold text-xl">Loading your portal...</div>
    </div>
  );

  const handleViewAnalysis = async (exam) => {
    const toastId = toast.loading("Loading full report...");
    try {
      const res = await api.get(`/viva-exams/${exam.id}/report`);
      setSelectedExamAnalysis(res.data);
      toast.dismiss(toastId);
    } catch (error) {
      toast.error("Failed to load report", { id: toastId });
    }
  };

  const closeAnalysis = () => {
    setSelectedExamAnalysis(null);
  };

  // Calculate Stats
  const completedExams = exams.filter(e => e.status === 'completed');
  const avgScore = completedExams.length > 0 
    ? (completedExams.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedExams.length).toFixed(1) 
    : 0;
  const highestScore = completedExams.length > 0
    ? Math.max(...completedExams.map(e => e.score || 0))
    : 0;
  const completionRate = exams.length > 0 ? Math.round((completedExams.length / exams.length) * 100) : 0;

  // Sort exams: Latest first
  const sortedExams = [...exams].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  const totalPages = Math.ceil(sortedExams.length / ITEMS_PER_PAGE);
  const paginatedExams = sortedExams.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <nav className="bg-card/50 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="inner-block w-10 h-10 bg-food-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="inline-block text-xl font-bold text-transparent bg-gradient-to-r from-orange-400 via-orange-300 to-orange-200 bg-clip-text">{user?.full_name}</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{user?.college_name}</p>
            {/* <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Student Portal</p> */}
          </div>
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
          <Button onClick={handleLogout} variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-xl gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        <header className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Your Scheduled Vivas</h2>
          <p className="text-muted-foreground mt-1">Manage your upcoming AI-powered voice examinations.</p>
        </header>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Exams</p>
              <p className="text-2xl font-bold">{exams.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success-gradient/10 flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold">{completedExams.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-ar-gradient/10 flex items-center justify-center text-purple-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Avg. Score</p>
              <p className="text-2xl font-bold">{avgScore}/{completedExams[0]?.max_score || 10}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-food-gradient/10 flex items-center justify-center text-orange-500">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Best Score</p>
              <p className="text-2xl font-bold">{highestScore}/{completedExams[0]?.max_score || 10}</p>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        {completedExams.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Performance Trends
              </h3>
              <div className="space-y-6">
                {completedExams.slice(0, 3).map((exam, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span>{exam.exam_name || 'Viva Exam'}</span>
                      <span className="text-primary">{exam.score || 0}/{exam.max_score || 10}</span>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-gradient rounded-full transition-all duration-1000" 
                        style={{ width: `${((exam.score || 0) / (exam.max_score || 10)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" /> Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Total Minutes Spoken</p>
                  <p className="text-2xl font-bold text-foreground">{completedExams.reduce((acc, e) => acc + (e.duration_minutes || 0), 0)}m</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {exams.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No exams scheduled</h3>
            <p className="text-muted-foreground max-w-xs mx-auto text-sm">You're all caught up! When your college schedules a viva, it will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {paginatedExams.map((exam) => {
              const startTime = exam.start_time ? new Date(exam.start_time) : null;
              const endTime = exam.end_time ? new Date(exam.end_time) : null;
              const isBefore = startTime && currentTime < startTime;
              const isAfter = endTime && currentTime > endTime;
              const isDisabled = isBefore || isAfter;

              return (
                <div key={exam.id} className="bg-card border border-border rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between shadow-sm card-hover group transition-all">
                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      exam.status === 'completed' ? 'bg-success-gradient/10 text-emerald-500' : 'bg-primary/5 text-primary'
                    }`}>
                      {exam.status === 'completed' ? <Award className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{exam.exam_name || (exam.exam_set_id ? 'Final Evaluation' : 'Practice Set')}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {startTime ? startTime.toLocaleString() : new Date(exam.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {exam.duration_minutes || 15} Minutes</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          exam.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {exam.status}
                        </span>
                        {exam.status === 'completed' && exam.score !== undefined && (
                          <span className="flex items-center gap-1.5 text-primary font-bold"><Award className="w-4 h-4" /> Score: {exam.score}/{exam.max_score || 10}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 md:mt-0 flex items-center gap-4">
                  {(exam.status === 'scheduled' || exam.status === 'in_progress') && (
                    <Button 
                      onClick={() => handleStartExam(exam)} 
                      disabled={isDisabled || processingExamId === exam.id}
                      className="bg-success-gradient text-white font-bold px-8 h-12 rounded-xl shadow-lg hover:scale-105 transition-transform btn-hover"
                    >
                      {processingExamId === exam.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {exam.status === 'in_progress' ? 'Resuming...' : 'Starting...'}</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2 fill-current" /> {isBefore ? 'Not Started' : isAfter ? 'Expired' : (exam.status === 'in_progress' ? 'Resume Exam' : 'Begin Exam')}</>
                      )}
                    </Button>
                  )}
                  {exam.status === 'completed' && (
                    <Button variant="outline" onClick={() => handleViewAnalysis(exam)} className="rounded-xl gap-2 border-2 hover:bg-muted">
                      <BarChart3 className="w-4 h-4" /> View Analysis
                    </Button>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl">Previous</Button>
            <span className="text-sm font-bold">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl">Next</Button>
          </div>
        )}
      </main>

      {/* Analysis Modal */}
      {selectedExamAnalysis && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
              <div>
                <h3 className="text-xl font-bold">{selectedExamAnalysis.exam_set?.name || 'Exam Analysis'}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedExamAnalysis.exam_details?.completed_at || Date.now()).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeAnalysis} className="rounded-full"><X className="w-5 h-5" /></Button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-success-gradient flex items-center justify-center text-white shadow-lg mb-4">
                  <span className="text-4xl font-bold">{selectedExamAnalysis.total_score?.toFixed(1) || 0}</span>
                </div>
                <p className="text-lg font-bold">Total Score / {selectedExamAnalysis.qa_records?.length * 10 || 10}</p>
                <p className="text-muted-foreground">Great ffort! Here is your summary.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-2xl border border-border text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Duration</p>
                  <p className="text-xl font-bold">{selectedExamAnalysis.exam_set?.exam_config?.duration_minutes || 0} Mins</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-2xl border border-border text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                  <p className="text-xl font-bold text-emerald-500 capitalize">{selectedExamAnalysis.exam_details?.status}</p>
                </div>
              </div>

              {/* Detailed QA Breakdown */}
              <div className="space-y-6">
                <h4 className="font-bold flex items-center gap-2 text-lg"><MessageSquare className="w-5 h-5" /> Question Breakdown</h4>
                
                {selectedExamAnalysis.qa_records?.map((record, idx) => (
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
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Your Answer</p>
                        <p className="text-sm italic">"{record.student_answer}"</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-xl">
                        <p className="text-xs font-bold text-primary uppercase mb-1">Feedback</p>
                        <p className="text-sm">{record.evaluation?.feedback || record.feedback || "Good effort! Your response has been recorded."}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-muted/30 text-center">
              <Button onClick={closeAnalysis} className="w-full rounded-xl font-bold">Close Report</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;