/*
# Academic Intelligence & Analytics Platform Schema

Comprehensive schema for an enterprise Academic Intelligence and Student Performance Analytics Platform.
*/

-- CORE ORGANIZATIONAL TABLES
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  hod_id uuid,
  established_year integer,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  degree_type text NOT NULL,
  duration_years integer NOT NULL,
  total_semesters integer NOT NULL,
  description text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  intake_capacity integer DEFAULT 60,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_department ON branches(department_id);
CREATE INDEX IF NOT EXISTS idx_branches_program ON branches(program_id);

CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_number integer NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
  semester_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(academic_year_id, semester_number)
);

CREATE INDEX IF NOT EXISTS idx_semesters_academic_year ON semesters(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_semesters_current ON semesters(is_current);

-- USERS AND ROLES
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'faculty', 'hod', 'exam_branch', 'principal', 'admin')),
  phone text,
  avatar_url text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  roll_number text UNIQUE NOT NULL,
  admission_number text UNIQUE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  current_semester integer DEFAULT 1,
  admission_year integer,
  section text,
  batch text,
  guardian_name text,
  guardian_phone text,
  address text,
  date_of_birth date,
  gender text,
  category text,
  cgpa decimal(5,2) DEFAULT 0.00,
  sgpa decimal(5,2) DEFAULT 0.00,
  total_credits integer DEFAULT 0,
  earned_credits integer DEFAULT 0,
  backlogs_count integer DEFAULT 0,
  placement_status text DEFAULT 'not_placed',
  placement_company text,
  placement_package decimal(10,2),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(current_semester);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- FACULTY
CREATE TABLE IF NOT EXISTS faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_id text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  designation text,
  qualification text,
  specialization text,
  experience_years integer DEFAULT 0,
  joining_date date,
  research_interests text[],
  publications_count integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faculty_user ON faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_employee ON faculty(employee_id);
CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty(department_id);

-- PROGRAM OUTCOMES
CREATE TABLE IF NOT EXISTS program_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  blooms_level text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blooms_taxonomy_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number integer UNIQUE NOT NULL,
  level_name text NOT NULL,
  description text,
  cognitive_process text,
  keywords text[],
  created_at timestamptz DEFAULT now()
);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  credits integer NOT NULL DEFAULT 3,
  lecture_hours integer DEFAULT 3,
  tutorial_hours integer DEFAULT 1,
  practical_hours integer DEFAULT 0,
  total_hours integer DEFAULT 4,
  semester_recommended integer,
  subject_type text DEFAULT 'theory',
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  is_elective boolean DEFAULT false,
  prerequisites text[],
  description text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_recommended);

CREATE TABLE IF NOT EXISTS subject_co_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  co_id uuid REFERENCES course_outcomes(id) ON DELETE CASCADE,
  weightage decimal(5,2) DEFAULT 1.00,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, co_id)
);

CREATE TABLE IF NOT EXISTS subject_po_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  po_id uuid REFERENCES program_outcomes(id) ON DELETE CASCADE,
  correlation_strength text DEFAULT 'medium',
  weightage decimal(5,2) DEFAULT 1.00,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, po_id)
);

-- SECTIONS AND ENROLLMENTS
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
  section_name text NOT NULL,
  batch_year integer NOT NULL,
  capacity integer DEFAULT 60,
  faculty_advisor_id uuid REFERENCES faculty(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, semester_id, section_name, batch_year)
);

CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
  enrollment_type text DEFAULT 'regular',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON student_enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_semester ON student_enrollments(semester_id);

CREATE TABLE IF NOT EXISTS subject_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES faculty(id) ON DELETE SET NULL,
  schedule text,
  room text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, semester_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_offerings_subject ON subject_offerings(subject_id);
CREATE INDEX IF NOT EXISTS idx_offerings_faculty ON subject_offerings(faculty_id);

-- EXAMINATION SYSTEM
CREATE TABLE IF NOT EXISTS exam_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  weightage decimal(5,2) DEFAULT 1.00,
  max_attempts integer DEFAULT 1,
  has_question_paper boolean DEFAULT true,
  is_scheduled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO exam_types (code, name, description, weightage) VALUES
('MID1', 'Mid Term Exam 1', 'First mid-term examination', 15.00),
('MID2', 'Mid Term Exam 2', 'Second mid-term examination', 15.00),
('SEM', 'Semester End Exam', 'Final semester examination', 70.00),
('INT', 'Internal Assessment', 'Continuous internal assessment', 100.00),
('PRACTICAL', 'Practical Exam', 'Laboratory practical examination', 100.00),
('ASSIGNMENT', 'Assignment', 'Course assignments', 100.00)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type_id uuid REFERENCES exam_types(id) ON DELETE RESTRICT,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
  exam_name text NOT NULL,
  exam_code text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  result_date date,
  is_published boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  total_marks integer DEFAULT 100,
  passing_marks integer DEFAULT 40,
  instructions text,
  status text DEFAULT 'scheduled',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_examinations_type ON examinations(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_examinations_semester ON examinations(semester_id);
CREATE INDEX IF NOT EXISTS idx_examinations_status ON examinations(status);
CREATE INDEX IF NOT EXISTS idx_examinations_dates ON examinations(start_date, end_date);

CREATE TABLE IF NOT EXISTS exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  examination_id uuid REFERENCES examinations(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date date,
  start_time time,
  end_time time,
  duration_minutes integer DEFAULT 180,
  venue text,
  max_marks integer DEFAULT 100,
  passing_marks integer DEFAULT 40,
  instructions text,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  UNIQUE(examination_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_subjects_examination ON exam_subjects(examination_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject ON exam_subjects(subject_id);

-- QUESTION PAPERS AND QUESTIONS
CREATE TABLE IF NOT EXISTS question_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id uuid REFERENCES exam_subjects(id) ON DELETE CASCADE,
  paper_code text UNIQUE NOT NULL,
  version text DEFAULT 'v1',
  total_marks integer NOT NULL,
  total_questions integer DEFAULT 0,
  duration_minutes integer DEFAULT 180,
  instructions text,
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_papers_exam_subject ON question_papers(exam_subject_id);
CREATE INDEX IF NOT EXISTS idx_question_papers_status ON question_papers(status);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_paper_id uuid REFERENCES question_papers(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL,
  max_marks integer NOT NULL,
  unit_number integer,
  topic text,
  difficulty_level text DEFAULT 'medium',
  blooms_taxonomy_level text,
  blooms_taxonomy_id uuid REFERENCES blooms_taxonomy_levels(id) ON DELETE SET NULL,
  co_mapping text[],
  po_mapping text[],
  expected_time_minutes integer,
  model_answer text,
  hints text,
  is_compulsory boolean DEFAULT true,
  has_alternatives boolean DEFAULT false,
  parent_question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(question_paper_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_questions_paper ON questions(question_paper_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON questions(question_number);
CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit_number);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_questions_blooms ON questions(blooms_taxonomy_level);
CREATE INDEX IF NOT EXISTS idx_questions_co ON questions(co_mapping);
CREATE INDEX IF NOT EXISTS idx_questions_po ON questions(po_mapping);

-- QUESTION-WISE MARKS ENTRY
CREATE TABLE IF NOT EXISTS question_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  marks_obtained integer NOT NULL DEFAULT 0,
  max_marks integer NOT NULL,
  is_correct boolean,
  is_attempted boolean DEFAULT true,
  time_taken_minutes integer,
  remarks text,
  evaluated_by uuid REFERENCES faculty(id) ON DELETE SET NULL,
  evaluated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_marks_student ON question_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_question_marks_question ON question_marks(question_id);
CREATE INDEX IF NOT EXISTS idx_question_marks_evaluated ON question_marks(evaluated_by);

-- STUDENT RESULTS
CREATE TABLE IF NOT EXISTS student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  examination_id uuid REFERENCES examinations(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  exam_subject_id uuid REFERENCES exam_subjects(id) ON DELETE CASCADE,
  total_marks_obtained integer DEFAULT 0,
  max_marks integer DEFAULT 100,
  percentage decimal(5,2) DEFAULT 0.00,
  grade text,
  grade_points decimal(4,2),
  is_passed boolean DEFAULT false,
  is_absent boolean DEFAULT false,
  rank_in_subject integer,
  rank_in_class integer,
  co_achievement jsonb,
  po_achievement jsonb,
  unit_performance jsonb,
  blooms_performance jsonb,
  question_analysis jsonb,
  remarks text,
  is_locked boolean DEFAULT false,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, examination_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_results_student ON student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_examination ON student_results(examination_id);
CREATE INDEX IF NOT EXISTS idx_results_subject ON student_results(subject_id);
CREATE INDEX IF NOT EXISTS idx_results_passed ON student_results(is_passed);

-- BACKLOGS
CREATE TABLE IF NOT EXISTS backlogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
  examination_id uuid REFERENCES examinations(id) ON DELETE SET NULL,
  backlog_type text DEFAULT 'failed',
  attempts_count integer DEFAULT 1,
  max_attempts integer DEFAULT 4,
  last_attempt_date date,
  is_cleared boolean DEFAULT false,
  cleared_date date,
  cleared_examination_id uuid REFERENCES examinations(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backlogs_student ON backlogs(student_id);
CREATE INDEX IF NOT EXISTS idx_backlogs_subject ON backlogs(subject_id);
CREATE INDEX IF NOT EXISTS idx_backlogs_status ON backlogs(status);

-- ATTENDANCE SYSTEM
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_offering_id uuid REFERENCES subject_offerings(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time time,
  end_time time,
  session_type text DEFAULT 'lecture',
  topic_covered text,
  faculty_id uuid REFERENCES faculty(id) ON DELETE SET NULL,
  room text,
  total_students_expected integer DEFAULT 0,
  actual_present integer DEFAULT 0,
  is_conducted boolean DEFAULT true,
  remarks text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subject_offering_id, session_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_offering ON attendance_sessions(subject_offering_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id uuid REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present',
  check_in_time time,
  remarks text,
  marked_by uuid REFERENCES faculty(id) ON DELETE SET NULL,
  marked_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(attendance_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

-- ANALYTICS CACHE
CREATE TABLE IF NOT EXISTS analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  cache_type text NOT NULL,
  entity_id uuid,
  filters jsonb,
  data jsonb NOT NULL,
  computed_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour'),
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_type ON analytics_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- PREDICTIONS AND ALERTS
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  prediction_type text NOT NULL,
  prediction_value decimal(10,4),
  confidence_score decimal(5,2),
  input_features jsonb,
  model_version text,
  computed_at timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_entity ON predictions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text DEFAULT 'warning',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  suggested_action text,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);

-- GRADING SCHEMES (decimal(4,2) can hold 99.99 for grade_points)
CREATE TABLE IF NOT EXISTS grading_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_name text NOT NULL,
  grade text NOT NULL,
  grade_points decimal(4,2) NOT NULL,
  min_percentage integer NOT NULL,
  max_percentage integer NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO grading_schemes (scheme_name, grade, grade_points, min_percentage, max_percentage, description) VALUES
('Standard', 'O', 10.00, 90, 100, 'Outstanding'),
('Standard', 'A+', 9.00, 80, 89, 'Excellent'),
('Standard', 'A', 8.00, 70, 79, 'Very Good'),
('Standard', 'B+', 7.00, 60, 69, 'Good'),
('Standard', 'B', 6.00, 50, 59, 'Average'),
('Standard', 'C', 5.00, 45, 49, 'Pass'),
('Standard', 'P', 4.00, 40, 44, 'Pass'),
('Standard', 'F', 0.00, 0, 39, 'Fail'),
('Standard', 'AB', 0.00, -1, -1, 'Absent')
ON CONFLICT DO NOTHING;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blooms_taxonomy_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_co_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_schemes ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_delete_own" ON users;
CREATE POLICY "users_delete_own" ON users FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_full_access" ON departments;
CREATE POLICY "departments_full_access" ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "programs_full_access" ON programs;
CREATE POLICY "programs_full_access" ON programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "branches_full_access" ON branches;
CREATE POLICY "branches_full_access" ON branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "academic_years_full_access" ON academic_years;
CREATE POLICY "academic_years_full_access" ON academic_years FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "semesters_full_access" ON semesters;
CREATE POLICY "semesters_full_access" ON semesters FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "students_full_access" ON students;
CREATE POLICY "students_full_access" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "faculty_full_access" ON faculty;
CREATE POLICY "faculty_full_access" ON faculty FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "program_outcomes_full_access" ON program_outcomes;
CREATE POLICY "program_outcomes_full_access" ON program_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "course_outcomes_full_access" ON course_outcomes;
CREATE POLICY "course_outcomes_full_access" ON course_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "blooms_taxonomy_full_access" ON blooms_taxonomy_levels;
CREATE POLICY "blooms_taxonomy_full_access" ON blooms_taxonomy_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "subjects_full_access" ON subjects;
CREATE POLICY "subjects_full_access" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "subject_co_mappings_full_access" ON subject_co_mappings;
CREATE POLICY "subject_co_mappings_full_access" ON subject_co_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "subject_po_mappings_full_access" ON subject_po_mappings;
CREATE POLICY "subject_po_mappings_full_access" ON subject_po_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sections_full_access" ON sections;
CREATE POLICY "sections_full_access" ON sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "student_enrollments_full_access" ON student_enrollments;
CREATE POLICY "student_enrollments_full_access" ON student_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "subject_offerings_full_access" ON subject_offerings;
CREATE POLICY "subject_offerings_full_access" ON subject_offerings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "exam_types_full_access" ON exam_types;
CREATE POLICY "exam_types_full_access" ON exam_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "examinations_full_access" ON examinations;
CREATE POLICY "examinations_full_access" ON examinations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "exam_subjects_full_access" ON exam_subjects;
CREATE POLICY "exam_subjects_full_access" ON exam_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "question_papers_full_access" ON question_papers;
CREATE POLICY "question_papers_full_access" ON question_papers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "questions_full_access" ON questions;
CREATE POLICY "questions_full_access" ON questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "question_marks_full_access" ON question_marks;
CREATE POLICY "question_marks_full_access" ON question_marks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "student_results_full_access" ON student_results;
CREATE POLICY "student_results_full_access" ON student_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "backlogs_full_access" ON backlogs;
CREATE POLICY "backlogs_full_access" ON backlogs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_sessions_full_access" ON attendance_sessions;
CREATE POLICY "attendance_sessions_full_access" ON attendance_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_records_full_access" ON attendance_records;
CREATE POLICY "attendance_records_full_access" ON attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_cache_full_access" ON analytics_cache;
CREATE POLICY "analytics_cache_full_access" ON analytics_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "predictions_full_access" ON predictions;
CREATE POLICY "predictions_full_access" ON predictions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alerts_full_access" ON alerts;
CREATE POLICY "alerts_full_access" ON alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "grading_schemes_full_access" ON grading_schemes;
CREATE POLICY "grading_schemes_full_access" ON grading_schemes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INITIAL DATA FOR BLOOMS TAXONOMY
INSERT INTO blooms_taxonomy_levels (level_number, level_name, description, cognitive_process, keywords) VALUES
(1, 'Remember', 'Recall facts and basic concepts', 'Retrieve relevant knowledge from long-term memory', ARRAY['define', 'describe', 'list', 'recall', 'recognize']),
(2, 'Understand', 'Explain ideas or concepts', 'Construct meaning from instructional messages', ARRAY['explain', 'interpret', 'summarize', 'classify', 'compare']),
(3, 'Apply', 'Use information in new situations', 'Carry out or use a procedure in a given situation', ARRAY['apply', 'execute', 'implement', 'use', 'demonstrate']),
(4, 'Analyze', 'Draw connections among ideas', 'Break material into constituent parts and determine relationships', ARRAY['analyze', 'differentiate', 'compare', 'contrast', 'distinguish']),
(5, 'Evaluate', 'Justify a stand or decision', 'Make judgments based on criteria and standards', ARRAY['evaluate', 'assess', 'critique', 'judge', 'defend']),
(6, 'Create', 'Produce new or original work', 'Reorganize elements into a new pattern or structure', ARRAY['create', 'design', 'construct', 'develop', 'formulate'])
ON CONFLICT (level_number) DO NOTHING;

-- INITIAL DATA FOR COURSE OUTCOMES
INSERT INTO course_outcomes (code, description, blooms_level) VALUES
('CO1', 'Ability to recall and understand fundamental concepts', 'Remember'),
('CO2', 'Ability to apply theoretical concepts to practical problems', 'Apply'),
('CO3', 'Ability to analyze and interpret data', 'Analyze'),
('CO4', 'Ability to design and develop solutions', 'Create'),
('CO5', 'Ability to evaluate and validate outcomes', 'Evaluate'),
('CO6', 'Ability to communicate technical concepts effectively', 'Understand')
ON CONFLICT (code) DO NOTHING;

-- INITIAL DATA FOR PROGRAM OUTCOMES (NBA Based)
INSERT INTO program_outcomes (code, description, category) VALUES
('PO1', 'Apply knowledge of mathematics, science, engineering fundamentals, and engineering specialization', 'Engineering Knowledge'),
('PO2', 'Identify, formulate, and analyze complex engineering problems', 'Problem Analysis'),
('PO3', 'Design solutions for complex engineering problems', 'Design'),
('PO4', 'Conduct investigations of complex problems using research-based knowledge', 'Investigation'),
('PO5', 'Create, select, and apply appropriate techniques, resources, and modern engineering tools', 'Tools'),
('PO6', 'Apply reasoning to assess societal, health, safety, legal, and cultural issues', 'Society'),
('PO7', 'Understand the impact of engineering solutions in societal and environmental contexts', 'Environment'),
('PO8', 'Apply ethical principles and commit to professional ethics', 'Ethics'),
('PO9', 'Function effectively as an individual, and as a member or leader in diverse teams', 'Team Work'),
('PO10', 'Communicate effectively on complex engineering activities', 'Communication'),
('PO11', 'Demonstrate knowledge of engineering and management principles', 'Management'),
('PO12', 'Engage in independent and life-long learning', 'Learning')
ON CONFLICT (code) DO NOTHING;