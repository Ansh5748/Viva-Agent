import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import api from '../utils/api';
import {
  Mic, Upload, Users, BookOpen, Calendar, BarChart3, 
  LogOut, FileText, CheckCircle, Clock, TrendingUp, Plus, Sun, Moon, Trash2, Folder, ChevronRight, ChevronDown, X, Search, Filter, ArrowUpDown, Edit2, Save, Activity, Layers, PieChart, Award, MessageSquare, FileSpreadsheet
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
  const [teachers, setTeachers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [viewingExamSet, setViewingExamSet] = useState(null); // For modal
  const [selectedReportExam, setSelectedReportExam] = useState(null); // For detailed report modal

  // Student Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBatchFilter, setStudentBatchFilter] = useState('all');
  const [studentSort, setStudentSort] = useState('name_asc'); // name_asc, name_desc
  
  // Pagination States
  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeachersPage] = useState(1);
  const [examPage, setExamPage] = useState(1);
  const [questionPage, setQuestionPage] = useState(1); // Added for Question Bank overall pagination
  const [reportExamPage, setReportExamPage] = useState(1); // Added for AnalyticsModal overall pagination
  const [questionTopicPages, setQuestionTopicPages] = useState({});
  const ITEMS_PER_PAGE = 10;
  const TOPICS_PER_PAGE = 5; // Added for topics per page in subject
  const QS_PER_PAGE = 5; // Added for questions per page in topic

  useEffect(() => {
    if (!user || (user.role !== 'college_admin' && user.role !== 'teacher')) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentBatchFilter]);

  const loadData = async () => {
    try {
      const calls = [
        api.get('/colleges/my'),
        api.get('/students/my-college'),
        api.get('/questions/my-college'),
        api.get('/exam-sets/my-college'),
        api.get('/analytics/college')
      ];

      // Only admins and authorized teachers can fetch teachers
      if (user.role === 'college_admin' || (user.role === 'teacher' && user.teacher_profile?.permissions?.manage_teachers)) {
        calls.push(api.get('/teachers/my-college'));
      }

      const [collegeRes, studentsRes, questionsRes, examSetsRes, analyticsRes, teachersRes] = await Promise.all(calls);

      setCollege(collegeRes.data);
      setStudents(studentsRes.data || []);
      setQuestions(questionsRes.data || []);
      // Reverse exam sets to show latest first
      setExamSets((examSetsRes.data || []));
      setAnalytics(analyticsRes.data);
      if (teachersRes) setTeachers(teachersRes.data || []);
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

  const handleDeleteTopic = async (subject, topic) => {
    if(!window.confirm(`Are you sure you want to delete all questions in topic "${topic}"?`)) return;
    try {
      const qsToDelete = groupedQuestions[subject][topic];
      await Promise.all(qsToDelete.map(q => api.delete(`/questions/${q.id}`)));
      toast.success(`Topic "${topic}" deleted successfully`);
      loadData();
    } catch (e) { toast.error("Failed to delete topic"); }
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

  const handleDeleteTeacher = async (id) => {
    if(!window.confirm("Are you sure? This will delete the teacher's account.")) return;
    try {
      await api.delete(`/teachers/${id}`);
      toast.success("Teacher deleted");
      loadData();
    } catch (e) { toast.error("Failed to delete"); }
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
    // Teacher filtering
    if (user.role === 'teacher' && user.teacher_profile?.subject && sub !== user.teacher_profile.subject) {
      return acc;
    }
    
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

    // Teacher filtering for students
    if (user.role === 'teacher') {
      const perms = user.teacher_profile?.permissions;
      if (perms?.student_data?.length > 0 && !perms.student_data.includes('all')) {
        result = result.filter(s => perms.student_data.includes(s.batch));
      }
    }

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

  // Pagination Logic Helpers
  const paginate = (items, page, size) => items.slice((page - 1) * size, page * size);
  const renderPaginationControls = (totalItems, currentPage, setPage, size = ITEMS_PER_PAGE) => {
    const totalPages = Math.ceil(totalItems / size);
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
        <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
      </div>
    );
  };

  const filteredStudents = getFilteredStudents();
  const paginatedStudents = paginate(filteredStudents, studentPage, ITEMS_PER_PAGE);
  const uniqueBatches = (() => {
    let batches = [...new Set(students.map(s => s.batch).filter(Boolean))];
    if (user.role === 'teacher') {
      const perms = user.teacher_profile?.permissions;
      if (perms?.student_data?.length > 0 && !perms.student_data.includes('all')) {
        batches = batches.filter(b => perms.student_data.includes(b));
      }
    }
    return batches;
  })();

  const paginatedExams = paginate(examSets, examPage, 6); // 6 per page for grid

  // Analytics Calculations
  const totalCompleted = analytics?.completed_exams || 0;
  const avgScore = analytics?.average_score || 0;

  // Calculate Subject Performance
  const subjectStats = (analytics?.student_reports || []).reduce((acc, report) => {
    const sub = report.subject || 'General';
    // Teacher filtering
    if (user.role === 'teacher') {
      const perms = user.teacher_profile?.permissions;
      if (perms?.analytics === 'subject_wise' && user.teacher_profile?.subject && sub !== user.teacher_profile.subject) {
        return acc;
      }
      if (perms?.analytics === 'batch_wise' && perms?.student_data?.length > 0 && !perms.student_data.includes('all') && !perms.student_data.includes(report.batch)) {
        return acc;
      }
    }
    
    if (!acc[sub]) acc[sub] = { total: 0, count: 0, exams: 0 };
    acc[sub].total += report.score;
    acc[sub].count += 1;
    return acc;
  }, {}) || {};

  // Top Performers
  const topPerformers = analytics?.student_reports
    ? [...analytics.student_reports].sort((a, b) => b.score - a.score).slice(0, 5)
    : [];

  const subjectCount = Object.keys(subjectStats).length;

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
              { id: 'teachers', icon: <Users />, label: 'Teachers', permission: 'manage_teachers' },
              { id: 'students', icon: <Users />, label: 'Students', permission: 'view_students' },
              { id: 'questions', icon: <FileText />, label: 'Question Bank', permission: 'question_bank' },
              { id: 'exams', icon: <Calendar />, label: 'Exam Sets', permission: 'exam_set' },
            ].filter(item => {
              if (user.role === 'college_admin') return true;
              if (item.id === 'overview') return true;
              if (item.permission === 'manage_teachers') return user.teacher_profile?.permissions?.manage_teachers;
              if (item.permission === 'view_students') return user.teacher_profile?.permissions?.view_students;
              if (item.permission === 'question_bank') return user.teacher_profile?.permissions?.question_bank;
              if (item.permission === 'exam_set') return user.teacher_profile?.permissions?.exam_set;
              return false;
            }).map((item) => (
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
                  <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.role === 'teacher' ? 'Teacher' : 'Admin'}</h1>
                  <p className="text-muted-foreground">Here's what's happening at {college?.name} today.</p>
                </div>
                <div className="flex items-center gap-3">
                  {(user.role === 'college_admin' || (user.role === 'teacher' && user.teacher_profile?.permissions?.analytics !== 'none')) && (
                    <Button onClick={() => setShowAnalyticsModal(true)} variant="outline" className="rounded-xl gap-2">
                        <PieChart className="w-4 h-4" /> Reports & Analytics
                    </Button>
                  )}
                  {(user.role === 'college_admin' || (user.role === 'teacher' && user.teacher_profile?.permissions?.exam_set)) && (
                    <Button onClick={() => navigate('/create-exam')} className="bg-success-gradient text-white btn-hover rounded-xl gap-2">
                      <Plus className="w-4 h-4" /> Create Exam
                    </Button>
                  )}
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Students', value: analytics?.total_students || 0, icon: <Users />, gradient: 'bg-ar-gradient' },
                  { label: 'Questions', value: analytics?.total_questions || 0, icon: <FileText />, gradient: 'bg-food-gradient' },
                  { label: 'Exam Sets', value: analytics?.total_exams || 0, icon: <Calendar />, gradient: 'bg-brand-gradient' },
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
                    <div
                      className={`flex flex-col 
                        ${subjectCount === 2 ? "gap-8 h-full justify-center" : "gap-4"}
                        ${subjectCount > 3 ? "max-h-[300px] overflow-y-auto pr-2" : ""}
                      `}
                    >
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
                      <div key={i} className="relative pl-8 flex items-center justify-between group">
                        <div className="flex-1">
                          <div className="absolute left-[0.35rem] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                          <p className="text-sm font-bold">{report.student_name} - {report.exam_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleDateString()}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetailedReport(report.viva_exam_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/10 rounded-lg h-8 text-xs"
                        >
                          View
                        </Button>
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

          {activeTab === 'teachers' && (user.role === 'college_admin' || user.teacher_profile?.permissions?.manage_teachers) && (
            <div className="space-y-6 animate-fade-in">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Teacher Management</h2>
                <Button onClick={() => { setEditingTeacher(null); setShowTeacherModal(true); }} className="bg-brand-gradient text-white rounded-xl gap-2 shadow-lg px-6 h-12">
                  <Plus className="w-5 h-5" /> Add Teacher
                </Button>
              </header>

              <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-6 py-4 font-bold text-sm">Teacher Name</th>
                        <th className="text-left px-6 py-4 font-bold text-sm">Email</th>
                        <th className="text-left px-6 py-4 font-bold text-sm">Subject</th>
                        <th className="text-left px-6 py-4 font-bold text-sm">Permissions</th>
                        <th className="text-right px-6 py-4 font-bold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {(() => {
                        const filteredTeachers = user.role === 'teacher' 
                          ? teachers.filter(t => t.email !== user.email)
                          : teachers;
                        
                        if (filteredTeachers.length === 0) {
                          return <tr><td colSpan="5" className="text-center py-12 text-muted-foreground font-medium">No other teachers added yet.</td></tr>;
                        }

                        return paginate(filteredTeachers, teacherPage, ITEMS_PER_PAGE).map((t) => (
                          <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-bold">{t.full_name}</td>
                            <td className="px-6 py-4 text-muted-foreground">{t.email}</td>
                            <td className="px-6 py-4 font-medium">{t.subject || 'General'}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {t.permissions.student_data?.length > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">Students</span>}
                                {t.permissions.question_bank && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">Questions</span>}
                                {t.permissions.exam_set && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold">Exams</span>}
                                {t.permissions.analytics !== 'none' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">Analytics ({t.permissions.analytics})</span>}
                                {t.permissions.manage_teachers && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">Manage Teachers</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingTeacher(t); setShowTeacherModal(true); }} className="text-primary hover:bg-primary/10 rounded-lg"><Edit2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteTeacher(t.id)} className="text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const filteredTeachers = user.role === 'teacher' 
                    ? teachers.filter(t => t.email !== user.email)
                    : teachers;
                  return renderPaginationControls(filteredTeachers.length, teacherPage, setTeachersPage);
                })()}
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
                      {paginatedStudents.length === 0 ? (
                        <tr><td colSpan="7" className="text-center py-8 text-muted-foreground">No students found.</td></tr>
                      ) : (
                        paginatedStudents.map((s) => (
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
                {renderPaginationControls(filteredStudents.length, studentPage, setStudentPage)}
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
                  paginate(Object.entries(groupedQuestions), questionPage, ITEMS_PER_PAGE).map(([subject, topics]) => (
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
                                <div className="flex-1 flex items-center gap-2 pl-4">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{topic}</span>
                                  <span className="text-xs text-muted-foreground">({qs.length} Questions)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTopic(subject, topic); }} 
                                    className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  {expandedTopics[`${subject}-${topic}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                              </div>

                              {expandedTopics[`${subject}-${topic}`] && (
                                <div className="p-4 space-y-3 bg-muted/5">
                                  {paginate(qs, questionTopicPages[`${subject}-${topic}`] || 1, QS_PER_PAGE).map((q) => (
                                    <div key={q.id} className="flex flex-col p-4 bg-card border border-border rounded-xl gap-3">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="font-bold text-sm leading-relaxed">{q.question_text}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            (q.difficulty_level || q.difficulty)?.toLowerCase() === 'easy' ? 'bg-green-100 text-green-700' :
                                            (q.difficulty_level || q.difficulty)?.toLowerCase() === 'hard' ? 'bg-red-100 text-red-700' :
                                            'bg-orange-100 text-orange-700'
                                          }`}>
                                            {q.difficulty_level || q.difficulty || 'Medium'}
                                          </span>
                                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.id)} className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Correct Answer</p>
                                        <p className="text-xs text-foreground font-medium">{q.answer_key || q.answer || 'Not provided'}</p>
                                      </div>
                                    </div>
                                  ))}
                                  {renderPaginationControls(
                                    qs.length, 
                                    questionTopicPages[`${subject}-${topic}`] || 1, 
                                    (newPage) => setQuestionTopicPages(prev => ({...prev, [`${subject}-${topic}`]: typeof newPage === 'function' ? newPage(prev[`${subject}-${topic}`] || 1) : newPage})),
                                    QS_PER_PAGE
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {renderPaginationControls(Object.keys(groupedQuestions).length, questionPage, setQuestionPage, ITEMS_PER_PAGE)}
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-6 animate-fade-in">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Exam Sets</h2>
                <Button onClick={() => navigate('/create-exam')} className="bg-success-gradient text-white font-bold rounded-xl shadow-lg px-8 h-12 btn-hover">
                  <Plus className="w-4 h-4 mr-2" /> Create Exam Set
                </Button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {examSets.length === 0 ? (
                  <div className="md:col-span-2 text-center py-20 bg-card border border-dashed border-border rounded-3xl text-muted-foreground">
                    No examination sets scheduled. Start by creating one!
                  </div>
                ) : (
                  paginatedExams.map((set) => (
                    <div key={set.id} className="bg-card border border-border rounded-3xl p-6 shadow-sm card-hover">
                      <div className="flex items-center justify-between mb-4">
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
                        <Button onClick={() => handleDeleteExamSet(set.id)} variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
                <div className="md:col-span-2">{renderPaginationControls(examSets.length, examPage, setExamPage, 6)}</div>
              </div>
            </div>
          )}

        </main>

      {/* Exam Set Detail Modal */}
      {viewingExamSet && (
        <ExamSetDetailModal 
          examSetDetails={viewingExamSet}
          allStudents={students}
          onClose={closeDetailModal}
          onUpdate={loadData}
        />
      )}

      {/* Teacher Management Modal */}
      {showTeacherModal && (
        <TeacherModal 
          teacher={editingTeacher}
          allBatches={uniqueBatches}
          onClose={() => setShowTeacherModal(false)}
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
          reportExamPage={reportExamPage}
          setReportExamPage={setReportExamPage}
          paginate={paginate}
          renderPaginationControls={renderPaginationControls}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          user={user}
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
  </div>
);
};

const TeacherModal = ({ teacher, allBatches, onClose, onUpdate }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || '',
    email: teacher?.email || '',
    password: teacher?.password || '',
    subject: teacher?.subject || '',
    permissions: teacher?.permissions || {
      student_data: [],
      view_students: false,
      question_bank: false,
      exam_set: false,
      analytics: 'none',
      manage_teachers: false
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(teacher ? "Updating teacher..." : "Adding teacher...");
    try {
      if (teacher) {
        await api.patch(`/teachers/${teacher.id}`, formData);
        toast.success("Teacher updated", { id: toastId });
      } else {
        await api.post('/teachers/create', formData);
        toast.success("Teacher added", { id: toastId });
      }
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Action failed", { id: toastId });
    }
  };

  const toggleBatch = (batch) => {
    setFormData(prev => {
      const current = prev.permissions.student_data || [];
      const updated = current.includes(batch) 
        ? current.filter(b => b !== batch) 
        : [...current, batch];
      return { ...prev, permissions: { ...prev.permissions, student_data: updated } };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <header className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{teacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            <p className="text-sm text-muted-foreground">Manage profile and dashboard permissions.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Full Name</label>
              <input 
                required
                className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 outline-none"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Email Address</label>
              <input 
                required
                type="email"
                disabled={!!teacher}
                className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 outline-none disabled:opacity-50"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Login Password</label>
              <input 
                required={!teacher}
                type="text"
                placeholder={teacher ? "Leave blank to keep current" : ""}
                className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 outline-none"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Assigned Subject (Optional)</label>
              <input 
                className="w-full p-3 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="e.g. Physics, Data Structures"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Permissions</h4>
            
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold block">Student Data Access (Batches)</label>
                  <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Student Dataset</span>
                    <input 
                      type="checkbox"
                      className="w-4 h-4 accent-primary disabled:opacity-30"
                      disabled={formData.permissions.student_data.length === 0}
                      checked={formData.permissions.view_students}
                      onChange={(e) => setFormData({...formData, permissions: {...formData.permissions, view_students: e.target.checked}})}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, permissions: {...prev.permissions, student_data: prev.permissions.student_data.includes('all') ? [] : ['all']}}))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.permissions.student_data.includes('all') ? 'bg-primary text-white dark:text-black' : 'bg-card border border-border hover:bg-muted'}`}
                  >
                    All Batches
                  </button>
                  {allBatches.map(batch => (
                    <button
                      key={batch}
                      type="button"
                      disabled={formData.permissions.student_data.includes('all')}
                      onClick={() => toggleBatch(batch)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.permissions.student_data.includes(batch) ? 'bg-primary text-white dark:text-black' : 'bg-card border border-border hover:bg-muted'} disabled:opacity-50`}
                    >
                      {batch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Question Bank</span>
                    <span className="text-[10px] text-muted-foreground">Manage subject questions</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={formData.permissions.question_bank}
                    onChange={(e) => setFormData({...formData, permissions: {...formData.permissions, question_bank: e.target.checked}})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Exam Sets</span>
                    <span className="text-[10px] text-muted-foreground">Create/Schedule tests</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={formData.permissions.exam_set}
                    onChange={(e) => setFormData({...formData, permissions: {...formData.permissions, exam_set: e.target.checked}})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Manage Teachers</span>
                    <span className="text-[10px] text-muted-foreground">Add/Edit other teachers</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-5 h-5 accent-primary"
                    checked={formData.permissions.manage_teachers}
                    onChange={(e) => setFormData({...formData, permissions: {...formData.permissions, manage_teachers: e.target.checked}})}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                <label className="text-sm font-bold block mb-3">Analytics & Results</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['none', 'overall', 'subject_wise', 'batch_wise'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({...formData, permissions: {...formData.permissions, analytics: mode}})}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${formData.permissions.analytics === mode ? 'bg-primary text-white dark:text-black' : 'bg-card border border-border hover:bg-muted'}`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12 font-bold">Cancel</Button>
            <Button type="submit" className="flex-1 rounded-xl h-12 bg-brand-gradient text-white font-bold shadow-lg">
              {teacher ? 'Update Teacher' : 'Add Teacher'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AnalyticsModal = ({ 
  analytics, topPerformers: initialTopPerformers, onClose, onViewReport, 
  reportExamPage, setReportExamPage, paginate, renderPaginationControls, ITEMS_PER_PAGE, user
}) => {
  const [expandedExam, setExpandedExam] = useState(null);
  const [reportPages, setReportPages] = useState({});
  const [topFilterExam, setTopFilterExam] = useState('all');
  
  // Teacher restrictions for analytics
  const perms = user?.teacher_profile?.permissions;
  const isSubjectRestricted = user?.role === 'teacher' && perms?.analytics === 'subject_wise' && user?.teacher_profile?.subject;
  const isBatchRestricted = user?.role === 'teacher' && perms?.analytics === 'batch_wise' && perms?.student_data?.length > 0 && !perms.student_data.includes('all');

  const [filterSubject, setFilterSubject] = useState(isSubjectRestricted ? user.teacher_profile.subject : 'all');
  const [filterBatch, setFilterBatch] = useState(isBatchRestricted ? (perms.student_data.includes('all') ? 'all' : perms.student_data[0]) : 'all');
  const [topLimit, setTopLimit] = useState(5);

  const studentReports = analytics?.student_reports || [];
  const uniqueSubjects = [...new Set(studentReports.map(r => r.subject).filter(Boolean))];
  const uniqueExams = [...new Set(studentReports.map(r => r.exam_name).filter(Boolean))];
  const uniqueBatches = [...new Set(studentReports.map(r => r.batch).filter(Boolean))];

  // If teacher, only show allowed batches in uniqueBatches
  const filteredUniqueBatches = isBatchRestricted ? uniqueBatches.filter(b => perms.student_data.includes(b)) : uniqueBatches;
  const filteredUniqueSubjects = isSubjectRestricted ? [user.teacher_profile.subject] : uniqueSubjects;

  const dynamicTopPerformers = [...studentReports]
    .filter(r => (topFilterExam === 'all' || r.exam_name === topFilterExam))
    .filter(r => (filterSubject === 'all' || r.subject === filterSubject))
    .filter(r => (filterBatch === 'all' || r.batch === filterBatch))
    .sort((a, b) => (b.score / (b.max_score || 10)) - (a.score / (a.max_score || 10)))
    .slice(0, topLimit);

  const reportsByExamSet = studentReports
    .filter(r => (filterBatch === 'all' || r.batch === filterBatch))
    .filter(r => (filterSubject === 'all' || r.subject === filterSubject))
    .reduce((acc, report) => {
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

  const handleDownloadExcel = async (setId, examName) => {
    try {
      const response = await api.get(`/viva-exams/exam-sets/${setId}/export-excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Results_${examName.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" /> Top Performing Students
              </h3>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Filter by Batch</span>
                  <select 
                    value={filterBatch}
                    disabled={isBatchRestricted}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px] disabled:opacity-70"
                  >
                    {!isBatchRestricted && <option value="all">All Batches</option>}
                    {filteredUniqueBatches.map(batch => <option key={batch} value={batch}>{batch}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Filter by Exam</span>
                  <select 
                    value={topFilterExam}
                    onChange={(e) => setTopFilterExam(e.target.value)}
                    className="bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px]"
                  >
                    <option value="all">All Exams</option>
                    {uniqueExams.map(exam => <option key={exam} value={exam}>{exam}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Filter by Subject</span>
                  <select 
                    value={filterSubject}
                    disabled={isSubjectRestricted}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px] disabled:opacity-70"
                  >
                    {!isSubjectRestricted && <option value="all">All Subjects</option>}
                    {filteredUniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Show Top</span>
                  <select 
                    value={topLimit}
                    onChange={(e) => setTopLimit(parseInt(e.target.value))}
                    className="bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none w-20"
                  >
                    {[5, 10, 20, 50].map(limit => (
                      <option key={limit} value={limit}>{limit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="relative flex gap-4 h-[340px] w-full mt-4">
              {/* Y-Axis Labels and Line */}
              <div className="flex flex-col h-64 text-[10px] font-bold text-muted-foreground pr-2 border-r-2 border-emerald-500/40">
                <div className="flex-1 flex flex-col justify-between">
                  <span className="leading-none -mt-1.5">100%</span>
                  <span className="leading-none">80%</span>
                  <span className="leading-none">60%</span>
                  <span className="leading-none">40%</span>
                  <span className="leading-none">20%</span>
                  <span className="leading-none -mb-1.5">0%</span>
                </div>
              </div>

              {/* Chart Area */}
              <div className="flex-1 relative h-full overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500/40">
                <div className="relative flex items-end gap-8 min-h-full pb-20">
                  {/* Horizontal Grid Lines - Fixed Height to match Y-axis */}
                  <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="absolute w-full border-t border-border/10" style={{ top: `${i * 20}%` }}></div>
                    ))}
                    {/* X-Axis Line - Green color */}
                    <div className="absolute bottom-0 w-full border-b-2 border-emerald-500/40"></div>
                  </div>

                  {dynamicTopPerformers.length > 0 ? dynamicTopPerformers.map((student, idx) => (
                    <div key={idx} className="flex flex-col items-center min-w-[100px] z-10 group/bar">
                      {/* Bar Container - Matches Y-axis height */}
                      <div className="relative w-full h-64 flex items-end justify-center">
                        <div 
                          className="w-10 bg-food-gradient rounded-t-lg transition-all duration-700 relative group-hover/bar:opacity-100 shadow-lg cursor-pointer"
                          style={{ height: `${(student.score / (student.max_score || 10)) * 100}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-50 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 z-20 pointer-events-none translate-y-2 group-hover/bar:translate-y-0">
                            <div className="bg-emerald-600 text-white px-2 py-1 rounded-lg shadow-xl text-[10px] font-bold whitespace-nowrap">
                              {student.score.toFixed(1)} / {student.max_score}
                            </div>
                            <div className="w-2 h-2 bg-emerald-600 rotate-45 mx-auto -mt-1 shadow-xl"></div>
                          </div>
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-lg"></div>
                        </div>
                      </div>
                      
                      {/* Labels - Below X-Axis */}
                      <div className="text-center w-full mt-3 px-1">
                        <p className="text-[10px] font-bold text-foreground leading-tight break-words">{student.student_name}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight mt-1 break-words">{student.exam_name}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-2xl">
                       <Users className="w-8 h-8 opacity-20" />
                       <p className="text-sm">No performance data matches your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Exam Reports Table */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <h3 className="text-xl font-bold">All Exam Reports</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Filter by Batch</span>
                  <select 
                    value={filterBatch}
                    disabled={isBatchRestricted}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px] disabled:opacity-70"
                  >
                    {!isBatchRestricted && <option value="all">All Batches</option>}
                    {filteredUniqueBatches.map(batch => <option key={batch} value={batch}>{batch}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Filter by Subject</span>
                  <select 
                    value={filterSubject}
                    disabled={isSubjectRestricted}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px] disabled:opacity-70"
                  >
                    {!isSubjectRestricted && <option value="all">All Subjects</option>}
                    {filteredUniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {Object.keys(reportsByExamSet).length > 0 ? (
                paginate(Object.entries(reportsByExamSet), reportExamPage, ITEMS_PER_PAGE).map(([setId, data]) => (
                  <div key={setId} className="border border-border rounded-2xl overflow-hidden">
                    <div className="w-full p-4 bg-muted/30 flex items-center justify-between">
                      <button 
                        className="flex-1 flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
                        onClick={() => setExpandedExam(expandedExam === setId ? null : setId)}
                      >
                        <Folder className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-bold">{data.exam_name}</h4>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{data.reports.length} Students</span>
                        </div>
                        {expandedExam === setId ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      {setId !== 'unknown' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDownloadExcel(setId, data.exam_name)}
                          className="gap-2 bg-success-gradient/10 text-emerald-600 border-emerald-200 hover:bg-success-gradient/20 rounded-xl"
                        >
                          <FileSpreadsheet className="w-4 h-4" /> Download Excel
                        </Button>
                      )}
                    </div>
                    {expandedExam === setId && (
                      <div className="space-y-2">
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
                            <tbody className="divide-y divide-border">
                              {paginate(data.reports, reportPages[setId] || 1, 5).map((report, rIdx) => (
                                <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-medium">{report.student_name}</td>
                                  <td className="px-6 py-4">
                                    <span className="font-bold text-primary">{report.score.toFixed(1)}</span>
                                    <span className="text-muted-foreground text-xs ml-1">/{report.max_score}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(report.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onViewReport(report.viva_exam_id)} className="text-primary hover:bg-primary/10 rounded-lg">View Details</Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {renderPaginationControls(
                          data.reports.length,
                          reportPages[setId] || 1,
                          (newPage) => setReportPages(prev => ({ ...prev, [setId]: typeof newPage === 'function' ? newPage(prev[setId] || 1) : newPage })),
                          5
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">No reports available.</div>
              )}
              {renderPaginationControls(Object.keys(reportsByExamSet).length, reportExamPage, setReportExamPage, ITEMS_PER_PAGE)}
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

  const availableStudents = allStudents.filter(s => !currentStudentIds.includes(s.id));

  const handleAddStudent = () => {
    if (studentToAdd && !currentStudentIds.includes(studentToAdd)) {
      setCurrentStudentIds(prev => [...prev, studentToAdd]);
      setStudentToAdd('');
    }
  };

  const handleRemoveStudent = (id) => {
    setCurrentStudentIds(prev => prev.filter(sid => sid !== id));
  };

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
      toast.success("Exam set updated successfully!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update exam set");
    }
  };

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
                    <p className="text-sm">{record.evaluation?.feedback || record.feedback || "Good effort! Response recorded."}</p>
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