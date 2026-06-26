import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, AreaChart, Area, ScatterChart, Scatter, ComposedChart
} from 'recharts';
import {
  LayoutDashboard, Users, BookOpen, Calendar, FileText, Settings, Bell,
  ChevronRight, Search, Filter, Download, RefreshCw, Plus, Edit, Trash2,
  Eye, AlertTriangle, TrendingUp, TrendingDown, Award, Target, Clock,
  GraduationCap, Building2, ClipboardList, BarChart3, PieChart as PieChartIcon,
  UserCheck, UserX, AlertCircle, CheckCircle, XCircle, Menu, X,
  Upload, Save, Lock, Unlock, Send, Printer, FileDown, LogOut, User as UserIcon
} from 'lucide-react';
import { AuthProvider, useAuth, UserRole } from './contexts/AuthContext';
import { AuthPage } from './components/Auth';
import { supabase } from './lib/supabase';

// Types
interface Department { id: string; code: string; name: string; status: string; }
interface Program { id: string; code: string; name: string; degree_type: string; total_semesters: number; }
interface Branch { id: string; code: string; name: string; department_id: string; }
interface AcademicYear { id: string; year_label: string; is_current: boolean; start_date: string; end_date: string; }
interface Semester { id: string; semester_name: string; semester_number: number; is_current: boolean; academic_year_id: string; }
interface Subject { id: string; code: string; name: string; credits: number; department_id: string; }
interface Student { id: string; roll_number: string; user_id: string; branch_id: string; current_semester: number; cgpa: number; }
interface Faculty { id: string; employee_id: string; user_id: string; department_id: string; designation: string; }
interface User { id: string; email: string; full_name: string; role: string; department_id: string; }
interface Examination { id: string; exam_name: string; exam_code: string; exam_type_id: string; semester_id: string; status: string; }
interface ExamSubject { id: string; examination_id: string; subject_id: string; max_marks: number; }
interface QuestionPaper { id: string; paper_code: string; total_marks: number; status: string; }
interface Question { id: string; question_number: number; question_text: string; max_marks: number; difficulty_level: string; blooms_taxonomy_level: string; }
interface QuestionMark { id: string; student_id: string; question_id: string; marks_obtained: number; max_marks: number; }
interface StudentResult { id: string; student_id: string; subject_id: string; percentage: number; grade: string; is_passed: boolean; }
interface AttendanceSession { id: string; session_date: string; session_type: string; total_students_expected: number; actual_present: number; }
interface AttendanceRecord { id: string; student_id: string; status: string; }

// Color palette
const COLORS = {
  primary: '#1e40af',
  secondary: '#0891b2',
  accent: '#059669',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  purple: '#9333ea',
  orange: '#ea580c',
  pink: '#db2777',
  teal: '#0d9488',
};

const CHART_COLORS = ['#1e40af', '#0891b2', '#059669', '#ca8a04', '#dc2626', '#9333ea', '#ea580c', '#db2777', '#0d9488', '#4f46e5'];

// Helper functions
const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatPercent = (v: number) => `${v.toFixed(1)}%`;
const calculateGrade = (p: number) => {
  if (p >= 90) return { grade: 'O', points: 10 };
  if (p >= 80) return { grade: 'A+', points: 9 };
  if (p >= 70) return { grade: 'A', points: 8 };
  if (p >= 60) return { grade: 'B+', points: 7 };
  if (p >= 50) return { grade: 'B', points: 6 };
  if (p >= 45) return { grade: 'C', points: 5 };
  if (p >= 40) return { grade: 'P', points: 4 };
  return { grade: 'F', points: 0 };
};

function AppContent() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'exam-branch' | 'faculty' | 'student' | 'hod' | 'principal' | 'attendance' | 'reports'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionMarks, setQuestionMarks] = useState<QuestionMark[]>([]);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get userRole from profile
  const userRole = profile?.role as UserRole || 'student';

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [deptRes, progRes, branchRes, yearRes, semRes, subjRes, studRes, facRes, userRes, examRes, qpRes, qRes, qmRes, srRes, asRes, arRes] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase.from('programs').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('academic_years').select('*').order('year_label', { ascending: false }),
        supabase.from('semesters').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('students').select('*'),
        supabase.from('faculty').select('*'),
        supabase.from('users').select('*'),
        supabase.from('examinations').select('*'),
        supabase.from('question_papers').select('*'),
        supabase.from('questions').select('*'),
        supabase.from('question_marks').select('*'),
        supabase.from('student_results').select('*'),
        supabase.from('attendance_sessions').select('*'),
        supabase.from('attendance_records').select('*')
      ]);

      if (deptRes.data) setDepartments(deptRes.data);
      if (progRes.data) setPrograms(progRes.data);
      if (branchRes.data) setBranches(branchRes.data);
      if (yearRes.data) setAcademicYears(yearRes.data);
      if (semRes.data) setSemesters(semRes.data);
      if (subjRes.data) setSubjects(subjRes.data);
      if (studRes.data) setStudents(studRes.data);
      if (facRes.data) setFaculty(facRes.data);
      if (userRes.data) setUsers(userRes.data);
      if (examRes.data) setExaminations(examRes.data);
      if (qpRes.data) setQuestionPapers(qpRes.data);
      if (qRes.data) setQuestions(qRes.data);
      if (qmRes.data) setQuestionMarks(qmRes.data);
      if (srRes.data) setStudentResults(srRes.data);
      if (asRes.data) setAttendanceSessions(asRes.data);
      if (arRes.data) setAttendanceRecords(arRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock analytics data for visualization
  const generateMockAnalytics = () => {
    const departmentPerformance = departments.map((d, i) => ({
      name: d.code,
      passRate: 70 + Math.random() * 25,
      avgCGPA: 6.5 + Math.random() * 2,
      students: Math.floor(200 + Math.random() * 300),
      faculty: Math.floor(15 + Math.random() * 20),
      full: d.name
    }));

    const semesterTrend = Array.from({ length: 8 }, (_, i) => ({
      semester: `Sem ${i + 1}`,
      passRate: 65 + Math.random() * 30,
      avgCGPA: 6 + Math.random() * 2.5,
      backlogs: Math.floor(20 + Math.random() * 50),
      attendance: 75 + Math.random() * 20
    }));

    const subjectAnalysis = subjects.slice(0, 10).map((s, i) => ({
      code: s.code,
      name: s.name,
      passRate: 60 + Math.random() * 35,
      avgMarks: 50 + Math.random() * 30,
      difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)]
    }));

    const bloomsPerformance = [
      { level: 'Remember', avg: 65 + Math.random() * 20, count: Math.floor(150 + Math.random() * 100) },
      { level: 'Understand', avg: 60 + Math.random() * 20, count: Math.floor(120 + Math.random() * 80) },
      { level: 'Apply', avg: 55 + Math.random() * 25, count: Math.floor(200 + Math.random() * 150) },
      { level: 'Analyze', avg: 45 + Math.random() * 30, count: Math.floor(80 + Math.random() * 60) },
      { level: 'Evaluate', avg: 50 + Math.random() * 25, count: Math.floor(60 + Math.random() * 40) },
      { level: 'Create', avg: 55 + Math.random() * 20, count: Math.floor(40 + Math.random() * 30) }
    ];

    const attendanceTrend = Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      present: 70 + Math.random() * 25,
      absent: 5 + Math.random() * 15,
      late: Math.random() * 5
    }));

    const gradeDistribution = [
      { grade: 'O', count: Math.floor(50 + Math.random() * 100), color: '#059669' },
      { grade: 'A+', count: Math.floor(80 + Math.random() * 120), color: '#0891b2' },
      { grade: 'A', count: Math.floor(150 + Math.random() * 150), color: '#1e40af' },
      { grade: 'B+', count: Math.floor(200 + Math.random() * 200), color: '#4f46e5' },
      { grade: 'B', count: Math.floor(250 + Math.random() * 250), color: '#7c3aed' },
      { grade: 'C', count: Math.floor(100 + Math.random() * 100), color: '#f59e0b' },
      { grade: 'P', count: Math.floor(50 + Math.random() * 80), color: '#f97316' },
      { grade: 'F', count: Math.floor(30 + Math.random() * 70), color: '#dc2626' }
    ];

    return { departmentPerformance, semesterTrend, subjectAnalysis, bloomsPerformance, attendanceTrend, gradeDistribution };
  };

  const analytics = useMemo(() => generateMockAnalytics(), [departments, subjects]);

  // Show auth page if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-lg">Loading Academic Intelligence Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-white">AcademicIQ</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-slate-400 text-xs capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" view="dashboard" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
          <NavItem icon={<FileText />} label="Exam Branch" view="exam-branch" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'exam_branch', 'principal']} userRole={userRole} />
          <NavItem icon={<GraduationCap />} label="Faculty Portal" view="faculty" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'faculty', 'hod', 'principal']} userRole={userRole} />
          <NavItem icon={<Users />} label="Student Portal" view="student" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
          <NavItem icon={<Building2 />} label="HOD Center" view="hod" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'hod', 'principal']} userRole={userRole} />
          <NavItem icon={<Target />} label="Principal" view="principal" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'principal']} userRole={userRole} />
          <NavItem icon={<UserCheck />} label="Attendance" view="attendance" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
          <NavItem icon={<BarChart3 />} label="Reports" view="reports" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <button onClick={fetchAllData} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
            {sidebarOpen && 'Refresh Data'}
          </button>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-colors">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students, subjects, faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700 text-white placeholder-slate-400 rounded-lg pl-10 pr-4 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
              </select>
              <button className="relative p-2 rounded-lg hover:bg-slate-700 text-slate-400">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg">
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span className="text-white text-sm">{profile.full_name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {currentView === 'dashboard' && <MainDashboard analytics={analytics} departments={departments} students={students} faculty={faculty} examinations={examinations} subjects={subjects} attendanceSessions={attendanceSessions} />}
          {currentView === 'exam-branch' && <ExamBranchPortal departments={departments} semesters={semesters} subjects={subjects} examinations={examinations} fetchData={fetchAllData} />}
          {currentView === 'faculty' && <FacultyDashboard students={students} subjects={subjects} questions={questions} questionMarks={questionMarks} fetchData={fetchAllData} />}
          {currentView === 'student' && <StudentAnalytics student={students[0]} subjects={subjects} results={studentResults} questionMarks={questionMarks} questions={questions} />}
          {currentView === 'hod' && <HODControlCenter departments={departments} students={students} faculty={faculty} subjects={subjects} results={studentResults} attendanceSessions={attendanceSessions} analytics={analytics} />}
          {currentView === 'principal' && <PrincipalDashboard departments={departments} students={students} faculty={faculty} subjects={subjects} examinations={examinations} results={studentResults} analytics={analytics} />}
          {currentView === 'attendance' && <AttendanceModule students={students} attendanceSessions={attendanceSessions} attendanceRecords={attendanceRecords} fetchData={fetchAllData} />}
          {currentView === 'reports' && <ReportsModule analytics={analytics} departments={departments} subjects={subjects} students={students} results={studentResults} />}
        </div>
      </main>
    </div>
  );
}

// Navigation Item Component
function NavItem({ icon, label, view, currentView, setCurrentView, sidebarOpen, showFor, userRole }: {
  icon: React.ReactNode;
  label: string;
  view: string;
  currentView: string;
  setCurrentView: (v: any) => void;
  sidebarOpen: boolean;
  showFor?: string[];
  userRole?: string;
}) {
  if (showFor && userRole && !showFor.includes(userRole)) return null;
  const isActive = currentView === view;
  return (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
    >
      {icon}
      {sidebarOpen && <span className="text-sm">{label}</span>}
    </button>
  );
}

// Main Dashboard Component
function MainDashboard({ analytics, departments, students, faculty, examinations, subjects, attendanceSessions }: any) {
  const totalStudents = students.length || 850;
  const totalFaculty = faculty.length || 95;
  const activeExams = examinations.filter((e: any) => e.status === 'ongoing').length || 3;
  const avgAttendance = attendanceSessions.length > 0
    ? (attendanceSessions.reduce((sum: number, s: any) => sum + (s.actual_present / Math.max(s.total_students_expected, 1)) * 100, 0) / attendanceSessions.length)
    : 78.5;

  const kpiCards = [
    { title: 'Total Students', value: totalStudents, change: '+12%', icon: <Users className="w-6 h-6" />, color: 'bg-sky-500' },
    { title: 'Total Faculty', value: totalFaculty, change: '+5%', icon: <GraduationCap className="w-6 h-6" />, color: 'bg-emerald-500' },
    { title: 'Active Exams', value: activeExams, change: 'Ongoing', icon: <FileText className="w-6 h-6" />, color: 'bg-amber-500' },
    { title: 'Avg Attendance', value: `${avgAttendance.toFixed(1)}%`, change: '+2.3%', icon: <UserCheck className="w-6 h-6" />, color: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">{card.title}</p>
                <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
                <p className={`text-xs mt-2 ${card.change.startsWith('+') ? 'text-emerald-400' : 'text-slate-400'}`}>{card.change} from last month</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Department Performance Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Legend />
              <Bar dataKey="passRate" fill="#1e40af" name="Pass Rate %" />
              <Bar dataKey="avgCGPA" fill="#059669" name="Avg CGPA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.gradeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.gradeDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Trend */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Semester-wise Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.semesterTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="semester" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Legend />
              <Area type="monotone" dataKey="passRate" stroke="#1e40af" fill="#1e40af" fillOpacity={0.3} name="Pass Rate %" />
              <Area type="monotone" dataKey="attendance" stroke="#059669" fill="#059669" fillOpacity={0.3} name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bloom's Taxonomy */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Bloom's Taxonomy Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.bloomsPerformance}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="level" stroke="#94a3b8" />
              <PolarRadiusAxis stroke="#94a3b8" />
              <Radar name="Avg Score %" dataKey="avg" stroke="#0891b2" fill="#0891b2" fillOpacity={0.5} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction icon={<FileText />} label="Create Exam" />
          <QuickAction icon={<Upload />} label="Upload Marks" />
          <QuickAction icon={<UserCheck />} label="Mark Attendance" />
          <QuickAction icon={<Download />} label="Export Reports" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-3 bg-slate-700 hover:bg-slate-600 rounded-lg p-4 transition-colors">
      <div className="text-sky-400">{icon}</div>
      <span className="text-white">{label}</span>
    </button>
  );
}

// Exam Branch Portal
function ExamBranchPortal({ departments, semesters, subjects, examinations, fetchData }: any) {
  const [activeTab, setActiveTab] = useState('exams');
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [newExam, setNewExam] = useState({
    exam_name: '',
    exam_code: '',
    exam_type: 'MID1',
    start_date: '',
    end_date: '',
    total_marks: 100
  });

  const handleCreateExam = async () => {
    try {
      await supabase.from('examinations').insert([{
        ...newExam,
        semester_id: semesters.find((s: any) => s.is_current)?.id,
        status: 'scheduled'
      }]);
      setShowCreateExam(false);
      fetchData();
    } catch (error) {
      console.error('Error creating exam:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Exam Branch Portal</h2>
        <button
          onClick={() => setShowCreateExam(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Examination
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {['exams', 'subjects', 'questions', 'schedules'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'exams' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Exam Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Exam Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Start Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">End Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {examinations.length > 0 ? examinations.map((exam: any) => (
                <tr key={exam.id} className="hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-white">{exam.exam_code}</td>
                  <td className="px-4 py-3 text-white">{exam.exam_name}</td>
                  <td className="px-4 py-3 text-slate-300">{formatDate(exam.start_date)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatDate(exam.end_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${exam.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : exam.status === 'ongoing' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"><Eye className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No examinations found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject: any) => (
            <div key={subject.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium">{subject.code}</h4>
                  <p className="text-slate-400 text-sm">{subject.name}</p>
                </div>
                <span className="px-2 py-1 bg-sky-500/20 text-sky-400 rounded text-xs">{subject.credits} Credits</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'questions' && <QuestionPaperBuilder subjects={subjects} />}

      {showCreateExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create New Examination</h3>
              <button onClick={() => setShowCreateExam(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Exam Name</label>
                <input
                  type="text"
                  value={newExam.exam_name}
                  onChange={(e) => setNewExam({ ...newExam, exam_name: e.target.value })}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                  placeholder="e.g., Mid Semester Exam 1"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Exam Code</label>
                <input
                  type="text"
                  value={newExam.exam_code}
                  onChange={(e) => setNewExam({ ...newExam, exam_code: e.target.value })}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                  placeholder="e.g., MID1-2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input type="date" value={newExam.start_date} onChange={(e) => setNewExam({ ...newExam, start_date: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Date</label>
                  <input type="date" value={newExam.end_date} onChange={(e) => setNewExam({ ...newExam, end_date: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreateExam(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">Cancel</button>
                <button onClick={handleCreateExam} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white">Create Exam</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Question Paper Builder
function QuestionPaperBuilder({ subjects }: any) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState([
    { question_number: 1, question_text: '', max_marks: 10, difficulty: 'medium', blooms_level: 'Remember' }
  ]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Select Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2">
              <option value="">Select Subject</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Paper Code</label>
            <input type="text" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2" placeholder="e.g., CS301-MID1-2024" />
          </div>
        </div>
      </div>

      {questions.map((q, index) => (
        <div key={index} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-start gap-4">
            <div className="text-sky-400 font-bold text-lg">Q{q.question_number}</div>
            <div className="flex-1 space-y-3">
              <textarea
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 min-h-[80px]"
                placeholder="Enter question text..."
              />
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Max Marks</label>
                  <input type="number" defaultValue={q.max_marks} className="w-full bg-slate-700 text-white rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Difficulty</label>
                  <select className="w-full bg-slate-700 text-white rounded px-2 py-1">
                    <option>easy</option>
                    <option>medium</option>
                    <option>hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bloom's Level</label>
                  <select className="w-full bg-slate-700 text-white rounded px-2 py-1">
                    {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit</label>
                  <select className="w-full bg-slate-700 text-white rounded px-2 py-1">
                    {[1, 2, 3, 4, 5].map(u => <option key={u}>Unit {u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between">
        <button onClick={() => setQuestions([...questions, { question_number: questions.length + 1, question_text: '', max_marks: 10, difficulty: 'medium', blooms_level: 'Remember' }])} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2">
          <Plus className="w-4 h-4" /> Add Question
        </button>
        <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-6 py-2">
          <Save className="w-4 h-4" /> Save Question Paper
        </button>
      </div>
    </div>
  );
}

// Faculty Dashboard
function FacultyDashboard({ students, subjects, questions, questionMarks, fetchData }: any) {
  const [activeTab, setActiveTab] = useState('marks-entry');
  const filteredStudents = students.slice(0, 20);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Faculty Portal</h2>
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {['marks-entry', 'analytics', 'question-analysis'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'marks-entry' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 bg-slate-700 border-b border-slate-600">
            <h3 className="text-white font-medium">Question-wise Marks Entry</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr className="text-left text-sm text-slate-300">
                  <th className="px-4 py-3">Roll No.</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Q1 (10)</th>
                  <th className="px-4 py-3">Q2 (5)</th>
                  <th className="px-4 py-3">Q3 (15)</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredStudents.map((student: any, sIndex: number) => {
                  const total = 35; const maxTotal = 50;
                  const percent = (total / maxTotal) * 100;
                  const grade = calculateGrade(percent);
                  return (
                    <tr key={student.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-white font-mono">{student.roll_number}</td>
                      <td className="px-4 py-3 text-white">Student {sIndex + 1}</td>
                      <td className="px-4 py-3"><input type="number" min="0" max="10" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={Math.floor(Math.random() * 10)} /></td>
                      <td className="px-4 py-3"><input type="number" min="0" max="5" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={Math.floor(Math.random() * 5)} /></td>
                      <td className="px-4 py-3"><input type="number" min="0" max="15" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={Math.floor(Math.random() * 15)} /></td>
                      <td className="px-4 py-3 text-white font-medium">{total}/{maxTotal}</td>
                      <td className="px-4 py-3 text-sky-400">{percent.toFixed(1)}%</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">{grade.grade}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Student Analytics
function StudentAnalytics({ student, subjects, results, questionMarks, questions }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white">Student Analytics Portal</h2>
        <p className="text-sky-100">Your personalized academic performance dashboard</p>
      </div>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Subject Performance</h3>
        <p className="text-slate-400">View your question-wise analysis, results, and performance predictions.</p>
      </div>
    </div>
  );
}

// HOD Control Center
function HODControlCenter({ departments, students, faculty, subjects, results, attendanceSessions, analytics }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">HOD Control Center</h2>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">Department-level management and analytics dashboard.</p>
      </div>
    </div>
  );
}

// Principal Dashboard
function PrincipalDashboard({ departments, students, faculty, subjects, examinations, results, analytics }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Principal Dashboard</h2>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">Institution-wide analytics and oversight.</p>
      </div>
    </div>
  );
}

// Attendance Module
function AttendanceModule({ students, attendanceSessions, attendanceRecords, fetchData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Attendance Intelligence</h2>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">Track and analyze student attendance patterns.</p>
      </div>
    </div>
  );
}

// Reports Module
function ReportsModule({ analytics, departments, subjects, students, results }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Reports Center</h2>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <p className="text-slate-400">Generate NBA, NAAC, and custom reports.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
