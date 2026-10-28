-- ====================================================================
-- ProxiCheck: Device Binding & Lecturer Verification Migration
-- Enforces:
-- 1. Single device login & attendance check-in binding per student
-- 2. Faculty staff verification status & credentials
-- ====================================================================

-- Add device binding columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS device_bound_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS staff_id TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Index on device_id for fast single-device lookup
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON public.profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id ON public.profiles(staff_id);

-- Ensure all existing lecturer accounts are verified retroactively
UPDATE public.profiles
SET is_verified = TRUE, verified_at = NOW()
WHERE role = 'lecturer' AND is_verified IS NOT TRUE;

