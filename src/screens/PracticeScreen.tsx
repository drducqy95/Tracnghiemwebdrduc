import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Question } from '../db';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Eye, EyeOff, RotateCcw, ClipboardCheck, BookOpen, AlertCircle, Star } from 'lucide-react';
import { QuestionView } from '../components/QuestionView';

type PracticeMode = 'all' | 'unlearned' | 'wrong';

export const PracticeScreen: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();

    // Mode selection state
    const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null);

    // Practice state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [selectedSubAnswers, setSelectedSubAnswers] = useState<Record<number, (boolean | null)[]>>({});
    const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
    const [showExplanation, setShowExplanation] = useState(false);

    // Load subject
    const subject = useLiveQuery(() => db.subjects.get(Number(subjectId)));

    // Load ALL questions recursively (from child subjects too)
    const allQuestions = useLiveQuery(async () => {
        if (!subjectId) return [];
        return await db.getQuestionsBySubjectRecursive(Number(subjectId));
    }, [subjectId]) || [];

    // Compute stats
    const stats = useMemo(() => {
        const total = allQuestions.length;
        const mastered = allQuestions.filter(q => q.status === 1).length;
        const wrong = allQuestions.filter(q => q.status === 2).length;
        const unlearned = total - mastered - wrong;
        return { total, mastered, wrong, unlearned };
    }, [allQuestions]);

    // Filter questions by practice mode
    const questions = useMemo(() => {
        if (!practiceMode) return [];
        switch (practiceMode) {
            case 'unlearned':
                return allQuestions.filter(q => q.status === 0 || q.status === undefined || q.status === null);
            case 'wrong':
                return allQuestions.filter(q => q.status === 2);
            default:
                return allQuestions;
        }
    }, [allQuestions, practiceMode]);

    // Reset index when mode changes
    useEffect(() => {
        setCurrentIndex(0);
        setSelectedAnswers({});
        setSelectedSubAnswers({});
        setCheckedQuestions({});
    }, [practiceMode]);

    // === Answer Logic (same as before) ===
    const getResultStatus = (q: Question): boolean | undefined => {
        if (!checkedQuestions[q.id!]) return undefined;
        if (q.questionType === 'TRUE_FALSE_TABLE') {
            const subs = selectedSubAnswers[q.id!];
            if (!subs || subs.every(v => v === null)) return undefined;
            return q.subAnswers.every((correct, idx) => subs[idx] === correct);
        }
        const userAns = selectedAnswers[q.id!];
        if (!userAns) return undefined;
        if (q.questionType === 'MULTIPLE_CHOICE') {
            const selectedLetters = userAns.split('').sort();
            const correctLetters = [...q.correctAnswers].sort();
            return selectedLetters.length === correctLetters.length &&
                selectedLetters.every((l, i) => l === correctLetters[i]);
        }
        return q.correctAnswers.includes(userAns);
    };

    const hasAnswer = (q: Question): boolean => {
        if (q.questionType === 'TRUE_FALSE_TABLE') {
            const subs = selectedSubAnswers[q.id!];
            return !!subs && subs.some(v => v !== null);
        }
        return !!selectedAnswers[q.id!];
    };

    const handleSelectAnswer = (qId: number, answer: string) => {
        if (checkedQuestions[qId]) return;
        const currentQ = questions.find(q => q.id === qId);
        if (!currentQ) return;
        if (currentQ.questionType === 'MULTIPLE_CHOICE') {
            setSelectedAnswers(prev => {
                const current = prev[qId] || '';
                if (current.includes(answer)) {
                    return { ...prev, [qId]: current.replace(answer, '') };
                } else {
                    const newVal = (current + answer).split('').sort().join('');
                    return { ...prev, [qId]: newVal };
                }
            });
        } else {
            setSelectedAnswers(prev => ({ ...prev, [qId]: answer }));
        }
    };

    const handleSubAnswer = (qId: number, idx: number, val: boolean) => {
        if (checkedQuestions[qId]) return;
        setSelectedSubAnswers(prev => {
            const current = prev[qId] ? [...prev[qId]] : Array(questions.find(q => q.id === qId)?.subQuestions.length || 0).fill(null);
            current[idx] = val;
            return { ...prev, [qId]: current };
        });
    };

    const handleCheckResult = async (qId: number) => {
        setCheckedQuestions(prev => ({ ...prev, [qId]: true }));

        // Update question status in DB
        const q = questions.find(q => q.id === qId);
        if (!q) return;
        const isCorrect = (() => {
            if (q.questionType === 'TRUE_FALSE_TABLE') {
                const subs = selectedSubAnswers[qId];
                if (!subs) return false;
                return q.subAnswers.every((correct, idx) => subs[idx] === correct);
            }
            const userAns = selectedAnswers[qId];
            if (!userAns) return false;
            if (q.questionType === 'MULTIPLE_CHOICE') {
                const sel = userAns.split('').sort();
                const cor = [...q.correctAnswers].sort();
                return sel.length === cor.length && sel.every((l, i) => l === cor[i]);
            }
            return q.correctAnswers.includes(userAns);
        })();

        // status: 1 = mastered (correct), 2 = wrong
        await db.questions.update(qId, { status: isCorrect ? 1 : 2 });
    };

    const handleResetQuestion = () => {
        if (questions[currentIndex]) {
            const qId = questions[currentIndex].id!;
            setSelectedAnswers(prev => { const n = { ...prev }; delete n[qId]; return n; });
            setSelectedSubAnswers(prev => { const n = { ...prev }; delete n[qId]; return n; });
            setCheckedQuestions(prev => { const n = { ...prev }; delete n[qId]; return n; });
        }
    };

    if (!subject) return <div className="p-8 text-center">Đang tải...</div>;

    // === STATS OVERVIEW SCREEN (before practice starts) ===
    if (!practiceMode) {
        const progressPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

        return (
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
                {/* Header */}
                <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 p-4 flex items-center gap-4 shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-base line-clamp-1">{subject.name}</h1>
                        <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Ôn tập</p>
                    </div>
                </div>

                {/* Stats Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-lg mx-auto space-y-6">
                        {/* Progress Ring */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-zinc-800 text-center">
                            <div className="relative w-32 h-32 mx-auto mb-4">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-100 dark:text-zinc-800" />
                                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none"
                                        className="text-primary"
                                        strokeDasharray={`${progressPercent * 2.64} ${264 - progressPercent * 2.64}`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-primary">{progressPercent}%</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hoàn thành</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Tổng cộng <b className="text-gray-900 dark:text-white">{stats.total}</b> câu hỏi</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                                <div className="text-2xl font-black text-emerald-600">{stats.mastered}</div>
                                <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mt-1">Đã học</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl text-center border border-blue-100 dark:border-blue-900/30">
                                <div className="text-2xl font-black text-blue-600">{stats.unlearned}</div>
                                <div className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mt-1">Chưa học</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl text-center border border-red-100 dark:border-red-900/30">
                                <div className="text-2xl font-black text-red-600">{stats.wrong}</div>
                                <div className="text-[10px] uppercase font-bold text-red-500 tracking-wider mt-1">Câu sai</div>
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider px-1">Chọn chế độ ôn tập</h3>

                            <button
                                onClick={() => setPracticeMode('all')}
                                disabled={stats.total === 0}
                                className="w-full p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all disabled:opacity-40 hover:border-primary/50"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <BookOpen size={22} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Ôn tập toàn bộ</div>
                                    <div className="text-xs text-gray-400">{stats.total} câu hỏi</div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300" />
                            </button>

                            <button
                                onClick={() => setPracticeMode('unlearned')}
                                disabled={stats.unlearned === 0}
                                className="w-full p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all disabled:opacity-40 hover:border-blue-500/50"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                    <Star size={22} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Ôn câu chưa học</div>
                                    <div className="text-xs text-gray-400">{stats.unlearned} câu hỏi</div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300" />
                            </button>

                            <button
                                onClick={() => setPracticeMode('wrong')}
                                disabled={stats.wrong === 0}
                                className="w-full p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all disabled:opacity-40 hover:border-red-500/50"
                            >
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
                                    <AlertCircle size={22} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold">Ôn câu sai</div>
                                    <div className="text-xs text-gray-400">{stats.wrong} câu hỏi</div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // === PRACTICE MODE (existing logic) ===
    if (questions.length === 0) {
        return (
            <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
                <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 p-4 flex items-center gap-4 shadow-sm">
                    <button onClick={() => setPracticeMode(null)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-sm">Không có câu hỏi nào</h1>
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center space-y-3">
                        <CheckCircle size={48} className="mx-auto opacity-30" />
                        <p className="font-bold">Không có câu hỏi trong chế độ này</p>
                        <button onClick={() => setPracticeMode(null)} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm">
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];
    const isChecked = !!checkedQuestions[currentQ.id!];
    const resultStatus = getResultStatus(currentQ);
    const answered = hasAnswer(currentQ);
    const showResult = isChecked || showExplanation;

    const modeLabel = practiceMode === 'all' ? 'Toàn bộ' : practiceMode === 'unlearned' ? 'Chưa học' : 'Câu sai';

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 p-4 flex items-center justify-between shadow-sm z-10">
                <button onClick={() => setPracticeMode(null)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-sm line-clamp-1">{subject.name}</h1>
                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">{modeLabel}</p>
                </div>
                <div className="flex gap-1">
                    <button onClick={handleResetQuestion} className="p-2 text-gray-400 hover:text-primary transition-colors" title="Làm lại">
                        <RotateCcw size={20} />
                    </button>
                    <button onClick={() => setShowExplanation(!showExplanation)} className="p-2 text-gray-400 hover:text-primary transition-colors" title="Xem đáp án">
                        {showExplanation ? <EyeOff size={24} /> : <Eye size={24} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300" key={currentQ.id}>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-gray-500">
                                Câu {currentIndex + 1}/{questions.length}
                            </div>
                            {isChecked && resultStatus !== undefined && (
                                resultStatus ?
                                    <span className="flex items-center gap-1 text-green-500 font-bold text-xs animate-in zoom-in-95"><CheckCircle size={14} /> Đúng</span> :
                                    <span className="flex items-center gap-1 text-red-500 font-bold text-xs animate-in zoom-in-95"><XCircle size={14} /> Sai</span>
                            )}
                        </div>

                        <QuestionView
                            question={currentQ}
                            selectedAnswer={selectedAnswers[currentQ.id!] || null}
                            selectedSubAnswers={selectedSubAnswers[currentQ.id!] || []}
                            showResult={showResult}
                            onAnswer={(letter) => handleSelectAnswer(currentQ.id!, letter)}
                            onSubAnswer={(idx, val) => handleSubAnswer(currentQ.id!, idx, val)}
                        />

                        {answered && !isChecked && !showExplanation && (
                            <button
                                onClick={() => handleCheckResult(currentQ.id!)}
                                className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4"
                            >
                                <ClipboardCheck size={20} />
                                Kiểm tra kết quả
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 p-4 flex items-center justify-between z-10 safe-area-bottom">
                <button
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-all hover:bg-gray-200"
                >
                    <ChevronLeft size={20} /> Trước
                </button>
                <button
                    onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === questions.length - 1}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/30 disabled:opacity-50 transition-all active:scale-95"
                >
                    Sau <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};
