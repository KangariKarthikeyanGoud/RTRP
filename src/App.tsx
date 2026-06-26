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
  Upload, Save, Lock, Unlock, Send, Printer, FileDown
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

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

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'exam-branch' | 'faculty' | 'student' | 'hod' | 'principal' | 'attendance' | 'reports'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<'student' | 'faculty' | 'hod' | 'exam_branch' | 'principal' | 'admin'>('admin');
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

  useEffect(() => {
    fetchAllData();
  }, []);

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

  // Add sample data for empty database
  const addSampleData = async () => {
    try {
      // Add sample department
      const { data: deptData } = await supabase.from('departments').insert([
        { code: 'CSE', name: 'Computer Science & Engineering', status: 'active' },
        { code: 'ECE', name: 'Electronics & Communication Engineering', status: 'active' },
        { code: 'MECH', name: 'Mechanical Engineering', status: 'active' },
        { code: 'CIVIL', name: 'Civil Engineering', status: 'active' }
      ]).select();

      // Add sample programs
      await supabase.from('programs').insert([
        { code: 'BTECH', name: 'Bachelor of Technology', degree_type: 'B.Tech', duration_years: 4, total_semesters: 8, status: 'active' },
        { code: 'MTECH', name: 'Master of Technology', degree_type: 'M.Tech', duration_years: 2, total_semesters: 4, status: 'active' }
      ]);

      // Add academic year
      const ay = new Date().getFullYear();
      await supabase.from('academic_years').insert([
        { year_label: `${ay}-${ay + 1}`, start_date: `${ay}-07-01`, end_date: `${ay + 1}-06-30`, is_current: true, status: 'active' }
      ]);

      // Add sample subjects
      await supabase.from('subjects').insert([
        { code: 'CS101', name: 'Programming Fundamentals', credits: 4, semester_recommended: 1, subject_type: 'theory', department_id: deptData?.[0]?.id },
        { code: 'CS201', name: 'Data Structures', credits: 4, semester_recommended: 3, subject_type: 'theory', department_id: deptData?.[0]?.id },
        { code: 'CS301', name: 'Database Management Systems', credits: 4, semester_recommended: 5, subject_type: 'theory', department_id: deptData?.[0]?.id },
        { code: 'CS302', name: 'Operating Systems', credits: 3, semester_recommended: 5, subject_type: 'theory', department_id: deptData?.[0]?.id },
        { code: 'CS401', name: 'Computer Networks', credits: 4, semester_recommended: 6, subject_type: 'theory', department_id: deptData?.[0]?.id }
      ]);

      // Add sample exam type if not exists
      await supabase.from('examinations').insert([
        { exam_type_id: 'exam_types.id', semester_id: 'current', exam_name: 'Mid Semester Exam 1', exam_code: 'MID1-2024', start_date: '2024-09-15', end_date: '2024-09-25', total_marks: 100, passing_marks: 40, status: 'scheduled' }
      ]);

      fetchAllData();
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  };

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

        {/* User Role Selector */}
        <div className="p-4 border-b border-slate-700">
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as any)}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="principal">Principal</option>
            <option value="hod">HOD</option>
            <option value="exam_branch">Exam Branch</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" view="dashboard" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
          <NavItem icon={<FileText />} label="Exam Branch" view="exam-branch" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'exam_branch', 'principal']} userRole={userRole} />
          <NavItem icon={<GraduationCap />} label="Faculty Portal" view="faculty" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'faculty', 'hod', 'principal']} userRole={userRole} />
          <NavItem icon={<Users />} label="Student Portal" view="student" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
          <NavItem icon={<Building2 />} label="HOD Center" view="hod" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'hod', 'principal']} userRole={userRole} />
          <NavItem icon={<Target />} label="Principal" view="principal" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} showFor={['admin', 'principal']} userRole={userRole} />
          <NavItem icon={<UserCheck />} label="Attendance" view="attendance" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
          <NavItem icon={<BarChart3 />} label="Reports" view="reports" currentView={currentView} setCurrentView={setCurrentView} sidebarOpen={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={fetchAllData} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
            {sidebarOpen && 'Refresh Data'}
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

      {/* Tabs */}
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
                      {exam.status === 'scheduled' && (
                        <button className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-sky-400"><Unlock className="w-4 h-4" /></button>
                      )}
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
              <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm">View CO/PO</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'questions' && (
        <QuestionPaperBuilder subjects={subjects} />
      )}

      {/* Create Exam Modal */}
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
                  <input
                    type="date"
                    value={newExam.start_date}
                    onChange={(e) => setNewExam({ ...newExam, start_date: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newExam.end_date}
                    onChange={(e) => setNewExam({ ...newExam, end_date: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
                  />
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

// Question Paper Builder Component
function QuestionPaperBuilder({ subjects }: any) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState([
    { question_number: 1, question_text: '', max_marks: 10, difficulty: 'medium', blooms_level: 'Remember', co_mapping: [], po_mapping: [] }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, {
      question_number: questions.length + 1,
      question_text: '',
      max_marks: 10,
      difficulty: 'medium',
      blooms_level: 'Remember',
      co_mapping: [],
      po_mapping: []
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Select Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2"
            >
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
                value={q.question_text}
                onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 min-h-[80px]"
                placeholder="Enter question text..."
              />
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={q.max_marks}
                    onChange={(e) => updateQuestion(index, 'max_marks', parseInt(e.target.value))}
                    className="w-full bg-slate-700 text-white rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Difficulty</label>
                  <select
                    value={q.difficulty}
                    onChange={(e) => updateQuestion(index, 'difficulty', e.target.value)}
                    className="w-full bg-slate-700 text-white rounded px-2 py-1"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="very_hard">Very Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bloom's Level</label>
                  <select
                    value={q.blooms_level}
                    onChange={(e) => updateQuestion(index, 'blooms_level', e.target.value)}
                    className="w-full bg-slate-700 text-white rounded px-2 py-1"
                  >
                    {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit</label>
                  <select className="w-full bg-slate-700 text-white rounded px-2 py-1">
                    {[1, 2, 3, 4, 5].map(u => <option key={u} value={u}>Unit {u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between">
        <button onClick={addQuestion} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2">
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
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [marksData, setMarksData] = useState<Record<string, number>>({});

  const filteredStudents = students.slice(0, 20);

  const questionStats = questions.map((q: any) => {
    const marksForQ = questionMarks.filter((m: any) => m.question_id === q.id);
    const avg = marksForQ.length > 0
      ? marksForQ.reduce((sum: number, m: any) => sum + m.marks_obtained, 0) / marksForQ.length
      : 0;
    return {
      ...q,
      avgMarks: avg.toFixed(1),
      attempts: marksForQ.length,
      successRate: marksForQ.length > 0
        ? (marksForQ.filter((m: any) => m.marks_obtained >= q.max_marks * 0.5).length / marksForQ.length * 100).toFixed(1)
        : 0
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Faculty Portal</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {['marks-entry', 'analytics', 'question-analysis', 'reports'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'marks-entry' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Subject</label>
                <select className="w-full bg-slate-700 text-white rounded-lg px-3 py-2">
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Exam</label>
                <select className="w-full bg-slate-700 text-white rounded-lg px-3 py-2">
                  <option value="mid1">Mid Semester Exam 1</option>
                  <option value="mid2">Mid Semester Exam 2</option>
                  <option value="sem">Semester End Exam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Question Paper</label>
                <select className="w-full bg-slate-700 text-white rounded-lg px-3 py-2">
                  <option value="qp1">CS301-MID1-2024</option>
                </select>
              </div>
            </div>
          </div>

          {/* Question-wise Marks Entry */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-700 border-b border-slate-600">
              <h3 className="text-white font-medium">Question-wise Marks Entry</h3>
              <p className="text-slate-400 text-sm">Enter marks for each question below</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Roll No.</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Student Name</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Q1 (10)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Q2 (5)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Q3 (15)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Q4 (10)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Q5 (10)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">%</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-300">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredStudents.map((student: any, sIndex: number) => {
                    const q1 = marksData[`${student.id}-q1`] ?? (sIndex * 7 % 10);
                    const q2 = marksData[`${student.id}-q2`] ?? (sIndex * 3 % 5);
                    const q3 = marksData[`${student.id}-q3`] ?? (sIndex * 11 % 15);
                    const q4 = marksData[`${student.id}-q4`] ?? (sIndex * 6 % 10);
                    const q5 = marksData[`${student.id}-q5`] ?? (sIndex * 8 % 10);
                    const total = q1 + q2 + q3 + q4 + q5;
                    const maxTotal = 50;
                    const percent = (total / maxTotal) * 100;
                    const grade = calculateGrade(percent);

                    return (
                      <tr key={student.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-white font-mono">{student.roll_number}</td>
                        <td className="px-4 py-3 text-white">Student {sIndex + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0" max="10"
                            className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1"
                            value={q1}
                            onChange={(e) => setMarksData({ ...marksData, [`${student.id}-q1`]: parseInt(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" max="5" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={q2} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" max="15" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={q3} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" max="10" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={q4} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" max="10" className="w-16 bg-slate-700 text-white text-center rounded px-2 py-1" defaultValue={q5} />
                        </td>
                        <td className="px-4 py-3 text-center text-white font-medium">{total}/{maxTotal}</td>
                        <td className="px-4 py-3 text-center text-sky-400">{percent.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${grade.grade === 'F' ? 'bg-red-500/20 text-red-400' : grade.points >= 8 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>
                            {grade.grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-700 border-t border-slate-600 flex justify-between">
              <button className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg px-4 py-2">
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-6 py-2">
                <Send className="w-4 h-4" /> Submit Marks
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'question-analysis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Question Performance Chart */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Question-wise Average Marks</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={questionStats.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="question_number" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
                  <Bar dataKey="avgMarks" fill="#0891b2" name="Avg Marks" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Question Stats Table */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Question Statistics</h3>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {questionStats.slice(0, 8).map((q: any) => (
                  <div key={q.id || q.question_number} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sky-400 font-medium">Q{q.question_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' : q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {q.difficulty}
                      </span>
                      <span className="text-slate-400 text-xs">{q.blooms_taxonomy_level}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{q.avgMarks}/{q.max_marks}</p>
                      <p className="text-xs text-slate-400">{q.successRate}% success</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CO/PO Attainment */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">CO/PO Attainment Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-slate-400 text-sm mb-3">Course Outcomes</h4>
                <div className="space-y-2">
                  {['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].map((co, i) => (
                    <div key={co} className="flex items-center gap-3">
                      <span className="text-slate-400 w-10">{co}</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-3">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${50 + i * 8}%`, backgroundColor: CHART_COLORS[i] }}
                        />
                      </div>
                      <span className="text-white text-sm w-12">{(50 + i * 8).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-slate-400 text-sm mb-3">Program Outcomes</h4>
                <div className="space-y-2">
                  {['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6'].map((po, i) => (
                    <div key={po} className="flex items-center gap-3">
                      <span className="text-slate-400 w-10">{po}</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-3">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${60 + i * 5}%`, backgroundColor: CHART_COLORS[i + 3] }}
                        />
                      </div>
                      <span className="text-white text-sm w-12">{(60 + i * 5).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <KPICard title="Class Average" value="68.5%" change="+2.3%" icon={<TrendingUp className="w-5 h-5" />} color="bg-emerald-500" />
            <KPICard title="Pass Rate" value="85.2%" change="+5.1%" icon={<CheckCircle className="w-5 h-5" />} color="bg-sky-500" />
            <KPICard title="Highest Score" value="95/100" change="Top: Rahul K" icon={<Award className="w-5 h-5" />} color="bg-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={Array.from({ length: 20 }, (_, i) => ({
                  range: `${i * 5}-${(i + 1) * 5}`,
                  count: Math.floor(Math.random() * 30 + 5)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
                  <Area type="monotone" dataKey="count" stroke="#0891b2" fill="#0891b2" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Unit-wise Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                  { unit: 'Unit 1', avg: 72 },
                  { unit: 'Unit 2', avg: 65 },
                  { unit: 'Unit 3', avg: 78 },
                  { unit: 'Unit 4', avg: 61 },
                  { unit: 'Unit 5', avg: 70 }
                ]}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="unit" stroke="#94a3b8" />
                  <PolarRadiusAxis stroke="#94a3b8" />
                  <Radar name="Avg Score" dataKey="avg" stroke="#1e40af" fill="#1e40af" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, change, icon, color }: { title: string; value: string; change: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <p className={`text-xs mt-1 ${change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{change}</p>
        </div>
        <div className={`${color} p-2 rounded-lg text-white`}>{icon}</div>
      </div>
    </div>
  );
}

// Student Analytics Dashboard
function StudentAnalytics({ student, subjects, results, questionMarks, questions }: any) {
  const mockStudent = {
    roll_number: '20BCE1234',
    name: 'Ravi Kumar',
    branch: 'Computer Science & Engineering',
    semester: 5,
    cgpa: 8.45,
    sgpa: 8.72,
    rank: 12,
    total_students: 60
  };

  const subjectPerformance = [
    { code: 'CS301', name: 'Database Systems', marks: 85, grade: 'A', credits: 4 },
    { code: 'CS302', name: 'Operating Systems', marks: 78, grade: 'B+', credits: 3 },
    { code: 'CS303', name: 'Computer Networks', marks: 92, grade: 'O', credits: 4 },
    { code: 'CS304', name: 'Software Engineering', marks: 88, grade: 'A+', credits: 3 },
    { code: 'CS305', name: 'Web Technologies', marks: 75, grade: 'B+', credits: 3 }
  ];

  const questionAnalysis = [
    { question: 'Q1', topic: 'ER Diagram', obtained: 8, max: 10, status: 'correct' },
    { question: 'Q2', topic: 'Normalization', obtained: 4, max: 5, status: 'correct' },
    { question: 'Q3', topic: 'SQL Queries', obtained: 12, max: 15, status: 'partial' },
    { question: 'Q4', topic: 'Transactions', obtained: 6, max: 10, status: 'partial' },
    { question: 'Q5', topic: 'Indexing', obtained: 8, max: 10, status: 'correct' },
    { question: 'Q6', topic: 'NoSQL', obtained: 0, max: 10, status: 'skipped' }
  ];

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sky-100">{mockStudent.roll_number}</p>
            <h2 className="text-2xl font-bold text-white mt-1">{mockStudent.name}</h2>
            <p className="text-sky-100 mt-2">{mockStudent.branch}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">{mockStudent.cgpa}</div>
            <p className="text-sky-100">CGPA</p>
            <div className="mt-2 text-white">
              Rank: {mockStudent.rank}/{mockStudent.total_students}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Current SGPA</p>
          <p className="text-2xl font-bold text-white">{mockStudent.sgpa}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Attendance</p>
          <p className="text-2xl font-bold text-emerald-400">85.5%</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Backlogs</p>
          <p className="text-2xl font-bold text-sky-400">0</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Placement Status</p>
          <p className="text-2xl font-bold text-amber-400">In Progress</p>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Subject Performance</h3>
          <div className="space-y-3">
            {subjectPerformance.map((subject) => (
              <div key={subject.code} className="flex items-center gap-4">
                <div className="w-24 text-sky-400 font-mono text-sm">{subject.code}</div>
                <div className="flex-1">
                  <p className="text-white text-sm">{subject.name}</p>
                  <div className="mt-1 bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${subject.marks >= 90 ? 'bg-emerald-500' : subject.marks >= 70 ? 'bg-sky-500' : 'bg-amber-500'}`}
                      style={{ width: `${subject.marks}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white">{subject.marks}%</p>
                  <p className={`text-xs ${subject.grade === 'O' ? 'text-emerald-400' : 'text-slate-400'}`}>{subject.grade}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CGPA Trend */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">CGPA Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[
              { sem: 'Sem 1', cgpa: 7.8 },
              { sem: 'Sem 2', cgpa: 8.1 },
              { sem: 'Sem 3', cgpa: 8.0 },
              { sem: 'Sem 4', cgpa: 8.3 },
              { sem: 'Sem 5', cgpa: 8.45 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="sem" stroke="#94a3b8" />
              <YAxis domain={[6, 10]} stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Line type="monotone" dataKey="cgpa" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Question-wise Analysis */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Question-wise Analysis (Database Systems - Mid 1)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {questionAnalysis.map((q) => (
            <div key={q.question} className={`p-3 rounded-lg text-center ${q.status === 'correct' ? 'bg-emerald-500/10 border border-emerald-500/30' : q.status === 'skipped' ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <p className="text-white font-medium">{q.question}</p>
              <p className="text-slate-400 text-xs mt-1">{q.topic}</p>
              <p className={`text-lg font-bold mt-2 ${q.status === 'correct' ? 'text-emerald-400' : q.status === 'skipped' ? 'text-red-400' : 'text-amber-400'}`}>
                {q.obtained}/{q.max}
              </p>
              <p className={`text-xs capitalize ${q.status === 'correct' ? 'text-emerald-400' : q.status === 'skipped' ? 'text-red-400' : 'text-amber-400'}`}>
                {q.status}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" /> Strong Areas
          </h3>
          <div className="space-y-2">
            {['Computer Networks', 'Web Technologies', 'Data Structures'].map((area) => (
              <div key={area} className="flex items-center justify-between bg-emerald-500/10 rounded-lg px-4 py-2">
                <span className="text-white">{area}</span>
                <span className="text-emerald-400">85%+</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Areas for Improvement
          </h3>
          <div className="space-y-2">
            {['Operating Systems - Memory Management', 'DBMS - Query Optimization', 'Mathematics - Calculus'].map((area) => (
              <div key={area} className="flex items-center justify-between bg-amber-500/10 rounded-lg px-4 py-2">
                <span className="text-white">{area}</span>
                <span className="text-amber-400">{'<'}70%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Predictions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-sky-400">8.6</div>
            <p className="text-slate-400 mt-1">Expected CGPA</p>
            <p className="text-emerald-400 text-sm">+0.15 improvement</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400">92%</div>
            <p className="text-slate-400 mt-1">Pass Probability</p>
            <p className="text-slate-500 text-sm">All subjects</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-400">78%</div>
            <p className="text-slate-400 mt-1">Placement Readiness</p>
            <p className="text-sky-400 text-sm">Strong aptitude</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// HOD Control Center
function HODControlCenter({ departments, students, faculty, subjects, results, attendanceSessions, analytics }: any) {
  const deptStudents = students.length || 280;
  const deptFaculty = faculty.length || 32;
  const avgCGPA = 7.85;
  const passRate = 82.5;
  const attendance = 78.3;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">HOD Control Center</h2>
          <p className="text-slate-400">Department: Computer Science & Engineering</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2">
            <Download className="w-4 h-4" /> NBA Report
          </button>
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2">
            <FileDown className="w-4 h-4" /> Accreditation Report
          </button>
        </div>
      </div>

      {/* Department KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-white">{deptStudents}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Faculty</p>
          <p className="text-2xl font-bold text-white">{deptFaculty}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Avg CGPA</p>
          <p className="text-2xl font-bold text-sky-400">{avgCGPA}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Pass Rate</p>
          <p className="text-2xl font-bold text-emerald-400">{passRate}%</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Avg Attendance</p>
          <p className="text-2xl font-bold text-amber-400">{attendance}%</p>
        </div>
      </div>

      {/* Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Faculty Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[
              { name: 'Dr. Sharma', passRate: 88, avgCGPA: 8.2 },
              { name: 'Prof. Patel', passRate: 82, avgCGPA: 7.8 },
              { name: 'Dr. Kumar', passRate: 90, avgCGPA: 8.4 },
              { name: 'Prof. Singh', passRate: 75, avgCGPA: 7.2 },
              { name: 'Dr. Reddy', passRate: 85, avgCGPA: 7.9 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Legend />
              <Bar dataKey="passRate" fill="#1e40af" name="Pass Rate %" />
              <Bar dataKey="avgCGPA" fill="#059669" name="Avg CGPA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Subject-wise Results</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={subjects.slice(0, 8).map((s: any) => ({
              code: s.code,
              passRate: 60 + Math.random() * 35,
              avgMarks: 55 + Math.random() * 25
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="code" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Legend />
              <Bar dataKey="passRate" fill="#0891b2" name="Pass Rate %" />
              <Bar dataKey="avgMarks" fill="#ca8a04" name="Avg Marks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Students */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" /> At-Risk Students
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm">
                <th className="px-4 py-2">Roll Number</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Semester</th>
                <th className="px-4 py-2">CGPA</th>
                <th className="px-4 py-2">Attendance</th>
                <th className="px-4 py-2">Backlogs</th>
                <th className="px-4 py-2">Risk Level</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {[
                { roll: '20BCE1101', name: 'Amit Sharma', sem: 5, cgpa: 5.2, att: 52, backlogs: 3, risk: 'high' },
                { roll: '20BCE1145', name: 'Priya Singh', sem: 5, cgpa: 5.8, att: 58, backlogs: 2, risk: 'high' },
                { roll: '20BCE1189', name: 'Rahul Verma', sem: 5, cgpa: 6.1, att: 65, backlogs: 1, risk: 'medium' },
                { roll: '20BCE1223', name: 'Sneha Patel', sem: 5, cgpa: 6.4, att: 68, backlogs: 1, risk: 'medium' }
              ].map((student) => (
                <tr key={student.roll} className="hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-white font-mono">{student.roll}</td>
                  <td className="px-4 py-3 text-white">{student.name}</td>
                  <td className="px-4 py-3 text-slate-300">{student.sem}</td>
                  <td className="px-4 py-3 text-red-400">{student.cgpa}</td>
                  <td className="px-4 py-3 text-amber-400">{student.att}%</td>
                  <td className="px-4 py-3 text-red-400">{student.backlogs}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${student.risk === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {student.risk.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-sky-400 hover:text-sky-300 text-sm">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CO/PO Attainment */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">CO/PO Attainment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-slate-400 text-sm mb-3">Course Outcomes Attainment</h4>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                { co: 'CO1', attainment: 78 },
                { co: 'CO2', attainment: 82 },
                { co: 'CO3', attainment: 71 },
                { co: 'CO4', attainment: 85 },
                { co: 'CO5', attainment: 69 },
                { co: 'CO6', attainment: 75 }
              ]}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="co" stroke="#94a3b8" />
                <PolarRadiusAxis domain={[0, 100]} stroke="#94a3b8" />
                <Radar dataKey="attainment" stroke="#1e40af" fill="#1e40af" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-slate-400 text-sm mb-3">Program Outcomes Attainment</h4>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                { po: 'PO1', attainment: 76 },
                { po: 'PO2', attainment: 72 },
                { po: 'PO3', attainment: 80 },
                { po: 'PO4', attainment: 68 },
                { po: 'PO5', attainment: 75 },
                { po: 'PO6', attainment: 82 }
              ]}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="po" stroke="#94a3b8" />
                <PolarRadiusAxis domain={[0, 100]} stroke="#94a3b8" />
                <Radar dataKey="attainment" stroke="#059669" fill="#059669" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Principal/Admin Dashboard
function PrincipalDashboard({ departments, students, faculty, subjects, examinations, results, analytics }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Principal Dashboard</h2>
          <p className="text-slate-400">Institution-wide Analytics</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Institution KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Students', value: students.length || 2500, icon: <Users /> },
          { title: 'Total Faculty', value: faculty.length || 150, icon: <GraduationCap /> },
          { title: 'Departments', value: departments.length || 8, icon: <Building2 /> },
          { title: 'Active Subjects', value: subjects.length || 120, icon: <BookOpen /> },
          { title: 'Avg Institution CGPA', value: '7.65', icon: <TrendingUp /> },
          { title: 'Overall Pass Rate', value: '84.2%', icon: <CheckCircle /> }
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-slate-400">{kpi.icon}</div>
              <span className="text-emerald-400 text-xs">+2.3%</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{kpi.value}</p>
            <p className="text-slate-400 text-xs">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Department-wise Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={analytics.departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="passRate" fill="#1e40af" name="Pass Rate %" />
              <Line yAxisId="right" type="monotone" dataKey="avgCGPA" stroke="#059669" strokeWidth={2} name="Avg CGPA" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Semester-wise Trend Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.semesterTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="semester" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Legend />
              <Line type="monotone" dataKey="passRate" stroke="#1e40af" strokeWidth={2} name="Pass Rate %" />
              <Line type="monotone" dataKey="avgCGPA" stroke="#059669" strokeWidth={2} name="Avg CGPA" />
              <Line type="monotone" dataKey="attendance" stroke="#ca8a04" strokeWidth={2} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={analytics.gradeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="count" label={({ name }) => name}>
                {analytics.gradeDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Attendance Heatmap</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analytics.attendanceTrend.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
              <Area type="monotone" dataKey="present" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.6} />
              <Area type="monotone" dataKey="absent" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Faculty Ranking</h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {[
              { name: 'Dr. A. Kumar', dept: 'CSE', score: 92 },
              { name: 'Prof. B. Singh', dept: 'ECE', score: 89 },
              { name: 'Dr. C. Sharma', dept: 'MECH', score: 87 },
              { name: 'Prof. D. Patel', dept: 'CIVIL', score: 85 },
              { name: 'Dr. E. Reddy', dept: 'CSE', score: 84 }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-600'}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-white text-sm">{f.name}</p>
                  <p className="text-slate-400 text-xs">{f.dept}</p>
                </div>
                <span className="text-emerald-400 font-medium">{f.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" /> Institution Alerts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { type: 'warning', title: 'Low Attendance Alert', message: '45 students below 60% attendance', action: 'View Students' },
            { type: 'error', title: 'Backlog Risk', message: '23 students with 3+ backlogs', action: 'View Details' },
            { type: 'info', title: 'Upcoming Exams', message: '5 examinations scheduled this week', action: 'View Schedule' }
          ].map((alert, i) => (
            <div key={i} className={`p-4 rounded-lg border ${alert.type === 'error' ? 'bg-red-500/10 border-red-500/30' : alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-sky-500/10 border-sky-500/30'}`}>
              <h4 className="text-white font-medium">{alert.title}</h4>
              <p className="text-slate-400 text-sm mt-1">{alert.message}</p>
              <button className="text-sky-400 text-sm mt-2 hover:underline">{alert.action}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> Top Performing Students
          </h3>
          <div className="space-y-3">
            {[
              { rank: 1, name: 'Sneha Gupta', dept: 'CSE', cgpa: 9.8 },
              { rank: 2, name: 'Rahul Mehta', dept: 'ECE', cgpa: 9.72 },
              { rank: 3, name: 'Priya Sharma', dept: 'CSE', cgpa: 9.65 },
              { rank: 4, name: 'Vikram Singh', dept: 'MECH', cgpa: 9.58 },
              { rank: 5, name: 'Anjali Patel', dept: 'CIVIL', cgpa: 9.52 }
            ].map((student) => (
              <div key={student.rank} className="flex items-center gap-4 bg-slate-700/50 rounded-lg p-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${student.rank === 1 ? 'bg-amber-500 text-white' : student.rank === 2 ? 'bg-slate-300 text-slate-800' : student.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-600 text-white'}`}>
                  {student.rank}
                </span>
                <div className="flex-1">
                  <p className="text-white">{student.name}</p>
                  <p className="text-slate-400 text-sm">{student.dept}</p>
                </div>
                <span className="text-emerald-400 font-bold">{student.cgpa}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-400" /> Placement Readiness
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Placed', value: 45, color: '#059669' },
                  { name: 'In Process', value: 30, color: '#0891b2' },
                  { name: 'Training', value: 15, color: '#ca8a04' },
                  { name: 'Not Ready', value: 10, color: '#dc2626' }
                ]}
                cx="50%"
                cy="50%"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
              >
                {[
                  { color: '#059669' },
                  { color: '#0891b2' },
                  { color: '#ca8a04' },
                  { color: '#dc2626' }
                ].map((item, index) => (
                  <Cell key={`cell-${index}`} fill={item.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Attendance Module
function AttendanceModule({ students, attendanceSessions, attendanceRecords, fetchData }: any) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'entry' | 'analytics' | 'reports'>('analytics');

  const mockAttendanceData = [
    { date: '2024-09-01', present: 85, absent: 8, late: 5, total: 98 },
    { date: '2024-09-02', present: 88, absent: 6, late: 4, total: 98 },
    { date: '2024-09-03', present: 90, absent: 5, late: 3, total: 98 },
    { date: '2024-09-04', present: 82, absent: 12, late: 4, total: 98 },
    { date: '2024-09-05', present: 86, absent: 9, late: 3, total: 98 }
  ];

  const studentAttendance = students.slice(0, 30).map((s: any, i: number) => ({
    ...s,
    attendance: 70 + Math.floor(Math.random() * 25),
    status: Math.random() > 0.2 ? 'present' : Math.random() > 0.5 ? 'absent' : 'late'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance Intelligence</h2>
          <p className="text-slate-400">Track and analyze student attendance patterns</p>
        </div>
        <div className="flex gap-2">
          {['analytics', 'entry', 'reports'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${viewMode === mode ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Today Present</p>
              <p className="text-2xl font-bold text-white">845</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Today Absent</p>
              <p className="text-2xl font-bold text-white">55</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Detention Risk</p>
              <p className="text-2xl font-bold text-white">12</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Avg Attendance</p>
              <p className="text-2xl font-bold text-white">86.4%</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Attendance Trend (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={Array.from({ length: 30 }, (_, i) => ({
                day: i + 1,
                present: 75 + Math.random() * 20,
                absent: 5 + Math.random() * 15,
                late: Math.random() * 5
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
                <Legend />
                <Area type="monotone" dataKey="present" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.6} name="Present %" />
                <Area type="monotone" dataKey="absent" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} name="Absent %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Department-wise Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Department-wise Attendance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { dept: 'CSE', attendance: 88, below75: 12 },
                  { dept: 'ECE', attendance: 82, below75: 18 },
                  { dept: 'MECH', attendance: 79, below75: 22 },
                  { dept: 'CIVIL', attendance: 85, below75: 15 },
                  { dept: 'EEE', attendance: 77, below75: 25 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dept" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
                  <Legend />
                  <Bar dataKey="attendance" fill="#059669" name="Attendance %" />
                  <Bar dataKey="below75" fill="#dc2626" name="Below 75%" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">At-Risk Students (Below 75%)</h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {[
                  { name: 'Amit Sharma', roll: '20BCE1101', att: 52 },
                  { name: 'Priya Singh', roll: '20BCE1145', att: 58 },
                  { name: 'Rahul Verma', roll: '20MECH123', att: 61 },
                  { name: 'Sneha Patel', roll: '20ECE108', att: 65 },
                  { name: 'Vikram Das', roll: '20CIVIL89', att: 68 },
                  { name: 'Neha Gupta', roll: '20BCE134', att: 70 },
                  { name: 'Karan Johar', roll: '20MECH156', att: 72 }
                ].map((student, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div>
                      <p className="text-white">{student.name}</p>
                      <p className="text-slate-400 text-sm">{student.roll}</p>
                    </div>
                    <span className="text-red-400 font-bold">{student.att}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'entry' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Mark Attendance</h3>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-3 py-2"
              />
              <select className="bg-slate-700 text-white rounded-lg px-3 py-2">
                <option>CSE - Section A - Sem 5</option>
                <option>CSE - Section B - Sem 5</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-3 flex items-center justify-center gap-2">
              <UserCheck /> Mark All Present
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center gap-2">
              <UserX /> Mark All Absent
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center gap-2">
              <Save /> Save Attendance
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center gap-2">
              <Download /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm">
                  <th className="px-4 py-2">Roll No.</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Current %</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {studentAttendance.map((student: any) => (
                  <tr key={student.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-white font-mono">{student.roll_number}</td>
                    <td className="px-4 py-3 text-white">Student {student.roll_number}</td>
                    <td className="px-4 py-3">
                      <span className={`${student.attendance >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {student.attendance}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className={`px-3 py-1 rounded text-sm ${student.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>P</button>
                        <button className={`px-3 py-1 rounded text-sm ${student.status === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>A</button>
                        <button className={`px-3 py-1 rounded text-sm ${student.status === 'late' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>L</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Reports Module
function ReportsModule({ analytics, departments, subjects, students, results }: any) {
  const [reportType, setReportType] = useState<'nba' | 'naac' | 'exam' | 'custom'>('nba');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Reports Center</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4 py-2">
            <Download className="w-4 h-4" /> Export All
          </button>
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { id: 'nba', label: 'NBA Accreditation' },
          { id: 'naac', label: 'NAAC Reports' },
          { id: 'exam', label: 'Exam Analysis' },
          { id: 'custom', label: 'Custom Reports' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${reportType === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {reportType === 'nba' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'CO Attainment Report', desc: 'Course outcome attainment summary', icon: <Target /> },
            { title: 'PO Attainment Report', desc: 'Program outcome mapping analysis', icon: <BarChart3 /> },
            { title: 'Student Strength Report', desc: 'Enrollment and pass percentage', icon: <Users /> },
            { title: 'Faculty Details', desc: 'Faculty qualification and experience', icon: <GraduationCap /> },
            { title: 'Infrastructure Report', desc: 'Lab and classroom facilities', icon: <Building2 /> },
            { title: 'Placement Statistics', desc: 'Year-wise placement data', icon: <Award /> }
          ].map((report, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-sky-500 transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-sky-500/20 rounded-lg text-sky-400">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{report.title}</h4>
                  <p className="text-slate-400 text-sm mt-1">{report.desc}</p>
                </div>
                <Download className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {reportType === 'exam' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Exam Result Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">84.2%</p>
                <p className="text-slate-400 text-sm">Overall Pass Rate</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-sky-400">7.65</p>
                <p className="text-slate-400 text-sm">Average CGPA</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-400">245</p>
                <p className="text-slate-400 text-sm">Total Backlogs</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">2,150</p>
                <p className="text-slate-400 text-sm">Students Appeared</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '#475569' }} />
                <Legend />
                <Bar dataKey="passRate" fill="#059669" name="Pass Rate %" />
                <Bar dataKey="avgCGPA" fill="#0891b2" name="Avg CGPA" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
