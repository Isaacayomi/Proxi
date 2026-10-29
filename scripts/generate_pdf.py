import subprocess
import os

class PostScriptDoc:
    def __init__(self, title, subtitle):
        self.title = title
        self.subtitle = subtitle
        self.pages = []
        self.current_page = []
        self.y = 750
        self.margin = 54
        self.width = 595
        self.height = 842
        
    def new_page(self):
        if self.current_page:
            self.pages.append(self.current_page)
        self.current_page = []
        self.y = 750

    def draw_header_footer(self, page_num, total_pages):
        ps = []
        ps.append("0.4 setgray")
        ps.append("/Helvetica-Bold 8 selectfont")
        ps.append("54 790 moveto (PROXICHECK | Technical Project Report) show")
        ps.append("/Helvetica 8 selectfont")
        ps.append("450 790 moveto (October 2026) show")
        ps.append("54 784 moveto 541 784 lineto 0.6 setlinewidth stroke")
        
        ps.append("54 45 moveto 541 45 lineto 0.6 setlinewidth stroke")
        ps.append("54 34 moveto (SWEP Project - Department of Computer Science & Engineering, OAU) show")
        page_str = f"Page {page_num} of {total_pages}"
        ps.append(f"490 34 moveto ({page_str}) show")
        return "\n".join(ps)

    def check_space(self, needed=30):
        if self.y - needed < 55:
            self.new_page()

    def add_title(self, text):
        self.check_space(70)
        self.current_page.append("0.08 0.18 0.36 setrgbcolor")
        self.current_page.append("/Helvetica-Bold 20 selectfont")
        self.current_page.append(f"54 {self.y} moveto ({self._escape(text)}) show")
        self.y -= 22
        self.current_page.append("0.25 0.35 0.45 setrgbcolor")
        self.current_page.append("/Helvetica 11 selectfont")
        self.current_page.append(f"54 {self.y} moveto ({self._escape(self.subtitle)}) show")
        self.y -= 16
        self.current_page.append("0.1 0.55 0.45 setrgbcolor")
        self.current_page.append(f"54 {self.y} moveto 541 {self.y} lineto 2 setlinewidth stroke")
        self.y -= 22

    def add_h1(self, text):
        self.check_space(45)
        self.y -= 8
        self.current_page.append("0.08 0.22 0.38 setrgbcolor")
        self.current_page.append("/Helvetica-Bold 13 selectfont")
        self.current_page.append(f"54 {self.y} moveto ({self._escape(text)}) show")
        self.y -= 5
        self.current_page.append("0.8 0.85 0.9 setrgbcolor")
        self.current_page.append(f"54 {self.y} moveto 541 {self.y} lineto 1 setlinewidth stroke")
        self.y -= 14

    def add_h2(self, text):
        self.check_space(30)
        self.y -= 4
        self.current_page.append("0.12 0.45 0.38 setrgbcolor")
        self.current_page.append("/Helvetica-Bold 10.5 selectfont")
        self.current_page.append(f"54 {self.y} moveto ({self._escape(text)}) show")
        self.y -= 14

    def add_p(self, text, indent=54):
        self.current_page.append("0.15 0.15 0.15 setrgbcolor")
        self.current_page.append("/Helvetica 9 selectfont")
        words = text.split(" ")
        line = []
        max_chars = 90 if indent == 54 else 84
        
        for w in words:
            if len(" ".join(line + [w])) > max_chars:
                self.check_space(13)
                self.current_page.append(f"{indent} {self.y} moveto ({self._escape(' '.join(line))}) show")
                self.y -= 12
                line = [w]
            else:
                line.append(w)
        if line:
            self.check_space(13)
            self.current_page.append(f"{indent} {self.y} moveto ({self._escape(' '.join(line))}) show")
            self.y -= 12
        self.y -= 3

    def add_bullet(self, title, desc=""):
        self.check_space(16)
        self.current_page.append("0.1 0.55 0.45 setrgbcolor")
        self.current_page.append(f"64 {self.y + 3} 2 0 360 arc fill")
        
        self.current_page.append("0.1 0.1 0.1 setrgbcolor")
        full_text = f"{title}: {desc}" if desc else title
        self.add_p(full_text, indent=74)

    def add_table_row(self, cols, widths, is_header=False):
        self.check_space(18)
        x = 54
        if is_header:
            self.current_page.append("0.92 0.95 0.98 setrgbcolor")
            self.current_page.append(f"54 {self.y - 3} 487 14 rectfill")
            self.current_page.append("0.08 0.2 0.35 setrgbcolor")
            self.current_page.append("/Helvetica-Bold 8.5 selectfont")
        else:
            self.current_page.append("0.2 0.2 0.2 setrgbcolor")
            self.current_page.append("/Helvetica 8 selectfont")

        for idx, col in enumerate(cols):
            w = widths[idx]
            self.current_page.append(f"{x + 4} {self.y} moveto ({self._escape(str(col)[:48])}) show")
            x += w
            
        self.current_page.append("0.85 0.85 0.85 setrgbcolor")
        self.current_page.append(f"54 {self.y - 3} moveto 541 {self.y - 3} lineto 0.5 setlinewidth stroke")
        self.y -= 15

    def _escape(self, text):
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    def compile(self, ps_path, pdf_path):
        if self.current_page:
            self.pages.append(self.current_page)
            
        total_pages = len(self.pages)
        ps_out = [
            "%!PS-Adobe-3.0",
            f"%%Pages: {total_pages}",
            "%%BoundingBox: 0 0 595 842",
            "/rectfill {",
            "  4 2 roll moveto 1 index 0 rlineto 0 exch rlineto neg 0 rlineto closepath fill",
            "} bind def"
        ]
        
        for idx, page in enumerate(self.pages):
            page_num = idx + 1
            ps_out.append(f"%%Page: {page_num} {page_num}")
            ps_out.append("save")
            ps_out.append(self.draw_header_footer(page_num, total_pages))
            ps_out.extend(page)
            ps_out.append("showpage")
            ps_out.append("restore")
            
        ps_content = "\n".join(ps_out)
        with open(ps_path, "w", encoding="latin1") as f:
            f.write(ps_content)
            
        subprocess.run(["ps2pdf", ps_path, pdf_path], check=True)
        print(f"Generated {pdf_path} ({total_pages} pages)")

def build_pdf():
    doc = PostScriptDoc(
        "ProxiCheck: Intelligent University Attendance System",
        "Technical Architecture, Engineering Methodology & Project Report"
    )
    doc.new_page()
    doc.add_title("ProxiCheck: Intelligent University Attendance System")
    
    # 1. Overview
    doc.add_h1("1. Project Overview & Problem Statement")
    doc.add_h2("1.1 System Definition")
    doc.add_p("ProxiCheck is a hardware-free, browser-native university attendance management platform engineered for academic institutions. It enables faculty members to initiate cryptographically verified roll-call geofences centered around physical classrooms and allows enrolled students to record verified attendance within seconds using standard web browsers on their existing mobile phones, tablets, or laptops.")
    
    doc.add_h2("1.2 The Problem It Solves")
    doc.add_p("Traditional university attendance tracking suffers from severe structural vulnerabilities:")
    doc.add_bullet("Paper Sign-in Sheets", "Prone to proxy sign-ins, illegible handwriting, misplaced rosters, and wasted lecture time passing sheets across large auditoriums.")
    doc.add_bullet("Dedicated Biometric Hardware", "Fingerprint and facial terminals are cost-prohibitive to deploy across all lecture halls, suffer mechanical breakdown, and cause bottleneck lines at entrances.")
    doc.add_bullet("Static QR Code Systems", "Flawed because students in class take screenshots of projected QR codes and forward them to group chats for absent classmates to scan from hostels.")
    doc.add_bullet("Native Mobile Apps & Beacons", "Compelling students to download 80MB+ native app store packages causes storage and compatibility barriers, while Bluetooth beacon signals unpredictably leak through concrete walls.")
    doc.add_p("ProxiCheck resolves these challenges by removing physical hardware dongles and app store barriers entirely, enforcing physical presence through browser geolocation, server-side geospatial verification, single-device fingerprint binding, and institutional domain validation.")

    # 2. Attendance Process
    doc.add_h1("2. Attendance Process & Verification Mechanics")
    doc.add_h2("2.1 Step-by-Step Attendance Workflow")
    doc.add_bullet("Session Launch", "The lecturer logs into the Faculty Command Center, selects an assigned departmental course, picks a registered hall (e.g., Step B), sets an allowed radius (10m to 500m), and configures duration.")
    doc.add_bullet("GPS Anchoring", "The session defaults to the calibrated coordinates of the hall, or dynamically anchors to the lecturer's live device coordinates if the class relocated.")
    doc.add_bullet("Session Discovery", "Students authenticated with valid university credentials see the active roll call on their dashboard if officially enrolled in that course.")
    doc.add_bullet("Presence Submission", "The student taps 'Check In'. The browser queries the device satellite hardware for high-accuracy latitude, longitude, and horizontal accuracy.")
    doc.add_bullet("Multi-Layer Verification", "The server validates device integrity, filters coarse signals, computes distance to the hall center, and executes an atomic database transaction.")
    doc.add_bullet("Live Confirmation", "The student receives immediate verified feedback, and the lecturer's monitor updates in real time with attendee details and matric numbers.")

    doc.add_h2("2.2 Verification Logic (No Raw Formulas)")
    doc.add_p("The server validates attendance through four strict sequential criteria:")
    doc.add_bullet("Single-Device Integrity", "The student's account must match the physical device hardware fingerprint registered upon signup, preventing buddy check-ins.")
    doc.add_bullet("Sensor Accuracy Filter", "The device's reported GPS horizontal accuracy radius must be within acceptable thresholds (under 50 meters), filtering out coarse cell-tower and Wi-Fi triangulations.")
    doc.add_bullet("Geodesic Distance Verification", "The server computes the true shortest surface distance between the student's coordinates and the lecture hall center using the Great-Circle navigation algorithm. The student must physically be within the lecturer's configured perimeter.")
    doc.add_bullet("Atomic Concurrency Lock", "A composite unique constraint on session ID and student ID guarantees that subsequent check-in attempts are rejected, ensuring zero duplicate submissions.")

    # 3. Technologies Used
    doc.add_h1("3. Technologies Used")
    widths = [110, 80, 297]
    doc.add_table_row(["Layer", "Technology", "Role & Engineering Responsibility"], widths, is_header=True)
    doc.add_table_row(["Frontend Framework", "Next.js 15.2 (App Router)", "Server/Client Components, dynamic routes, and API handlers"], widths)
    doc.add_table_row(["UI & Interactivity", "React 19 & Tailwind CSS", "Reactive live state, mobile-first responsive design, Sora font"], widths)
    doc.add_table_row(["Programming Language", "TypeScript 5.8 (Strict)", "End-to-end type safety across API contracts and database models"], widths)
    doc.add_table_row(["Database & Auth", "Supabase (PostgreSQL 15)", "Relational data, Row-Level Security policies, and GoTrue auth"], widths)
    doc.add_table_row(["Fallback Store", "In-Memory Store (ES6 Maps)", "Zero-dependency offline/demo operational database store"], widths)
    doc.add_table_row(["Testing Engine", "Vitest 3 & Testing Library", "Unit testing for geo-algorithms, role validation, and components"], widths)

    # 4. Implemented Features
    doc.add_h1("4. Implemented Features & In-Progress Additions")
    doc.add_h2("4.1 Core Implemented Features")
    doc.add_bullet("Browser-Native Geofencing", "Zero app store downloads; students check in directly via browser geolocation.")
    doc.add_bullet("Single-Device Hardware Binding", "Links each student account to one device fingerprint, stopping proxy logins.")
    doc.add_bullet("Faculty Key Verification", "Pre-provisioned departmental authorization keys prevent student spoofing of lecturer roles.")
    doc.add_bullet("Institutional Email Enforcement", "Strict validation requiring students to use OAU student emails and staff to use faculty emails.")
    doc.add_bullet("Venue & Course Management", "Full administrative management for lecture theatres and departmental allocations.")
    doc.add_bullet("Live Attendance Radar & Export", "Real-time polling monitor and one-click formatted CSV sheet export for academic portals.")
    doc.add_bullet("Individual Course Enrollment", "Students can only access roll calls for courses they are officially registered for.")

    doc.add_h2("4.2 Exam Eligibility & At-Risk Predictor Feature")
    doc.add_p("To support academic regulations requiring students to attain at least 75% lecture attendance to qualify for semester examinations, ProxiCheck includes an attendance forecasting engine:")
    doc.add_bullet("Dynamic Attendance Projection", "Calculates the student's maximum attainable attendance percentage by summing attended classes with all remaining scheduled classes, divided by total syllabus lectures.")
    doc.add_bullet("Automated Risk Badging", "Flags students as Safe (at or above 75%), At-Risk (60% to 74% with target attendance alerts), or Barred (under 60% or mathematically unable to reach 75%).")
    doc.add_bullet("Official Examination Docket", "Provides lecturers and examination officers with a one-click generated summary of barred students for faculty board review.")

    # 5. Architecture & Diagrams
    doc.add_h1("5. System Architecture, Workflows & Database Design")
    doc.add_h2("5.1 Architectural Tiering")
    doc.add_p("ProxiCheck is built on a 3-tier cloud architecture:")
    doc.add_bullet("Presentation Tier", "Client web application rendered via Next.js 15, handling location capture and user interaction.")
    doc.add_bullet("Application Tier", "Next.js Edge and Serverless route handlers executing authentication guards, geospatial validation, and business logic.")
    doc.add_bullet("Data Tier", "Supabase PostgreSQL 15 database enforcing Row-Level Security, unique attendance constraints, and relational integrity.")

    doc.add_h2("5.2 Relational Database Schema Entities")
    doc.add_bullet("profiles", "User identity containing ID, email, full name, role (student/lecturer/admin), matric number, and bound device ID.")
    doc.add_bullet("classrooms", "Physical campus venues storing venue name, building, latitude, longitude, and default radius.")
    doc.add_bullet("courses", "Academic subjects storing course code, name, and departmental affiliation.")
    doc.add_bullet("course_enrollments", "Relational mapping connecting students to officially enrolled courses.")
    doc.add_bullet("attendance_sessions", "Lecture sessions tracking course ID, lecturer ID, venue, coordinates, radius, and active status.")
    doc.add_bullet("attendance_records", "Verified check-ins recording session ID, student ID, matric number, distance, and timestamps.")

    # 6. Development Process & Challenges
    doc.add_h1("6. Development Process & Major Challenges Encountered")
    doc.add_h2("6.1 Engineering Heritage & Pivot")
    doc.add_p("The project originated as an ESP32 microcontroller Bluetooth Low Energy (BLE) beacon prototype paired with an Expo React Native mobile app. During initial field testing, the hardware approach exhibited critical flaws: BLE signal strengths fluctuated through concrete walls causing false corridor check-ins, and distributing native mobile apps caused installation friction. The team pivoted to a browser-based geospatial architecture, eliminating hardware dependencies while hardening web security.")

    doc.add_h2("6.2 Key Challenges & Technical Solutions")
    doc.add_bullet("Indoor GPS Multipath Distortion", "Concrete auditoriums can degrade satellite accuracy. Solved by implementing an adaptive sensor accuracy filter and a Live Location Override enabling lecturers to anchor the geofence from their active podium position.")
    doc.add_bullet("Buddy Check-in Prevention", "Students sharing login credentials with friends in class. Solved by binding user accounts to a unique browser hardware device fingerprint upon registration.")
    doc.add_bullet("Database Schema Desynchronization", "Cloud migrations missing columns during initial account creation. Solved by implementing resilient fallback upsert patterns that guarantee profile persistence before session initialization.")

    # 7. Testing & Results
    doc.add_h1("7. Testing Performed, Actual Results & System Limitations")
    doc.add_h2("7.1 Automated Testing Suite (Vitest 3)")
    doc.add_p("The platform is verified with 50 automated tests across 5 test suites:")
    doc.add_bullet("Geospatial Distance Suite (9 tests)", "Validated against campus coordinate benchmarks. Verified boundary conditions including zero offset, inside perimeter, boundary edges, and outside limits.")
    doc.add_bullet("Attendance Engine Suite (7 tests)", "Verified atomic check-ins, active session time windows, accuracy rejection for coarse signals, and duplicate attempt prevention.")
    doc.add_bullet("Role & Email Governance (16 tests)", "Verified strict OAU student matriculation structure and staff email formatting.")
    doc.add_bullet("Route Protection Middleware (10 tests)", "Tested role-based redirection, cookie session extraction, and unauthorized route guards.")
    doc.add_bullet("UI Components Suite (8 tests)", "Verified rendering states, loading spinners, and interactive dialogs.")

    doc.add_h2("7.2 Actual Test Outcomes & Known Limitations")
    doc.add_p("All 50 automated tests pass with 100% success rate. Identified system limitations include:")
    doc.add_bullet("Browser Permissions", "Location permission is required by the browser; users who deny permission cannot record presence.")
    doc.add_bullet("Basement Laboratories", "Underground halls without satellite line-of-sight require lecturers to expand radius presets.")

    # 8. Documentation & References
    doc.add_h1("8. Documentation, Source Repository & Project Heritage")
    doc.add_p("Project heritage and documentation resources maintained in the repository include:")
    doc.add_bullet("Project Inspiration", "Derived architectural paradigms from open-source mobile BLE attendance prototypes, replacing the fragile radio layer with web geospatial technology.")
    doc.add_bullet("README Documentation", "Comprehensive user guide and operational runbook located at README.md.")
    doc.add_bullet("Deployment Manual", "Step-by-step production setup and environment variable configuration located at docs/DEPLOYMENT.md.")
    doc.add_bullet("Database Migrations", "Versioned SQL migration scripts defining tables, triggers, and security policies located at supabase/migrations/.")

    # Compile
    ps_file = "/tmp/proxicheck_report.ps"
    pdf_file = "/home/prime/Documents/projects/swep-project/docs/PROXICHECK_TECHNICAL_REPORT.pdf"
    os.makedirs(os.path.dirname(pdf_file), exist_ok=True)
    doc.compile(ps_file, pdf_file)

build_pdf()
