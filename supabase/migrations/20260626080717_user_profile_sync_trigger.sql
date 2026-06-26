/*
# User Profile Sync Trigger

This migration creates a trigger that automatically syncs user profiles
when a new user is created in Supabase Auth.

## What it does:
1. When a new user signs up in Supabase Auth (auth.users table)
2. A trigger fires that automatically creates a corresponding profile in public.users
3. The profile is populated with data from the auth user's metadata

## Trigger function:
- `handle_new_user()` - Creates profile from auth.users metadata
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    true,
    NOW(),
    NOW()
  );
  
  -- Also create role-specific record
  INSERT INTO public.students (user_id, roll_number, current_semester, status)
  SELECT 
    NEW.id,
    'ROLL-' || to_char(NOW(), 'YYYYMM') || '-' || substr(NEW.id::text, 1, 6),
    1,
    'active'
  WHERE COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.faculty (user_id, employee_id, status)
  SELECT 
    NEW.id,
    'EMP-' || to_char(NOW(), 'YYYYMM') || '-' || substr(NEW.id::text, 1, 6),
    'active'
  WHERE COALESCE(NEW.raw_user_meta_data->>'role', 'student') IN ('faculty', 'hod')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing users to have profiles (if any auth users exist without profiles)
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'student'),
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.users p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;