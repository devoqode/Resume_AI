import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database;
  private initialized = false;

  constructor(dbPath: string) {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database.');
      }
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const runAsync = promisify(this.db.run.bind(this.db));

    try {
      // Create Users table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Resumes table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS resumes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          original_text TEXT NOT NULL,
          parsed_data TEXT NOT NULL,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create Interview Sessions table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS interview_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          resume_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          started_at DATETIME,
          completed_at DATETIME,
          overall_score REAL,
          feedback TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
        )
      `);

      // Create Interview Questions table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS interview_questions (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          question_text TEXT NOT NULL,
          question_type TEXT NOT NULL,
          order_index INTEGER NOT NULL,
          is_required BOOLEAN DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES interview_sessions (id) ON DELETE CASCADE
        )
      `);

      // Create Interview Responses table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS interview_responses (
          id TEXT PRIMARY KEY,
          question_id TEXT NOT NULL,
          response_text TEXT NOT NULL,
          audio_file_path TEXT,
          response_time_ms INTEGER NOT NULL,
          score REAL,
          feedback TEXT,
          ai_evaluation TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (question_id) REFERENCES interview_questions (id) ON DELETE CASCADE
        )
      `);

      // Create Voice Profiles table
      await runAsync(`
        CREATE TABLE IF NOT EXISTS voice_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          voice_settings TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      await runAsync('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
      await runAsync('CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes (user_id)');
      await runAsync('CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions (user_id)');
      await runAsync('CREATE INDEX IF NOT EXISTS idx_interview_questions_session_id ON interview_questions (session_id)');
      await runAsync('CREATE INDEX IF NOT EXISTS idx_interview_responses_question_id ON interview_responses (question_id)');
      await runAsync('CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles (user_id)');

      this.initialized = true;
      console.log('Database initialized successfully.');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Helper methods for common database operations
  async run(sql: string, params?: any[]): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params || [], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params || [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params || [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed.');
          resolve();
        }
      });
    });
  }
}

// Singleton database instance
let dbInstance: Database | null = null;

export const getDatabase = (dbPath?: string): Database => {
  if (!dbInstance) {
    const path = dbPath || './database/interview.db';
    dbInstance = new Database(path);
  }
  return dbInstance;
};
