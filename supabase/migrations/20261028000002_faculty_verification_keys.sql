-- ====================================================================
-- ProxiCheck: Dynamic Faculty Verification Keys Table
-- Allows authorized academic staff to generate, manage, and revoke
-- registration verification keys dynamically.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.faculty_verification_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    department TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
    note TEXT,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_faculty_keys_code ON public.faculty_verification_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_faculty_keys_active ON public.faculty_verification_keys(is_active);

-- Enable RLS
ALTER TABLE public.faculty_verification_keys ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (or service role) to read active keys
CREATE POLICY "Allow reading active faculty keys"
ON public.faculty_verification_keys FOR SELECT
TO authenticated, anon
USING (is_active = TRUE);

-- Allow lecturers to manage faculty keys
CREATE POLICY "Allow lecturers to insert faculty keys"
ON public.faculty_verification_keys FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'lecturer'
    )
);

CREATE POLICY "Allow lecturers to update faculty keys"
ON public.faculty_verification_keys FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'lecturer'
    )
);

CREATE POLICY "Allow lecturers to delete faculty keys"
ON public.faculty_verification_keys FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'lecturer'
    )
);

-- Seed default initial institutional key
INSERT INTO public.faculty_verification_keys (key_code, department, note, max_uses, is_active)
VALUES ('OAU-FACULTY-2026', 'Faculty of Technology', 'Default Institutional Master Key', NULL, TRUE)
ON CONFLICT (key_code) DO NOTHING;

