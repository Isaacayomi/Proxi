-- ====================================================================
-- Proxi: Seed Data for Development & Testing
-- ====================================================================

-- 1. Classrooms (OAU Campus Lecture Theatres)
INSERT INTO public.classrooms (id, name, building, room_number, latitude, longitude, default_radius_meters)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Computer Building LT 1', 'Computer Science & Engineering', 'Room 101', 7.518820, 4.527350, 60),
    ('c2222222-2222-2222-2222-222222222222', 'Civil Lecture Theatre (CLT)', 'Faculty of Technology', 'CLT Main', 7.519540, 4.528120, 75),
    ('c3333333-3333-3333-3333-333333333333', 'Oduduwa Hall Auditorium', 'Central Campus', 'Auditorium', 7.517310, 4.526210, 100),
    ('c4444444-4444-4444-4444-444444444444', 'Software Engineering Lab', 'Computer Science & Engineering', 'Lab 2', 7.518910, 4.527410, 35)
ON CONFLICT (id) DO NOTHING;

-- 2. Courses
INSERT INTO public.courses (id, code, name, department)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'CSC 401', 'Software Engineering Practice (SWEP)', 'Computer Science and Engineering'),
    ('d2222222-2222-2222-2222-222222222222', 'CSC 403', 'Database Systems & Architecture', 'Computer Science and Engineering'),
    ('d3333333-3333-3333-3333-333333333333', 'CSC 405', 'Computer Networks & Distributed Systems', 'Computer Science and Engineering')
ON CONFLICT (id) DO NOTHING;

