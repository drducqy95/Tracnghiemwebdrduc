import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Question } from './db';

// --- Settings Store ---
interface SettingsState {
    darkMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    fontFamily: string;
    primaryColor: string;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showExplanation: boolean;
    initialized: boolean;
    fontScale: number;
    backgroundUpdateTrigger: number; // Increment to reload background from DB

    toggleDarkMode: () => void;
    setFontSize: (size: 'small' | 'medium' | 'large') => void;
    setFontScale: (scale: number) => void;
    triggerBackgroundUpdate: () => void;
    setFontFamily: (family: string) => void;
    setPrimaryColor: (color: string) => void;
    setShuffleQuestions: (shuffle: boolean) => void;
    setShuffleAnswers: (shuffle: boolean) => void;
    setShowExplanation: (show: boolean) => void;
    setInitialized: (initialized: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            darkMode: false,
            fontSize: 'medium',
            fontFamily: 'Inter',
            primaryColor: '#1565C0',
            shuffleQuestions: false,
            shuffleAnswers: false,
            showExplanation: true,
            initialized: false,
            fontScale: 1.0,
            backgroundUpdateTrigger: 0,

            toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
            setFontSize: (fontSize) => set({ fontSize }),
            setFontScale: (scale) => set({ fontScale: scale }),
            triggerBackgroundUpdate: () => set((state) => ({ backgroundUpdateTrigger: state.backgroundUpdateTrigger + 1 })),
            setFontFamily: (fontFamily) => set({ fontFamily }),
            setPrimaryColor: (primaryColor) => set({ primaryColor }),
            setShuffleQuestions: (shuffleQuestions) => set({ shuffleQuestions }),
            setShuffleAnswers: (shuffleAnswers) => set({ shuffleAnswers }),
            setShowExplanation: (showExplanation) => set({ showExplanation }),
            setInitialized: (initialized) => set({ initialized }),
        }),
        {
            name: 'onthi-settings',
        }
    )
);

// --- Exam/Quiz Store ---

export interface SubjectConfig {
    subjectId: number;
    subjectName: string;
    count: number;
    time: number;
}

export interface SessionState {
    sessionId: string;
    name: string;
    configs: SubjectConfig[];
    currentIndex: number; // Config Index (Used for multi-subject tracking implicit via accumulatedResults or explicitly)
    // To minimize breaking changes, we might treat this as 'Screen Index' (Question Index) in component, 
    // but here we just store data.

    questions: Question[]; // All questions flat list
    userAnswers: Record<number, string>; // questionId -> answer
    timeLeft: number; // in seconds (Current Subject Time)
    isFinished: boolean; // Global Finish
    isPaused: boolean;

    // Multi-subject state
    accumulatedResults: {
        subjectId: number;
        subjectName: string;
        score: number;
        correctCount: number;
        totalQuestions: number;
        passed: boolean;
    }[];
}

interface ExamStore {
    currentSession: SessionState | null;
    startSession: (name: string, configs: SubjectConfig[], questions: Question[]) => void;
    updateAnswer: (questionId: number, answer: string) => void;
    decrementTime: () => void;
    finishSession: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    clearSession: () => void;
    completeSubject: (result: { subjectId: number, subjectName: string, score: number, correctCount: number, totalQuestions: number, passed: boolean }) => void;
    nextSubject: () => void; // Explicit action to setup next subject parameters
}

export const useExamStore = create<ExamStore>()(
    persist(
        (set) => ({
            currentSession: null,

            startSession: (name, configs, questions) => {
                const currentConfig = configs[0];
                set({
                    currentSession: {
                        sessionId: Date.now().toString(),
                        name,
                        configs,
                        currentIndex: 0,
                        questions,
                        userAnswers: {},
                        timeLeft: currentConfig.time * 60,
                        isFinished: false,
                        isPaused: false,
                        accumulatedResults: []
                    }
                });
            },

            updateAnswer: (questionId, answer) => set((state) => {
                if (!state.currentSession) return state;
                return {
                    currentSession: {
                        ...state.currentSession,
                        userAnswers: {
                            ...state.currentSession.userAnswers,
                            [questionId]: answer
                        }
                    }
                };
            }),

            decrementTime: () => set((state) => {
                if (!state.currentSession || state.currentSession.isFinished || state.currentSession.isPaused) return state;
                const newTime = state.currentSession.timeLeft - 1;
                return {
                    currentSession: {
                        ...state.currentSession,
                        timeLeft: newTime < 0 ? 0 : newTime
                    }
                };
            }),

            completeSubject: (result) => set((state) => {
                if (!state.currentSession) return state;
                // Add result to accumulated
                const newResults = [...state.currentSession.accumulatedResults, result];

                // Logic to setup next subject is done here or in nextSubject?
                // Let's do it here or let UI call nextSubject. 
                // UI calls completeSubject -> Shows Modal -> Calls nextSubject.

                return {
                    currentSession: {
                        ...state.currentSession,
                        accumulatedResults: newResults
                    }
                };
            }),

            nextSubject: () => set((state) => {
                if (!state.currentSession) return state;

                // Determine next subject index based on accumulatedResults
                const nextSubIndex = state.currentSession.accumulatedResults.length;

                if (nextSubIndex >= state.currentSession.configs.length) return state; // No more

                const nextConfig = state.currentSession.configs[nextSubIndex];

                return {
                    currentSession: {
                        ...state.currentSession,
                        timeLeft: nextConfig.time * 60,
                        currentIndex: 0 // Reset question index? 'currentIndex' in Store is unused by UI effectively (UI has local state), 
                        // BUT if we want persistence of "where was I", we should store it.
                        // Current UI uses local state for currentIndex.
                    }
                };
            }),

            finishSession: () => set((state) => {
                if (!state.currentSession) return state;
                return {
                    currentSession: {
                        ...state.currentSession,
                        isFinished: true,
                        isPaused: true
                    }
                };
            }),

            pauseSession: () => set((state) => {
                if (!state.currentSession) return state;
                return {
                    currentSession: { ...state.currentSession, isPaused: true }
                };
            }),

            resumeSession: () => set((state) => {
                if (!state.currentSession) return state;
                return {
                    currentSession: { ...state.currentSession, isPaused: false }
                };
            }),

            clearSession: () => set({ currentSession: null })
        }),
        {
            name: 'onthi-exam-session',
        }
    )
);
