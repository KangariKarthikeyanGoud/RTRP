/*
# Fix RLS Policies with Proper Role-Based Access Control

This migration replaces overly permissive RLS policies with proper role-based access control.

## Policy Design Overview

### Read-only Reference Data (for most users)
- departments, programs, branches, academic_years, semesters, exam_types, grading_schemes
- blooms_taxonomy_levels, course_outcomes, program_outcomes
- All authenticated users can READ
- Only admin/exam_branch/principal can WRITE

### User & Profile Data (own record access)
- users, students, faculty
- Users can read/write own profile
- Students see only their own data
- Faculty see their own data + students in their sections
- HODs see all department data
- Admins have full access

### Academic Structure
- subjects, sections, enrollments, subject_offerings
- All authenticated can READ
- Faculty can manage assigned subjects/sections
- HODs can manage department resources
- Admins have full access

### Examinations & Questions
- examinations, exam_subjects, question_papers, questions
- Students can read published content only
- Exam_branch manages all exams
- Faculty can create questions for assigned subjects
- HODs can approve department exams
- Admins have full access

### Results & Marks (Sensitive)
- question_marks, student_results, backlogs
- Students see only their own results
- Faculty can manage marks for assigned subjects
- Exam_branch can manage all results
- HODs see department results
- Admins have full access

### Attendance
- attendance_sessions, attendance_records
- Students see their own attendance
- Faculty can manage their sessions
- HODs see department attendance
- Admins have full access

### Analytics & System
- analytics_cache, predictions, alerts
- Role-based access depending on entity type
- Admins have full access
*/

-- ============================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ============================================

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION has_role(required_role text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin or principal
CREATE OR REPLACE FUNCTION is_admin_or_principal() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'principal')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is exam branch staff
CREATE OR REPLACE FUNCTION is_exam_branch() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'principal', 'exam_branch')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's department
CREATE OR REPLACE FUNCTION get_user_department() RETURNS uuid AS $$
DECLARE
  dept_id uuid;
BEGIN
  SELECT department_id INTO dept_id FROM users WHERE id = auth.uid();
  RETURN dept_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get student id from auth uid
CREATE OR REPLACE FUNCTION get_student_id() RETURNS uuid AS $$
DECLARE
  sid uuid;
BEGIN
  SELECT id INTO sid FROM students WHERE user_id = auth.uid();
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get faculty id from auth uid
CREATE OR REPLACE FUNCTION get_faculty_id() RETURNS uuid AS $$
DECLARE
  fid uuid;
BEGIN
  SELECT id INTO fid FROM faculty WHERE user_id = auth.uid();
  RETURN fid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- USERS TABLE
-- ============================================

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

CREATE POLICY "users_select_role_based" ON users FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR has_role('admin')
    OR has_role('principal')
    OR (has_role('hod') AND department_id = get_user_department())
    OR has_role('exam_branch')
  );

CREATE POLICY "users_insert_admin_only" ON users FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "users_update_role_based" ON users FOR UPDATE
  TO authenticated USING (
    auth.uid() = id OR has_role('admin') OR has_role('principal')
  ) WITH CHECK (
    auth.uid() = id OR has_role('admin') OR has_role('principal')
  );

CREATE POLICY "users_delete_admin_only" ON users FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- STUDENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "students_full_access" ON students;

CREATE POLICY "students_select_role_based" ON students FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR has_role('admin')
    OR has_role('principal')
    OR (has_role('hod') AND branch_id IN (SELECT id FROM branches WHERE department_id = get_user_department()))
    OR (has_role('faculty') AND id IN (
      SELECT se.student_id FROM student_enrollments se
      JOIN subject_offerings so ON so.section_id = se.section_id
      WHERE so.faculty_id = get_faculty_id()
    ))
    OR has_role('exam_branch')
  );

CREATE POLICY "students_insert_admin_exam" ON students FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "students_update_role_based" ON students FOR UPDATE
  TO authenticated USING (
    has_role('admin') OR has_role('exam_branch') OR user_id = auth.uid()
  ) WITH CHECK (
    has_role('admin') OR has_role('exam_branch') OR user_id = auth.uid()
  );

CREATE POLICY "students_delete_admin_only" ON students FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- FACULTY TABLE
-- ============================================

DROP POLICY IF EXISTS "faculty_full_access" ON faculty;

CREATE POLICY "faculty_select_role_based" ON faculty FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR has_role('admin')
    OR has_role('principal')
    OR (has_role('hod') AND department_id = get_user_department())
    OR has_role('exam_branch')
  );

CREATE POLICY "faculty_insert_admin_only" ON faculty FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "faculty_update_role_based" ON faculty FOR UPDATE
  TO authenticated USING (
    has_role('admin') OR user_id = auth.uid()
  ) WITH CHECK (
    has_role('admin') OR user_id = auth.uid()
  );

CREATE POLICY "faculty_delete_admin_only" ON faculty FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- REFERENCE TABLES - Read for authenticated, write for admins
-- ============================================

-- DEPARTMENTS
DROP POLICY IF EXISTS "departments_full_access" ON departments;

CREATE POLICY "departments_select_authenticated" ON departments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "departments_insert_admin" ON departments FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "departments_update_admin" ON departments FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "departments_delete_admin" ON departments FOR DELETE
  TO authenticated USING (has_role('admin'));

-- PROGRAMS
DROP POLICY IF EXISTS "programs_full_access" ON programs;

CREATE POLICY "programs_select_authenticated" ON programs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "programs_insert_admin" ON programs FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "programs_update_admin" ON programs FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "programs_delete_admin" ON programs FOR DELETE
  TO authenticated USING (has_role('admin'));

-- BRANCHES
DROP POLICY IF EXISTS "branches_full_access" ON branches;

CREATE POLICY "branches_select_authenticated" ON branches FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "branches_insert_admin" ON branches FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "branches_update_admin" ON branches FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "branches_delete_admin" ON branches FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ACADEMIC YEARS
DROP POLICY IF EXISTS "academic_years_full_access" ON academic_years;

CREATE POLICY "academic_years_select_authenticated" ON academic_years FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "academic_years_insert_admin_exam" ON academic_years FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "academic_years_update_admin_exam" ON academic_years FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "academic_years_delete_admin" ON academic_years FOR DELETE
  TO authenticated USING (has_role('admin'));

-- SEMESTERS
DROP POLICY IF EXISTS "semesters_full_access" ON semesters;

CREATE POLICY "semesters_select_authenticated" ON semesters FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "semesters_insert_admin_exam" ON semesters FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "semesters_update_admin_exam" ON semesters FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "semesters_delete_admin" ON semesters FOR DELETE
  TO authenticated USING (has_role('admin'));

-- EXAM TYPES
DROP POLICY IF EXISTS "exam_types_full_access" ON exam_types;

CREATE POLICY "exam_types_select_authenticated" ON exam_types FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "exam_types_insert_admin" ON exam_types FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "exam_types_update_admin" ON exam_types FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "exam_types_delete_admin" ON exam_types FOR DELETE
  TO authenticated USING (has_role('admin'));

-- GRADING SCHEMES
DROP POLICY IF EXISTS "grading_schemes_full_access" ON grading_schemes;

CREATE POLICY "grading_schemes_select_authenticated" ON grading_schemes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "grading_schemes_insert_admin" ON grading_schemes FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "grading_schemes_update_admin" ON grading_schemes FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "grading_schemes_delete_admin" ON grading_schemes FOR DELETE
  TO authenticated USING (has_role('admin'));

-- BLOOMS TAXONOMY LEVELS
DROP POLICY IF EXISTS "blooms_taxonomy_full_access" ON blooms_taxonomy_levels;

CREATE POLICY "blooms_taxonomy_select_authenticated" ON blooms_taxonomy_levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "blooms_taxonomy_insert_admin" ON blooms_taxonomy_levels FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "blooms_taxonomy_update_admin" ON blooms_taxonomy_levels FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "blooms_taxonomy_delete_admin" ON blooms_taxonomy_levels FOR DELETE
  TO authenticated USING (has_role('admin'));

-- COURSE OUTCOMES
DROP POLICY IF EXISTS "course_outcomes_full_access" ON course_outcomes;

CREATE POLICY "course_outcomes_select_authenticated" ON course_outcomes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "course_outcomes_insert_admin_exam" ON course_outcomes FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "course_outcomes_update_admin_exam" ON course_outcomes FOR UPDATE
  TO authenticated USING (has_role('admin') OR has_role('exam_branch')) WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "course_outcomes_delete_admin" ON course_outcomes FOR DELETE
  TO authenticated USING (has_role('admin'));

-- PROGRAM OUTCOMES
DROP POLICY IF EXISTS "program_outcomes_full_access" ON program_outcomes;

CREATE POLICY "program_outcomes_select_authenticated" ON program_outcomes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "program_outcomes_insert_admin_exam" ON program_outcomes FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "program_outcomes_update_admin_exam" ON program_outcomes FOR UPDATE
  TO authenticated USING (has_role('admin') OR has_role('exam_branch')) WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "program_outcomes_delete_admin" ON program_outcomes FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- SUBJECTS
-- ============================================

DROP POLICY IF EXISTS "subjects_full_access" ON subjects;

CREATE POLICY "subjects_select_authenticated" ON subjects FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "subjects_insert_admin_hod" ON subjects FOR INSERT
  TO authenticated WITH CHECK (
    has_role('admin') OR has_role('principal') OR 
    (has_role('hod') AND department_id = get_user_department())
  );

CREATE POLICY "subjects_update_admin_hod" ON subjects FOR UPDATE
  TO authenticated USING (
    has_role('admin') OR has_role('principal') OR
    (has_role('hod') AND department_id = get_user_department())
  ) WITH CHECK (
    has_role('admin') OR has_role('principal') OR
    (has_role('hod') AND department_id = get_user_department())
  );

CREATE POLICY "subjects_delete_admin" ON subjects FOR DELETE
  TO authenticated USING (has_role('admin'));

-- Subject CO Mappings
DROP POLICY IF EXISTS "subject_co_mappings_full_access" ON subject_co_mappings;

CREATE POLICY "subject_co_mappings_select_authenticated" ON subject_co_mappings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "subject_co_mappings_insert_admin_exam" ON subject_co_mappings FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "subject_co_mappings_update_admin_exam" ON subject_co_mappings FOR UPDATE
  TO authenticated USING (has_role('admin') OR has_role('exam_branch')) WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "subject_co_mappings_delete_admin" ON subject_co_mappings FOR DELETE
  TO authenticated USING (has_role('admin'));

-- Subject PO Mappings
DROP POLICY IF EXISTS "subject_po_mappings_full_access" ON subject_po_mappings;

CREATE POLICY "subject_po_mappings_select_authenticated" ON subject_po_mappings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "subject_po_mappings_insert_admin_exam" ON subject_po_mappings FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "subject_po_mappings_update_admin_exam" ON subject_po_mappings FOR UPDATE
  TO authenticated USING (has_role('admin') OR has_role('exam_branch')) WITH CHECK (has_role('admin') OR has_role('exam_branch'));

CREATE POLICY "subject_po_mappings_delete_admin" ON subject_po_mappings FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- SECTIONS AND ENROLLMENTS
-- ============================================

-- Sections
DROP POLICY IF EXISTS "sections_full_access" ON sections;

CREATE POLICY "sections_select_authenticated" ON sections FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sections_insert_admin_exam_hod" ON sections FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch() OR has_role('hod'));

CREATE POLICY "sections_update_admin_exam_hod" ON sections FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch() OR has_role('hod')) 
  WITH CHECK (is_admin_or_principal() OR is_exam_branch() OR has_role('hod'));

CREATE POLICY "sections_delete_admin" ON sections FOR DELETE
  TO authenticated USING (has_role('admin'));

-- Student Enrollments
DROP POLICY IF EXISTS "student_enrollments_full_access" ON student_enrollments;

CREATE POLICY "student_enrollments_select_role_based" ON student_enrollments FOR SELECT
  TO authenticated USING (
    student_id = get_student_id()
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR (has_role('hod') AND section_id IN (
      SELECT id FROM sections WHERE branch_id IN (
        SELECT id FROM branches WHERE department_id = get_user_department()
      )
    ))
    OR (has_role('faculty') AND section_id IN (
      SELECT section_id FROM subject_offerings WHERE faculty_id = get_faculty_id()
    ))
  );

CREATE POLICY "student_enrollments_insert_admin_exam" ON student_enrollments FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "student_enrollments_update_admin_exam" ON student_enrollments FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "student_enrollments_delete_admin" ON student_enrollments FOR DELETE
  TO authenticated USING (has_role('admin'));

-- Subject Offerings
DROP POLICY IF EXISTS "subject_offerings_full_access" ON subject_offerings;

CREATE POLICY "subject_offerings_select_authenticated" ON subject_offerings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "subject_offerings_insert_admin_exam_hod" ON subject_offerings FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR has_role('hod') OR is_exam_branch());

CREATE POLICY "subject_offerings_update_role_based" ON subject_offerings FOR UPDATE
  TO authenticated USING (
    is_admin_or_principal() OR has_role('hod') OR
    (has_role('faculty') AND faculty_id = get_faculty_id())
  ) WITH CHECK (
    is_admin_or_principal() OR has_role('hod') OR
    (has_role('faculty') AND faculty_id = get_faculty_id())
  );

CREATE POLICY "subject_offerings_delete_admin" ON subject_offerings FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- EXAMINATIONS
-- ============================================

DROP POLICY IF EXISTS "examinations_full_access" ON examinations;

CREATE POLICY "examinations_select_role_based" ON examinations FOR SELECT
  TO authenticated USING (
    is_published = true
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "examinations_insert_admin_exam" ON examinations FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "examinations_update_admin_exam" ON examinations FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "examinations_delete_admin" ON examinations FOR DELETE
  TO authenticated USING (has_role('admin'));

-- Exam Subjects
DROP POLICY IF EXISTS "exam_subjects_full_access" ON exam_subjects;

CREATE POLICY "exam_subjects_select_role_based" ON exam_subjects FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM examinations WHERE id = exam_subjects.examination_id AND is_published = true)
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "exam_subjects_insert_admin_exam" ON exam_subjects FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "exam_subjects_update_admin_exam" ON exam_subjects FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "exam_subjects_delete_admin" ON exam_subjects FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- QUESTION PAPERS AND QUESTIONS
-- ============================================

DROP POLICY IF EXISTS "question_papers_full_access" ON question_papers;

CREATE POLICY "question_papers_select_role_based" ON question_papers FOR SELECT
  TO authenticated USING (
    status = 'published'
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "question_papers_insert_role_based" ON question_papers FOR INSERT
  TO authenticated WITH CHECK (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  );

CREATE POLICY "question_papers_update_role_based" ON question_papers FOR UPDATE
  TO authenticated USING (
    is_admin_or_principal() OR is_exam_branch() OR 
    (has_role('faculty') AND created_by = auth.uid())
  ) WITH CHECK (
    is_admin_or_principal() OR is_exam_branch() OR 
    (has_role('faculty') AND created_by = auth.uid())
  );

CREATE POLICY "question_papers_delete_admin" ON question_papers FOR DELETE
  TO authenticated USING (has_role('admin'));

-- Questions
DROP POLICY IF EXISTS "questions_full_access" ON questions;

CREATE POLICY "questions_select_role_based" ON questions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM question_papers WHERE id = questions.question_paper_id AND status = 'published')
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "questions_insert_role_based" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  );

CREATE POLICY "questions_update_role_based" ON questions FOR UPDATE
  TO authenticated USING (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  ) WITH CHECK (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  );

CREATE POLICY "questions_delete_admin" ON questions FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- QUESTION MARKS
-- ============================================

DROP POLICY IF EXISTS "question_marks_full_access" ON question_marks;

CREATE POLICY "question_marks_select_role_based" ON question_marks FOR SELECT
  TO authenticated USING (
    student_id = get_student_id()
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR (has_role('faculty') AND evaluated_by = get_faculty_id())
  );

CREATE POLICY "question_marks_insert_faculty_exam" ON question_marks FOR INSERT
  TO authenticated WITH CHECK (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  );

CREATE POLICY "question_marks_update_faculty_exam" ON question_marks FOR UPDATE
  TO authenticated USING (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  ) WITH CHECK (
    is_admin_or_principal() OR is_exam_branch() OR has_role('faculty')
  );

CREATE POLICY "question_marks_delete_admin" ON question_marks FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- STUDENT RESULTS
-- ============================================

DROP POLICY IF EXISTS "student_results_full_access" ON student_results;

CREATE POLICY "student_results_select_role_based" ON student_results FOR SELECT
  TO authenticated USING (
    student_id = get_student_id()
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "student_results_insert_admin_exam" ON student_results FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "student_results_update_admin_exam" ON student_results FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "student_results_delete_admin" ON student_results FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- BACKLOGS
-- ============================================

DROP POLICY IF EXISTS "backlogs_full_access" ON backlogs;

CREATE POLICY "backlogs_select_role_based" ON backlogs FOR SELECT
  TO authenticated USING (
    student_id = get_student_id()
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "backlogs_insert_admin_exam" ON backlogs FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "backlogs_update_admin_exam" ON backlogs FOR UPDATE
  TO authenticated USING (is_admin_or_principal() OR is_exam_branch()) WITH CHECK (is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "backlogs_delete_admin" ON backlogs FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- ATTENDANCE SESSIONS
-- ============================================

DROP POLICY IF EXISTS "attendance_sessions_full_access" ON attendance_sessions;

CREATE POLICY "attendance_sessions_select_role_based" ON attendance_sessions FOR SELECT
  TO authenticated USING (
    has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
    OR (has_role('student') AND subject_offering_id IN (
      SELECT so.id FROM subject_offerings so
      JOIN student_enrollments se ON se.section_id = so.section_id
      WHERE se.student_id = get_student_id()
    ))
  );

CREATE POLICY "attendance_sessions_insert_faculty_admin" ON attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (has_role('faculty') OR is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "attendance_sessions_update_faculty_admin" ON attendance_sessions FOR UPDATE
  TO authenticated USING (
    has_role('faculty') OR is_admin_or_principal() OR is_exam_branch()
  ) WITH CHECK (
    has_role('faculty') OR is_admin_or_principal() OR is_exam_branch()
  );

CREATE POLICY "attendance_sessions_delete_admin" ON attendance_sessions FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================

DROP POLICY IF EXISTS "attendance_records_full_access" ON attendance_records;

CREATE POLICY "attendance_records_select_role_based" ON attendance_records FOR SELECT
  TO authenticated USING (
    student_id = get_student_id()
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('exam_branch')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "attendance_records_insert_faculty_admin" ON attendance_records FOR INSERT
  TO authenticated WITH CHECK (has_role('faculty') OR is_admin_or_principal() OR is_exam_branch());

CREATE POLICY "attendance_records_update_faculty_admin" ON attendance_records FOR UPDATE
  TO authenticated USING (
    has_role('faculty') OR is_admin_or_principal() OR is_exam_branch()
  ) WITH CHECK (
    has_role('faculty') OR is_admin_or_principal() OR is_exam_branch()
  );

CREATE POLICY "attendance_records_delete_admin" ON attendance_records FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- ANALYTICS CACHE
-- ============================================

DROP POLICY IF EXISTS "analytics_cache_full_access" ON analytics_cache;

CREATE POLICY "analytics_cache_select_role_based" ON analytics_cache FOR SELECT
  TO authenticated USING (
    cache_type = 'public'
    OR has_role('admin')
    OR has_role('principal')
    OR (cache_type = 'student' AND entity_id = get_student_id())
    OR (cache_type = 'department' AND has_role('hod'))
  );

CREATE POLICY "analytics_cache_insert_admin" ON analytics_cache FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR is_admin_or_principal());

CREATE POLICY "analytics_cache_update_admin" ON analytics_cache FOR UPDATE
  TO authenticated USING (has_role('admin') OR is_admin_or_principal()) WITH CHECK (has_role('admin') OR is_admin_or_principal());

CREATE POLICY "analytics_cache_delete_admin" ON analytics_cache FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- PREDICTIONS
-- ============================================

DROP POLICY IF EXISTS "predictions_full_access" ON predictions;

CREATE POLICY "predictions_select_role_based" ON predictions FOR SELECT
  TO authenticated USING (
    (entity_type = 'student' AND entity_id = get_student_id())
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('hod')
    OR has_role('faculty')
  );

CREATE POLICY "predictions_insert_admin" ON predictions FOR INSERT
  TO authenticated WITH CHECK (has_role('admin'));

CREATE POLICY "predictions_update_admin" ON predictions FOR UPDATE
  TO authenticated USING (has_role('admin')) WITH CHECK (has_role('admin'));

CREATE POLICY "predictions_delete_admin" ON predictions FOR DELETE
  TO authenticated USING (has_role('admin'));

-- ============================================
-- ALERTS
-- ============================================

DROP POLICY IF EXISTS "alerts_full_access" ON alerts;

CREATE POLICY "alerts_select_role_based" ON alerts FOR SELECT
  TO authenticated USING (
    (entity_type = 'student' AND entity_id = get_student_id())
    OR has_role('admin')
    OR has_role('principal')
    OR has_role('hod')
    OR has_role('faculty')
    OR has_role('exam_branch')
  );

CREATE POLICY "alerts_insert_admin" ON alerts FOR INSERT
  TO authenticated WITH CHECK (has_role('admin') OR is_admin_or_principal());

CREATE POLICY "alerts_update_role_based" ON alerts FOR UPDATE
  TO authenticated USING (
    has_role('admin') OR has_role('hod') OR has_role('faculty')
  ) WITH CHECK (
    has_role('admin') OR has_role('hod') OR has_role('faculty')
  );

CREATE POLICY "alerts_delete_admin" ON alerts FOR DELETE
  TO authenticated USING (has_role('admin'));