import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export const initStorage = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("proxi.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      lecturer_email TEXT,
      course_code TEXT,
      course_name TEXT,
      created_at TEXT,
      ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      student_name TEXT,
      matric_number TEXT,
      timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      course_code TEXT,
      course_name TEXT,
      lecturer_email TEXT,
      status TEXT,
      timestamp TEXT
    );
  `);
  return db;
};

export const createAttendanceSession = async (session: any) => {
  const database = await initStorage();
  await database.runAsync(
    "INSERT OR REPLACE INTO attendance_sessions(id,lecturer_email,course_code,course_name,created_at,ended_at) VALUES(?,?,?,?,?,?)",
    [session.id, session.lecturerEmail, session.courseCode, session.courseName, session.createdAt, session.endedAt || null],
  );
};

export const addAttendanceRecord = async (sessionId: string, record: any) => {
  const database = await initStorage();
  await database.runAsync(
    "INSERT OR REPLACE INTO attendance_records(id,session_id,student_name,matric_number,timestamp) VALUES(?,?,?,?,?)",
    [record.id, sessionId, record.studentName, record.matricNumber, record.timestamp],
  );
};

export const getLecturerSessions = async (lecturerEmail: string) => {
  const database = await initStorage();
  const sessions = await database.getAllAsync<any>("SELECT * FROM attendance_sessions WHERE lecturer_email=?", [lecturerEmail]);
  const result = [];
  for (const s of sessions) {
    const records = await database.getAllAsync<any>("SELECT * FROM attendance_records WHERE session_id=?", [s.id]);
    result.push({
      id: s.id,
      courseCode: s.course_code,
      courseName: s.course_name,
      lecturerEmail: s.lecturer_email,
      createdAt: s.created_at,
      endedAt: s.ended_at,
      records: records.map((r: any) => ({ id: r.id, studentName: r.student_name, matricNumber: r.matric_number, timestamp: r.timestamp })),
    });
  }
  return result;
};

export const getAttendanceRecordsForSession = async (sessionId: string) => {
  const database = await initStorage();
  const records = await database.getAllAsync<any>("SELECT * FROM attendance_records WHERE session_id=?", [sessionId]);
  return records.map((r: any) => ({ id: r.id, studentName: r.student_name, matricNumber: r.matric_number, timestamp: r.timestamp }));
};

export const removeAttendanceSession = async (sessionId: string) => {
  const database = await initStorage();
  await database.runAsync("DELETE FROM attendance_sessions WHERE id=?", [sessionId]);
  await database.runAsync("DELETE FROM attendance_records WHERE session_id=?", [sessionId]);
};

export const storeStudentAttendance = async (attendance: any) => {
  const database = await initStorage();
  await database.runAsync(
    "INSERT OR REPLACE INTO student_attendance(id,course_code,course_name,lecturer_email,status,timestamp) VALUES(?,?,?,?,?,?)",
    [attendance.id, attendance.courseCode, attendance.courseName, attendance.lecturerEmail, attendance.status, attendance.timestamp],
  );
};

export const getStudentAttendance = async () => {
  const database = await initStorage();
  const rows = await database.getAllAsync<any>("SELECT * FROM student_attendance ORDER BY timestamp DESC");
  return rows.map((r: any) => ({ id: r.id, courseCode: r.course_code, courseName: r.course_name, lecturerEmail: r.lecturer_email, status: r.status, timestamp: r.timestamp }));
};

export const getAttendanceHistory = async () => getStudentAttendance();
