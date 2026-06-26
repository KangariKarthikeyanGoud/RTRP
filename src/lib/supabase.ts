import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const GradePoints: Record<string, number> = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0, 'AB': 0
};

export const BloomsLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

export const DifficultyLevels = ['easy', 'medium', 'hard', 'very_hard'];

export const QuestionTypes = ['MCQ', 'Short Answer', 'Long Answer', 'Numerical', 'Essay', 'True/False'];

export const UserRoles = ['student', 'faculty', 'hod', 'exam_branch', 'principal', 'admin'] as const;

export type UserRole = typeof UserRoles[number];

export function calculateGrade(percentage: number): { grade: string; gradePoints: number } {
  if (percentage >= 90) return { grade: 'O', gradePoints: 10 };
  if (percentage >= 80) return { grade: 'A+', gradePoints: 9 };
  if (percentage >= 70) return { grade: 'A', gradePoints: 8 };
  if (percentage >= 60) return { grade: 'B+', gradePoints: 7 };
  if (percentage >= 50) return { grade: 'B', gradePoints: 6 };
  if (percentage >= 45) return { grade: 'C', gradePoints: 5 };
  if (percentage >= 40) return { grade: 'P', gradePoints: 4 };
  return { grade: 'F', gradePoints: 0 };
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
