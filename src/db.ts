import Dexie from 'dexie';
import type { Table } from 'dexie';

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TRUE_FALSE_TABLE";

export interface Subject {
    id?: number;
    name: string;
    level: string;
    type: string;
    examTerm: string;
    parentId: number | null;
    createdAt: number;
}

export interface Question {
    id?: number;
    subjectId: number;
    content: string;
    questionType: QuestionType;
    options: string[];
    optionImages: (string | null)[];
    subQuestions: string[];
    subAnswers: boolean[];
    correctAnswers: string[];
    explanation: string | null;
    image: string | null;
    explanationImage: string | null;
    status?: 0 | 1 | 2; // 0: Mới, 1: Đúng (thuộc), 2: Sai (hay sai)
    selectedAnswer?: string | null;
    selectedSubAnswers?: (boolean | null)[];
    createdAt?: number;
}

export interface SubjectConfig {
    subjectId: number;
    subjectName: string;
    count: number; // Question count
    time: number; // Minutes
}

export interface ExamConfig {
    id?: number;
    name: string;
    examTerm: string;
    level: string;
    subjects: SubjectConfig[];
}

export interface UserProfile {
    id?: number;
    fullName: string;
    gender: string;
    birthYear: number;
    educationLevel: string;
    avatar?: string; // Base64 string
}

export interface Reminder {
    id?: number;
    title: string;
    message: string;
    time: string; // HH:mm
    days: number[]; // 1=Sun, 2=Mon...
    isActive: boolean;
}

export interface SubjectResult {
    subjectId: number;
    subjectName: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    passed: boolean; // >= 70%
}

export interface ExamResult {
    id?: number;
    subjectId: number; // Keep for legacy/single, or use first subject id
    subjectName: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    timestamp: number;
    sessionId: string;
    examName: string | null;
    questionIds: number[];
    userAnswers: Record<number, string>;
    userSubAnswers: Record<number, (boolean | null)[]>;

    // New fields for Multi-Subject
    isMultiSubject?: boolean;
    subjectResults?: SubjectResult[];
    passed?: boolean; // Global Pass/Fail for Exam
}

export interface PropertyOption {
    id?: number;
    name: string;
    type: string; // "level" | "type" | "examTerm"
}

export interface AppAsset {
    id: string; // 'background'
    data: Blob | string;
}

export class AppDatabase extends Dexie {
    subjects!: Table<Subject>;
    questions!: Table<Question>;
    examConfigs!: Table<ExamConfig>;
    examResults!: Table<ExamResult>;
    propertyOptions!: Table<PropertyOption>;
    userProfile!: Table<UserProfile>;
    reminders!: Table<Reminder>;
    appAssets!: Table<AppAsset>;

    constructor() {
        super('OnThiDatabase');
        this.version(4).stores({
            subjects: '++id, name, parentId',
            questions: '++id, subjectId, questionType, status',
            examConfigs: '++id, name',
            examResults: '++id, subjectId, sessionId, timestamp',
            propertyOptions: '++id, name, type',
            userProfile: '++id',
            reminders: '++id, isActive',
            appAssets: 'id' // id is key (e.g. 'background')
        });
    }

    async getQuestionsBySubjectRecursive(subjectId: number): Promise<Question[]> {
        const allSubjects = await this.subjects.toArray();

        const findChildren = (pid: number): number[] => {
            const children = allSubjects.filter(s => s.parentId === pid).map(s => s.id!);
            return [pid, ...children.flatMap(findChildren)];
        };

        const targetIds = Array.from(new Set(findChildren(subjectId)));

        // Use Promise.all for parallel fetching or collection 'anyOf' if available
        return await this.questions.where('subjectId').anyOf(targetIds).toArray();
    }
}

export const db = new AppDatabase();
