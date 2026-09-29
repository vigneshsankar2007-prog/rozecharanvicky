import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'deadlineguard-ai-secret-jwt-key-2026';

app.use(express.json());

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Types & Interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  reminderOffsetHours: number; // default reminder time: 24, 12, 6, 1
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string;
  facultyName: string;
  academicWeight: number; // 1 to 5
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskType = 'Assignment' | 'Exam' | 'Project' | 'Lab' | 'Presentation' | 'Quiz' | 'Other';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TaskPriority {
  id: string;
  taskId: string;
  priorityScore: number; // 0 - 100
  priorityLevel: PriorityLevel;
  urgencyScore: number;
  difficultyScore: number;
  weightScore: number;
  effortScore: number;
  workloadScore: number;
  reasons: string[];
  calculatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description: string;
  taskType: TaskType;
  deadline: string; // ISO String
  estimatedEffortHours: number;
  difficulty: number; // 1 - 5
  academicWeight: number; // 1 - 5
  status: TaskStatus;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  priority?: TaskPriority;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMinutes: number;
  plannedMinutes: number;
  completed: boolean;
  notes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  taskId?: string;
  title: string;
  message: string;
  type: 'deadline' | 'overdue' | 'study' | 'ai' | 'system';
  read: boolean;
  scheduledFor: string;
  createdAt: string;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  taskId?: string;
  title: string;
  recommendation: string;
  rationale: string;
  priorityLevel: PriorityLevel;
  urgencySummary: string;
  createdAt: string;
}

// In-Memory Database with JSON Persistence
const DB_FILE = path.join(__dirname, '.deadlineguard_db.json');

interface DatabaseSchema {
  users: User[];
  subjects: Subject[];
  tasks: Task[];
  taskPriorities: Record<string, TaskPriority>;
  studySessions: StudySession[];
  notifications: NotificationItem[];
  aiRecommendations: AIRecommendation[];
}

let db: DatabaseSchema = {
  users: [],
  subjects: [],
  tasks: [],
  taskPriorities: {},
  studySessions: [],
  notifications: [],
  aiRecommendations: [],
};

// Load or Seed DB
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      console.log('Database loaded from persistent file.');
      return;
    }
  } catch (err) {
    console.error('Error reading DB file, seeding fresh:', err);
  }
  seedInitialData();
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// Priority Calculation Formula (Section 12 & 13)
// Priority Score = (Urgency * 0.40) + (Difficulty * 0.20) + (Academic Weight * 0.20) + (Effort * 0.10) + (Workload * 0.10)
export function calculateTaskPriority(
  task: Omit<Task, 'priority'>,
  allUserPendingTasks: Omit<Task, 'priority'>[]
): TaskPriority {
  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // 1. Urgency (40%)
  let urgency = 0;
  let urgencyReason = '';
  if (diffHours < 0) {
    urgency = 100;
    const overdueHours = Math.abs(Math.round(diffHours));
    urgencyReason = overdueHours > 24 
      ? `OVERDUE by ${Math.floor(overdueHours / 24)} day(s)! Requires immediate remediation.`
      : `OVERDUE by ${overdueHours} hour(s)! Urgent attention needed.`;
  } else if (diffHours <= 12) {
    urgency = 98;
    urgencyReason = `Due within 12 hours (${Math.round(diffHours)}h remaining). Critical urgency.`;
  } else if (diffHours <= 24) {
    urgency = 88;
    urgencyReason = `Deadline is tomorrow (in ~${Math.round(diffHours)}h). Highly pressing.`;
  } else if (diffHours <= 48) {
    urgency = 72;
    urgencyReason = `Deadline is within 2 days (${Math.round(diffHours)}h remaining).`;
  } else if (diffHours <= 72) {
    urgency = 55;
    urgencyReason = `Deadline in 3 days. Ample time if scheduled early.`;
  } else if (diffHours <= 168) {
    urgency = 35;
    urgencyReason = `Due this week (${Math.round(diffHours / 24)} days away).`;
  } else {
    urgency = 15;
    urgencyReason = `Due in more than a week (${Math.round(diffHours / 24)} days away).`;
  }

  // 2. Difficulty (20%) - normalized from 1..5 scale
  const difficulty = Math.min(5, Math.max(1, task.difficulty || 3));
  const difficultyScore = (difficulty / 5) * 100;
  const difficultyReason = difficulty >= 4 
    ? `Difficulty is rated high (${difficulty}/5), requiring deep cognitive focus.` 
    : difficulty === 3 
    ? `Moderate complexity (${difficulty}/5).` 
    : `Straightforward task difficulty (${difficulty}/5).`;

  // 3. Academic Weight (20%) - normalized from 1..5 scale
  const academicWeight = Math.min(5, Math.max(1, task.academicWeight || 3));
  const weightScore = (academicWeight / 5) * 100;
  const weightReason = academicWeight >= 4 
    ? `Academic credit weight is high (${academicWeight}/5), strongly affecting GPA.` 
    : academicWeight === 3 
    ? `Standard course credit weight (${academicWeight}/5).` 
    : `Minor credit impact (${academicWeight}/5).`;

  // 4. Estimated Effort (10%)
  const effort = Math.max(0.5, task.estimatedEffortHours || 2);
  let effortScore = 0;
  if (effort >= 8) effortScore = 100;
  else if (effort >= 5) effortScore = 85;
  else if (effort >= 3) effortScore = 65;
  else if (effort >= 2) effortScore = 45;
  else effortScore = 25;
  const effortReason = `Estimated effort is ${effort} hour(s).`;

  // 5. Workload (10%)
  // Count how many tasks are pending in the same +/- 48hr window or overall
  const pendingCount = allUserPendingTasks.filter(t => t.id !== task.id).length;
  const closePendingCount = allUserPendingTasks.filter(t => {
    if (t.id === task.id) return false;
    const tDeadline = new Date(t.deadline);
    const dDiff = Math.abs(tDeadline.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60);
    return dDiff <= 48;
  }).length;

  let workloadScore = 30;
  if (closePendingCount >= 3 || pendingCount >= 6) workloadScore = 100;
  else if (closePendingCount >= 2 || pendingCount >= 4) workloadScore = 75;
  else if (closePendingCount >= 1 || pendingCount >= 2) workloadScore = 50;

  const workloadReason = closePendingCount > 0 
    ? `High cluster workload: ${closePendingCount} other deadline(s) due around the same time.` 
    : `Manageable workload (${pendingCount} other pending task${pendingCount === 1 ? '' : 's'}).`;

  // Combined Priority Score (Formula from Section 12)
  const rawScore = 
    (urgency * 0.40) + 
    (difficultyScore * 0.20) + 
    (weightScore * 0.20) + 
    (effortScore * 0.10) + 
    (workloadScore * 0.10);

  const priorityScore = Math.round(Math.min(100, Math.max(0, rawScore)));

  // Level classification: 0–39 = Low, 40–59 = Medium, 60–79 = High, 80–100 = Critical
  let priorityLevel: PriorityLevel = 'Low';
  if (priorityScore >= 80) priorityLevel = 'Critical';
  else if (priorityScore >= 60) priorityLevel = 'High';
  else if (priorityScore >= 40) priorityLevel = 'Medium';
  else priorityLevel = 'Low';

  const reasons = [urgencyReason, difficultyReason, weightReason, effortReason, workloadReason];

  return {
    id: `prio-${task.id}`,
    taskId: task.id,
    priorityScore,
    priorityLevel,
    urgencyScore: Math.round(urgency),
    difficultyScore: Math.round(difficultyScore),
    weightScore: Math.round(weightScore),
    effortScore: Math.round(effortScore),
    workloadScore: Math.round(workloadScore),
    reasons,
    calculatedAt: new Date().toISOString(),
  };
}

// Seed controlled academic data (Section 43)
function seedInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('student123', salt);

  const defaultUser: User = {
    id: 'user-vignesh',
    name: 'Vignesh',
    email: 'vs2513@srmist.edu.in',
    passwordHash,
    reminderOffsetHours: 24,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultSubjects: Subject[] = [
    {
      id: 'subj-os',
      userId: defaultUser.id,
      name: 'Operating Systems',
      code: 'CS201',
      facultyName: 'Dr. K. Ramanathan',
      academicWeight: 5,
      color: '#4f46e5', // Indigo
      icon: 'Cpu',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'subj-co',
      userId: defaultUser.id,
      name: 'Computer Organization',
      code: 'CS202',
      facultyName: 'Prof. Ananya Sen',
      academicWeight: 4,
      color: '#0d9488', // Teal
      icon: 'Binary',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'subj-java',
      userId: defaultUser.id,
      name: 'Java Programming',
      code: 'CS203',
      facultyName: 'Dr. M. Sridhar',
      academicWeight: 4,
      color: '#ea580c', // Orange
      icon: 'Code2',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'subj-math',
      userId: defaultUser.id,
      name: 'Discrete Mathematics',
      code: 'MA201',
      facultyName: 'Dr. P. Venkatesh',
      academicWeight: 5,
      color: '#7c3aed', // Purple
      icon: 'Calculator',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'subj-sec',
      userId: defaultUser.id,
      name: 'Cyber Security',
      code: 'CS205',
      facultyName: 'Prof. R. Meenakshi',
      academicWeight: 3,
      color: '#e11d48', // Rose
      icon: 'ShieldCheck',
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Dynamic dates around now
  const now = Date.now();
  const defaultTasks: Task[] = [
    {
      id: 'task-1',
      userId: defaultUser.id,
      subjectId: 'subj-os',
      title: 'OS Process Synchronization Assignment',
      description: 'Implement Peterson’s Algorithm, Semaphores and Producer-Consumer problem in C with mutex locks.',
      taskType: 'Assignment',
      deadline: new Date(now + 18 * 3600000).toISOString(), // 18 hours from now (Critical)
      estimatedEffortHours: 4,
      difficulty: 4,
      academicWeight: 5,
      status: 'In Progress',
      notes: 'Remember to verify deadlock prevention test cases.',
      createdAt: new Date(now - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      userId: defaultUser.id,
      subjectId: 'subj-java',
      title: 'Java Inheritance & Polymorphism Lab',
      description: 'Complete Lab Sheet 4 on abstract classes, interface inheritance, and dynamic method dispatch.',
      taskType: 'Lab',
      deadline: new Date(now + 42 * 3600000).toISOString(), // 42 hours (High)
      estimatedEffortHours: 3,
      difficulty: 3,
      academicWeight: 4,
      status: 'Pending',
      notes: 'Prepare GitHub repo link before submission portal closes.',
      createdAt: new Date(now - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      userId: defaultUser.id,
      subjectId: 'subj-co',
      title: 'Computer Organization Number Conversion Assignment',
      description: 'IEEE 754 floating point conversions, 2s complement arithmetic and Booth’s multiplication algorithm.',
      taskType: 'Assignment',
      deadline: new Date(now + 76 * 3600000).toISOString(), // ~3 days
      estimatedEffortHours: 2.5,
      difficulty: 3,
      academicWeight: 4,
      status: 'Pending',
      notes: 'Show step-by-step bit shift arithmetic in hand-written report.',
      createdAt: new Date(now - 1 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-4',
      userId: defaultUser.id,
      subjectId: 'subj-math',
      title: 'Graph Theory & Relations Midterm Quiz',
      description: 'Review Euler and Hamiltonian circuits, planar graph Kuratowski theorem, and equivalence relations.',
      taskType: 'Quiz',
      deadline: new Date(now + 120 * 3600000).toISOString(), // 5 days
      estimatedEffortHours: 5,
      difficulty: 5,
      academicWeight: 5,
      status: 'Pending',
      notes: 'Practice question bank chapters 6-8.',
      createdAt: new Date(now - 4 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-5',
      userId: defaultUser.id,
      subjectId: 'subj-sec',
      title: 'Cyber Security Seminar Presentation',
      description: 'Prepare a 15-minute slide deck on Zero Trust Architecture and Ransomware attack vectors.',
      taskType: 'Presentation',
      deadline: new Date(now + 180 * 3600000).toISOString(), // 7.5 days
      estimatedEffortHours: 6,
      difficulty: 3,
      academicWeight: 3,
      status: 'Pending',
      notes: 'Include recent 2026 enterprise breach case study.',
      createdAt: new Date(now - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-6',
      userId: defaultUser.id,
      subjectId: 'subj-os',
      title: 'Linux Shell Scripting Mini Project',
      description: 'Automated disk backup and system health monitoring daemon using Bash.',
      taskType: 'Project',
      deadline: new Date(now - 24 * 3600000).toISOString(),
      estimatedEffortHours: 4,
      difficulty: 3,
      academicWeight: 4,
      status: 'Completed',
      completedAt: new Date(now - 12 * 3600000).toISOString(),
      notes: 'Completed with full automated test suite.',
      createdAt: new Date(now - 8 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Calculate Priorities
  const pendingTasks = defaultTasks.filter(t => t.status !== 'Completed');
  const taskPriorities: Record<string, TaskPriority> = {};
  defaultTasks.forEach(task => {
    const prio = calculateTaskPriority(task, pendingTasks);
    task.priority = prio;
    taskPriorities[task.id] = prio;
  });

  const defaultSessions: StudySession[] = [
    {
      id: 'sess-1',
      userId: defaultUser.id,
      taskId: 'task-1',
      durationMinutes: 50,
      plannedMinutes: 50,
      completed: true,
      notes: 'Solved Peterson algorithm lock mechanism.',
      createdAt: new Date(now - 5 * 3600000).toISOString(),
    },
    {
      id: 'sess-2',
      userId: defaultUser.id,
      taskId: 'task-2',
      durationMinutes: 25,
      plannedMinutes: 25,
      completed: true,
      notes: 'Setup Java class hierarchies.',
      createdAt: new Date(now - 28 * 3600000).toISOString(),
    },
    {
      id: 'sess-3',
      userId: defaultUser.id,
      taskId: 'task-6',
      durationMinutes: 75,
      plannedMinutes: 50,
      completed: true,
      notes: 'Finalized Bash cron testing.',
      createdAt: new Date(now - 14 * 3600000).toISOString(),
    },
  ];

  const defaultNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: defaultUser.id,
      taskId: 'task-1',
      title: 'Deadline Approaching!',
      message: 'OS Process Synchronization Assignment is due in 18 hours. Priority is Critical (Score: 88).',
      type: 'deadline',
      read: false,
      scheduledFor: new Date(now - 1 * 3600000).toISOString(),
      createdAt: new Date(now - 1 * 3600000).toISOString(),
    },
    {
      id: 'notif-2',
      userId: defaultUser.id,
      taskId: 'task-2',
      title: 'Study Session Recommended',
      message: 'Plan a 50-minute study session today for Java Inheritance Lab to stay ahead of deadline.',
      type: 'study',
      read: true,
      scheduledFor: new Date(now - 10 * 3600000).toISOString(),
      createdAt: new Date(now - 10 * 3600000).toISOString(),
    },
  ];

  const defaultRecommendations: AIRecommendation[] = [
    {
      id: 'rec-1',
      userId: defaultUser.id,
      taskId: 'task-1',
      title: 'Urgent OS Assignment Focus',
      recommendation: 'Start your study block with OS Process Synchronization right away. It has the highest priority score (88/100) and is due within 18 hours.',
      rationale: 'Urgency weight (40%) and difficulty (4/5) make this the single most pressing item before tomorrow morning.',
      priorityLevel: 'Critical',
      urgencySummary: '18 hours remaining',
      createdAt: new Date().toISOString(),
    },
  ];

  db = {
    users: [defaultUser],
    subjects: defaultSubjects,
    tasks: defaultTasks,
    taskPriorities,
    studySessions: defaultSessions,
    notifications: defaultNotifications,
    aiRecommendations: defaultRecommendations,
  };

  saveDatabase();
  console.log('Seeded DeadlineGuard AI initial data successfully.');
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    const user = db.users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Auth: Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid student email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and confirmation do not match.' });
    }

    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      reminderOffsetHours: 24,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Provide default initial subjects for convenience
    const sampleSubjects: Subject[] = [
      {
        id: `subj-${Date.now()}-1`,
        userId: newUser.id,
        name: 'Computer Networks',
        code: 'CS301',
        facultyName: 'Dr. Suresh Kumar',
        academicWeight: 4,
        color: '#4f46e5',
        icon: 'Network',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `subj-${Date.now()}-2`,
        userId: newUser.id,
        name: 'Database Management Systems',
        code: 'CS302',
        facultyName: 'Prof. Geetha V',
        academicWeight: 5,
        color: '#0d9488',
        icon: 'Database',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    db.subjects.push(...sampleSubjects);
    saveDatabase();

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal registration error: ' + err.message });
  }
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        reminderOffsetHours: user.reminderOffsetHours || 24,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

// 3. User Me
app.get('/api/users/me', authenticateToken, (req: any, res) => {
  const user = req.user as User;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    reminderOffsetHours: user.reminderOffsetHours || 24,
    createdAt: user.createdAt,
  });
});

// 4. Update Profile
app.put('/api/users/profile', authenticateToken, (req: any, res) => {
  const user = req.user as User;
  const { name, reminderOffsetHours, newPassword } = req.body;

  if (name && name.trim()) {
    user.name = name.trim();
  }
  if (reminderOffsetHours !== undefined) {
    user.reminderOffsetHours = Number(reminderOffsetHours);
  }
  if (newPassword && newPassword.length >= 6) {
    user.passwordHash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
  }
  user.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    message: 'Profile updated successfully.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      reminderOffsetHours: user.reminderOffsetHours,
      updatedAt: user.updatedAt,
    },
  });
});

// 5. Subjects API
app.get('/api/subjects', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const subjects = db.subjects.filter(s => s.userId === userId);
  res.json(subjects);
});

app.post('/api/subjects', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const { name, code, facultyName, academicWeight, color, icon } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Subject name is required.' });
  }

  const newSubject: Subject = {
    id: `subj-${Date.now()}`,
    userId,
    name: name.trim(),
    code: (code || '').trim().toUpperCase(),
    facultyName: (facultyName || '').trim(),
    academicWeight: Math.max(1, Math.min(5, Number(academicWeight) || 3)),
    color: color || '#4f46e5',
    icon: icon || 'BookOpen',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.subjects.push(newSubject);
  saveDatabase();
  res.status(201).json(newSubject);
});

app.put('/api/subjects/:id', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const subjectId = req.params.id;
  const index = db.subjects.findIndex(s => s.id === subjectId && s.userId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Subject not found.' });
  }

  const { name, code, facultyName, academicWeight, color, icon } = req.body;
  const subj = db.subjects[index];
  if (name) subj.name = name.trim();
  if (code) subj.code = code.trim().toUpperCase();
  if (facultyName !== undefined) subj.facultyName = facultyName.trim();
  if (academicWeight) subj.academicWeight = Math.max(1, Math.min(5, Number(academicWeight)));
  if (color) subj.color = color;
  if (icon) subj.icon = icon;
  subj.updatedAt = new Date().toISOString();

  saveDatabase();
  res.json(subj);
});

app.delete('/api/subjects/:id', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const subjectId = req.params.id;

  const initialLen = db.subjects.length;
  db.subjects = db.subjects.filter(s => !(s.id === subjectId && s.userId === userId));

  if (db.subjects.length === initialLen) {
    return res.status(404).json({ error: 'Subject not found.' });
  }

  // Update associated tasks to unset subject or keep reference
  saveDatabase();
  res.json({ message: 'Subject deleted successfully.' });
});

// 6. Tasks API
function recomputeUserTaskPriorities(userId: string) {
  const pendingTasks = db.tasks.filter(t => t.userId === userId && t.status !== 'Completed');
  db.tasks.forEach(task => {
    if (task.userId === userId) {
      const prio = calculateTaskPriority(task, pendingTasks);
      task.priority = prio;
      db.taskPriorities[task.id] = prio;
    }
  });
}

app.get('/api/tasks', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);

  const { status, priority, subjectId, search, sort } = req.query;

  let tasks = db.tasks.filter(t => t.userId === userId);

  if (status && status !== 'All') {
    if (status === 'Overdue') {
      const now = new Date();
      tasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < now);
    } else {
      tasks = tasks.filter(t => t.status === status);
    }
  }

  if (priority && priority !== 'All') {
    tasks = tasks.filter(t => t.priority?.priorityLevel === priority);
  }

  if (subjectId && subjectId !== 'All') {
    tasks = tasks.filter(t => t.subjectId === subjectId);
  }

  if (search) {
    const q = String(search).toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  // Sort: Priority, Deadline, Difficulty, Subject
  if (sort === 'deadline') {
    tasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  } else if (sort === 'difficulty') {
    tasks.sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
  } else {
    // Default to priority score descending
    tasks.sort((a, b) => (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0));
  }

  res.json(tasks);
});

app.get('/api/tasks/:id', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);
  const task = db.tasks.find(t => t.id === req.params.id && t.userId === userId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  res.json(task);
});

app.post('/api/tasks', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const { title, description, subjectId, taskType, deadline, estimatedEffortHours, difficulty, academicWeight, notes } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  if (!deadline) {
    return res.status(400).json({ error: 'Task deadline is required.' });
  }
  const parsedDeadline = new Date(deadline);
  if (isNaN(parsedDeadline.getTime())) {
    return res.status(400).json({ error: 'Invalid deadline date format.' });
  }

  const newTask: Task = {
    id: `task-${Date.now()}`,
    userId,
    subjectId: subjectId || (db.subjects.find(s => s.userId === userId)?.id || 'general'),
    title: title.trim(),
    description: (description || '').trim(),
    taskType: taskType || 'Assignment',
    deadline: parsedDeadline.toISOString(),
    estimatedEffortHours: Math.max(0.5, Number(estimatedEffortHours) || 2),
    difficulty: Math.max(1, Math.min(5, Number(difficulty) || 3)),
    academicWeight: Math.max(1, Math.min(5, Number(academicWeight) || 3)),
    status: 'Pending',
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.tasks.push(newTask);
  recomputeUserTaskPriorities(userId);

  // Auto-schedule deadline reminder notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    userId,
    taskId: newTask.id,
    title: 'New Deadline Guarded',
    message: `"${newTask.title}" added with ${newTask.priority?.priorityLevel} Priority (Score: ${newTask.priority?.priorityScore}).`,
    type: 'deadline',
    read: false,
    scheduledFor: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  saveDatabase();
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const task = db.tasks.find(t => t.id === req.params.id && t.userId === userId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const { title, description, subjectId, taskType, deadline, estimatedEffortHours, difficulty, academicWeight, status, notes } = req.body;
  if (title) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (subjectId) task.subjectId = subjectId;
  if (taskType) task.taskType = taskType;
  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime())) task.deadline = d.toISOString();
  }
  if (estimatedEffortHours !== undefined) task.estimatedEffortHours = Math.max(0.5, Number(estimatedEffortHours));
  if (difficulty !== undefined) task.difficulty = Math.max(1, Math.min(5, Number(difficulty)));
  if (academicWeight !== undefined) task.academicWeight = Math.max(1, Math.min(5, Number(academicWeight)));
  if (notes !== undefined) task.notes = notes.trim();
  if (status) {
    task.status = status;
    if (status === 'Completed') {
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = undefined;
    }
  }
  task.updatedAt = new Date().toISOString();

  recomputeUserTaskPriorities(userId);
  saveDatabase();
  res.json(task);
});

app.delete('/api/tasks/:id', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const initialLen = db.tasks.length;
  db.tasks = db.tasks.filter(t => !(t.id === req.params.id && t.userId === userId));

  if (db.tasks.length === initialLen) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  delete db.taskPriorities[req.params.id];
  recomputeUserTaskPriorities(userId);
  saveDatabase();
  res.json({ message: 'Task deleted successfully.' });
});

app.patch('/api/tasks/:id/complete', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const task = db.tasks.find(t => t.id === req.params.id && t.userId === userId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  task.status = 'Completed';
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();

  // Create achievement notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    userId,
    taskId: task.id,
    title: 'Deadline Secured! 🎉',
    message: `Awesome job! You completed "${task.title}". Your productivity score updated.`,
    type: 'system',
    read: false,
    scheduledFor: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  recomputeUserTaskPriorities(userId);
  saveDatabase();
  res.json(task);
});

app.patch('/api/tasks/:id/reopen', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const task = db.tasks.find(t => t.id === req.params.id && t.userId === userId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  task.status = 'Pending';
  task.completedAt = undefined;
  task.updatedAt = new Date().toISOString();

  recomputeUserTaskPriorities(userId);
  saveDatabase();
  res.json(task);
});

app.get('/api/tasks/priorities', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);
  const userTasks = db.tasks.filter(t => t.userId === userId);
  const priorities = userTasks.map(t => ({
    task: t,
    priority: t.priority,
  }));
  res.json(priorities);
});

// 7. Dashboard API (Section 8 & 34)
app.get('/api/dashboard', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = req.user as User;
  recomputeUserTaskPriorities(userId);

  const userTasks = db.tasks.filter(t => t.userId === userId);
  const now = new Date();

  // Stats
  const completedTasks = userTasks.filter(t => t.status === 'Completed');
  const pendingTasks = userTasks.filter(t => t.status !== 'Completed');

  // Overdue
  const overdueTasks = pendingTasks.filter(t => new Date(t.deadline) < now);

  // Due today
  const dueTodayTasks = pendingTasks.filter(t => {
    const d = new Date(t.deadline);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  // Critical & High
  const criticalTasks = pendingTasks.filter(t => t.priority?.priorityLevel === 'Critical');
  const highTasks = pendingTasks.filter(t => t.priority?.priorityLevel === 'High');

  // Total Study Hours
  const userSessions = db.studySessions.filter(s => s.userId === userId && s.completed);
  const totalStudyMinutes = userSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const studyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

  // Completion percentage
  const completionPercentage = userTasks.length > 0 
    ? Math.round((completedTasks.length / userTasks.length) * 100) 
    : 0;

  // Top priorities ordered by Priority Score descending (Section 34)
  const topPriorities = [...pendingTasks].sort((a, b) => {
    return (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0);
  }).slice(0, 5);

  // Subject dictionary map for quick UI display
  const userSubjects = db.subjects.filter(s => s.userId === userId);

  // AI Insight summary based on current top priority
  let aiInsight = 'You have a balanced workload today. Keep your current momentum!';
  if (overdueTasks.length > 0) {
    aiInsight = `You have ${overdueTasks.length} overdue task(s). Prioritize "${overdueTasks[0].title}" immediately to stop grade deductions.`;
  } else if (criticalTasks.length > 0) {
    const top = criticalTasks[0];
    const hoursLeft = Math.max(1, Math.round((new Date(top.deadline).getTime() - now.getTime()) / 3600000));
    aiInsight = `Critical Focus: "${top.title}" is due in ${hoursLeft}h (${top.estimatedEffortHours}h effort needed). We recommend starting a 50-min study block now.`;
  } else if (pendingTasks.length > 0) {
    aiInsight = `You have ${pendingTasks.length} pending deadlines this week. Start with "${topPriorities[0]?.title || 'your highest priority'}" for optimal study distribution.`;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    overview: {
      tasksDueToday: dueTodayTasks.length,
      tasksOverdue: overdueTasks.length,
      tasksHighPriority: highTasks.length + criticalTasks.length,
      tasksCompleted: completedTasks.length,
      tasksPending: pendingTasks.length,
      totalTasks: userTasks.length,
    },
    productivity: {
      completionPercentage,
      studyHours,
      tasksCompletedCount: completedTasks.length,
      currentStreakDays: 4, // 4-day consistent study streak
    },
    topPriorities,
    subjects: userSubjects,
    aiInsight,
  });
});

// 8. Study Planner API (Section 16)
app.get('/api/planner', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);

  const userTasks = db.tasks.filter(t => t.userId === userId && t.status !== 'Completed');
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;
  const endOfTomorrow = endOfToday + 86400000;
  const endOfWeek = startOfToday + 7 * 86400000;

  const todayTasks: Task[] = [];
  const tomorrowTasks: Task[] = [];
  const thisWeekTasks: Task[] = [];
  const laterTasks: Task[] = [];

  userTasks.forEach(task => {
    const d = new Date(task.deadline).getTime();
    if (d <= endOfToday) {
      todayTasks.push(task);
    } else if (d <= endOfTomorrow) {
      tomorrowTasks.push(task);
    } else if (d <= endOfWeek) {
      thisWeekTasks.push(task);
    } else {
      laterTasks.push(task);
    }
  });

  // Sort each bucket by Priority Score
  const sortByPrio = (a: Task, b: Task) => (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0);
  todayTasks.sort(sortByPrio);
  tomorrowTasks.sort(sortByPrio);
  thisWeekTasks.sort(sortByPrio);
  laterTasks.sort(sortByPrio);

  // Generate scheduled study time blocks
  const scheduledBlocks = [
    {
      timeRange: '08:30 - 09:30',
      title: todayTasks[0]?.title || 'Operating Systems — Process Synchronization',
      subjectName: 'Operating Systems',
      type: 'Deep Focus',
      completed: true,
      taskId: todayTasks[0]?.id || 'task-1',
    },
    {
      timeRange: '10:00 - 11:00',
      title: todayTasks[1]?.title || 'Computer Organization — Number Conversions',
      subjectName: 'Computer Organization',
      type: 'Problem Solving',
      completed: false,
      taskId: todayTasks[1]?.id || 'task-3',
    },
    {
      timeRange: '14:00 - 15:00',
      title: tomorrowTasks[0]?.title || 'Java Lab Sheet 4 Prep',
      subjectName: 'Java Programming',
      type: 'Lab Coding',
      completed: false,
      taskId: tomorrowTasks[0]?.id || 'task-2',
    },
    {
      timeRange: '17:00 - 18:00',
      title: 'Review Midterm Question Bank',
      subjectName: 'Discrete Mathematics',
      type: 'Revision Session',
      completed: false,
      taskId: 'task-4',
    },
  ];

  res.json({
    today: todayTasks,
    tomorrow: tomorrowTasks,
    thisWeek: thisWeekTasks,
    later: laterTasks,
    scheduledBlocks,
  });
});

// 9. AI Study Plan Generator (Section 17)
app.post('/api/ai/study-plan', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);
  const user = req.user as User;
  const userTasks = db.tasks.filter(t => t.userId === userId && t.status !== 'Completed');
  const userSubjects = db.subjects.filter(s => s.userId === userId);
  const { availableHours = 4, targetDate = 'Today' } = req.body;

  // Prepare context
  const taskContext = userTasks.map(t => {
    const s = userSubjects.find(sub => sub.id === t.subjectId);
    return {
      id: t.id,
      title: t.title,
      subject: s?.name || 'General',
      deadline: t.deadline,
      priorityScore: t.priority?.priorityScore || 50,
      priorityLevel: t.priority?.priorityLevel || 'Medium',
      difficulty: t.difficulty,
      effortHours: t.estimatedEffortHours,
    };
  });

  const prompt = `You are the study planner engine for DeadlineGuard AI, a student productivity app.
Student: ${user.name}
Available Study Time: ${availableHours} hours for ${targetDate}.
Current Pending Deadlines and Priority Information:
${JSON.stringify(taskContext, null, 2)}

Create an intelligent, realistic, hour-by-hour study plan tailored for the student's highest priority deadlines.
Strictly adhere to the rule: Do NOT hallucinate tasks; only schedule from the provided task list.
Return a structured JSON object with the following fields:
{
  "summary": "Brief 1-2 sentence overview of why this plan was chosen",
  "totalAllocatedMinutes": 240,
  "blocks": [
    {
      "timeRange": "09:00 - 10:00",
      "taskId": "task id from context if applicable",
      "taskTitle": "Task title",
      "subject": "Subject name",
      "focusObjective": "Concrete milestone to complete during this block",
      "breakAfterMinutes": 10
    }
  ],
  "studyTips": ["Actionable student tip 1", "Actionable student tip 2"]
}`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Study Plan error, using intelligent algorithmic schedule fallback:', err.message);

    // High quality algorithmic fallback based on exact user tasks
    const topTasks = [...userTasks].sort((a, b) => (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0));
    const blocks = [];
    let startHour = 9;
    const hoursToSchedule = Math.min(topTasks.length, Math.max(1, Number(availableHours) || 3));

    for (let i = 0; i < hoursToSchedule && i < topTasks.length; i++) {
      const t = topTasks[i];
      const s = userSubjects.find(sub => sub.id === t.subjectId);
      const startStr = `${startHour.toString().padStart(2, '0')}:00`;
      const endStr = `${(startHour + 1).toString().padStart(2, '0')}:00`;
      blocks.push({
        timeRange: `${startStr} - ${endStr}`,
        taskId: t.id,
        taskTitle: t.title,
        subject: s?.name || 'Academic Course',
        focusObjective: `Dedicated 50-minute deep block on core requirements (Priority: ${t.priority?.priorityLevel} - ${t.priority?.priorityScore}/100)`,
        breakAfterMinutes: 10,
      });
      startHour += 1;
    }

    return res.json({
      summary: `Tailored study plan allocating ${availableHours} hours across your highest priority deadlines. Focuses on "${topTasks[0]?.title || 'pending coursework'}" first.`,
      totalAllocatedMinutes: hoursToSchedule * 60,
      blocks,
      studyTips: [
        'Use the 50/10 Pomodoro cadence for high-difficulty tasks.',
        'Eliminate phone distractions during the first 25 minutes of each block.',
        'Review your lecture notes before beginning coding or mathematical proofs.',
      ],
    });
  }
});

// 10. AI Assistant Chat (Section 18)
app.post('/api/ai/chat', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);
  const user = req.user as User;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const userTasks = db.tasks.filter(t => t.userId === userId);
  const userSubjects = db.subjects.filter(s => s.userId === userId);

  const tasksSummary = userTasks.map(t => {
    const s = userSubjects.find(sub => sub.id === t.subjectId);
    return `• [${t.status.toUpperCase()}] "${t.title}" (${s?.name || 'General'}), Deadline: ${new Date(t.deadline).toLocaleString()}, Priority: ${t.priority?.priorityLevel} (${t.priority?.priorityScore}/100), Difficulty: ${t.difficulty}/5, Effort: ${t.estimatedEffortHours}h.`;
  }).join('\n');

  const systemInstruction = `You are DeadlineGuard AI, an academic productivity advisor for college students.
Tagline: "Never Miss a Deadline."
Student Name: ${user.name}
College/Email: ${user.email}

Student's Real Task Database Context:
${tasksSummary || 'No tasks currently recorded.'}

Rules:
1. Always base your advice strictly on the student's actual tasks, deadlines, and calculated priorities.
2. If asked "What should I study today?" or "Which assignment should I complete first?", recommend their highest priority incomplete task and explain why based on urgency, difficulty, effort, and weight.
3. Keep answers concise, empathetic, motivating, and action-oriented.
4. Format key recommendations with clean bullet points or bold text.
5. Do not invent tasks or claim a deadline has been changed unless the student asks how to reschedule.`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction,
      },
    });

    const aiReply = response.text || 'I analyzed your workload. Focus on your highest priority deadline right now.';

    // Save recommendation record to database
    const newRec: AIRecommendation = {
      id: `rec-${Date.now()}`,
      userId,
      title: `Advisor Response: ${message.slice(0, 30)}...`,
      recommendation: aiReply,
      rationale: 'Generated by DeadlineGuard AI based on live course priorities.',
      priorityLevel: 'High',
      urgencySummary: 'Actionable Advice',
      createdAt: new Date().toISOString(),
    };
    db.aiRecommendations.unshift(newRec);
    saveDatabase();

    res.json({
      reply: aiReply,
      savedRecommendationId: newRec.id,
    });
  } catch (err: any) {
    console.error('Gemini chat error, fallback response:', err.message);

    // Rule-based intelligent fallback
    const pending = userTasks.filter(t => t.status !== 'Completed').sort((a, b) => (b.priority?.priorityScore || 0) - (a.priority?.priorityScore || 0));
    let fallbackReply = '';

    if (pending.length === 0) {
      fallbackReply = `Great news, ${user.name}! You currently have no pending deadlines. Take this time to rest, review past material, or get ahead on upcoming projects.`;
    } else {
      const top = pending[0];
      const s = userSubjects.find(sub => sub.id === top.subjectId);
      fallbackReply = `Based on your priority matrix, you should focus on **${top.title}** (${s?.name || 'Coursework'}) first.\n\n` +
        `• **Priority Score**: ${top.priority?.priorityScore}/100 (${top.priority?.priorityLevel})\n` +
        `• **Deadline**: ${new Date(top.deadline).toLocaleString()}\n` +
        `• **Estimated Effort**: ${top.estimatedEffortHours} hours\n` +
        `• **Reason**: Urgency and academic weight make this your most time-sensitive submission. We suggest starting a 25 or 50-minute Focus Session now.`;
    }

    res.json({
      reply: fallbackReply,
    });
  }
});

// 11. AI Recommendations API (Section 19)
app.get('/api/ai/recommendations', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);
  const userTasks = db.tasks.filter(t => t.userId === userId && t.status !== 'Completed');
  const now = new Date();

  // Dynamic recommendations generated from actual workload
  const generatedRecs: AIRecommendation[] = [];

  // 1. Critical task warning
  const critical = userTasks.filter(t => t.priority?.priorityLevel === 'Critical');
  if (critical.length > 0) {
    const top = critical[0];
    const diffH = Math.round((new Date(top.deadline).getTime() - now.getTime()) / 3600000);
    generatedRecs.push({
      id: `rec-crit-${top.id}`,
      userId,
      taskId: top.id,
      title: `Critical Alert: ${top.title}`,
      recommendation: `Begin work on "${top.title}" immediately. It has a Critical priority score (${top.priority?.priorityScore}/100) and is due in ${diffH > 0 ? diffH + ' hours' : 'overdue status'}.`,
      rationale: top.priority?.reasons[0] || 'Urgent upcoming deadline requiring immediate study allocation.',
      priorityLevel: 'Critical',
      urgencySummary: diffH > 0 ? `Due in ${diffH}h` : 'Overdue',
      createdAt: new Date().toISOString(),
    });
  }

  // 2. High effort upcoming project warning
  const highEffort = userTasks.filter(t => t.estimatedEffortHours >= 4 && t.id !== critical[0]?.id);
  if (highEffort.length > 0) {
    const task = highEffort[0];
    generatedRecs.push({
      id: `rec-eff-${task.id}`,
      userId,
      taskId: task.id,
      title: `High Effort Milestone: ${task.title}`,
      recommendation: `Consider starting "${task.title}" today. The estimated effort is ${task.estimatedEffortHours} hours, so spreading it over 2-3 sessions will prevent last-minute stress.`,
      rationale: `Effort rating requires multiple focus cycles before deadline.`,
      priorityLevel: 'High',
      urgencySummary: `${task.estimatedEffortHours}h effort required`,
      createdAt: new Date().toISOString(),
    });
  }

  // 3. Overall workload trend
  if (userTasks.length >= 4) {
    generatedRecs.push({
      id: `rec-workload-${Date.now()}`,
      userId,
      title: 'High Workload Cluster Ahead',
      recommendation: `You currently have ${userTasks.length} pending academic deadlines. Block out 2 uninterrupted hours this evening in Focus Mode to maintain your streak.`,
      rationale: 'Workload threshold exceeded 3 active deadlines.',
      priorityLevel: 'Medium',
      urgencySummary: `${userTasks.length} pending tasks`,
      createdAt: new Date().toISOString(),
    });
  }

  res.json(generatedRecs);
});

// 12. Study Sessions API (Section 20)
app.get('/api/study-sessions', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const sessions = db.studySessions
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(sessions);
});

app.post('/api/study-sessions', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const { taskId, durationMinutes, plannedMinutes, completed = true, notes } = req.body;

  const newSession: StudySession = {
    id: `sess-${Date.now()}`,
    userId,
    taskId,
    durationMinutes: Number(durationMinutes) || 25,
    plannedMinutes: Number(plannedMinutes) || 25,
    completed: Boolean(completed),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  db.studySessions.unshift(newSession);

  // If completed, add notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    userId,
    taskId,
    title: 'Focus Session Completed 🎯',
    message: `You completed a ${newSession.durationMinutes}-minute focus block! Productive study time logged.`,
    type: 'study',
    read: false,
    scheduledFor: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  saveDatabase();
  res.status(201).json(newSession);
});

// 13. Notifications API (Section 22 & 23)
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const notifs = db.notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notifs);
});

app.patch('/api/notifications/:id/read', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const notif = db.notifications.find(n => n.id === req.params.id && n.userId === userId);
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  notif.read = true;
  saveDatabase();
  res.json(notif);
});

app.patch('/api/notifications/read-all', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  db.notifications.forEach(n => {
    if (n.userId === userId) n.read = true;
  });
  saveDatabase();
  res.json({ message: 'All notifications marked as read.' });
});

app.delete('/api/notifications/:id', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  db.notifications = db.notifications.filter(n => !(n.id === req.params.id && n.userId === userId));
  saveDatabase();
  res.json({ message: 'Notification deleted.' });
});

// 14. Analytics API (Section 21)
app.get('/api/analytics', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  recomputeUserTaskPriorities(userId);

  const userTasks = db.tasks.filter(t => t.userId === userId);
  const userSubjects = db.subjects.filter(s => s.userId === userId);
  const userSessions = db.studySessions.filter(s => s.userId === userId && s.completed);
  const now = new Date();

  const completed = userTasks.filter(t => t.status === 'Completed');
  const pending = userTasks.filter(t => t.status !== 'Completed');
  const overdue = pending.filter(t => new Date(t.deadline) < now);

  const totalStudyMinutes = userSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const studyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;
  const completionRate = userTasks.length > 0 ? Math.round((completed.length / userTasks.length) * 100) : 0;

  // Weekly study hours breakdown (Last 7 days: Mon -> Sun)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyStudyHours = [2.5, 3.0, 1.5, 4.0, 2.0, 3.5, studyHours > 16.5 ? studyHours - 16.5 : 2.5];
  const weeklyCompletedTasks = [1, 2, 0, 3, 1, 2, completed.length];

  // Subject-wise workload
  const subjectWorkload = userSubjects.map(sub => {
    const count = userTasks.filter(t => t.subjectId === sub.id && t.status !== 'Completed').length;
    const completedCount = userTasks.filter(t => t.subjectId === sub.id && t.status === 'Completed').length;
    return {
      subjectId: sub.id,
      name: sub.name,
      code: sub.code,
      color: sub.color,
      pendingTasks: count,
      completedTasks: completedCount,
    };
  });

  // Priority distribution
  const priorityDistribution = {
    Critical: pending.filter(t => t.priority?.priorityLevel === 'Critical').length,
    High: pending.filter(t => t.priority?.priorityLevel === 'High').length,
    Medium: pending.filter(t => t.priority?.priorityLevel === 'Medium').length,
    Low: pending.filter(t => t.priority?.priorityLevel === 'Low').length,
  };

  res.json({
    metrics: {
      tasksCompleted: completed.length,
      tasksPending: pending.length,
      tasksOverdue: overdue.length,
      studyHours,
      completionRate,
      productivityStreakDays: 4,
    },
    weeklyDays: days,
    weeklyStudyHours,
    weeklyCompletedTasks,
    subjectWorkload,
    priorityDistribution,
  });
});

// 15. Reset/Seed Data Demo Endpoint (Section 43)
app.post('/api/seed/reset', (req, res) => {
  seedInitialData();
  res.json({ message: 'Academic sample dataset refreshed successfully.' });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving Setup
// -------------------------------------------------------------
async function startServer() {
  loadDatabase();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DeadlineGuard AI server running on port ${PORT}`);
  });
}

startServer();
