import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { QuestionView } from '../components/QuestionView';
import { ChevronLeft, ChevronRight, Timer, AlertTriangle, List, CheckCircle } from 'lucide-react';
import { useExamStore, useSettingsStore } from '../store';
import { clsx } from 'clsx';


export const ExamScreen: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const { shuffleQuestions } = useSettingsStore();
    const {
        currentSession,
        startSession,
        updateAnswer,
        decrementTime,
        finishSession,
        completeSubject,
        clearSession
    } = useExamStore();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showGrid, setShowGrid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showNextSubjectModal, setShowNextSubjectModal] = useState(false);
    const [lastSubjectResult, setLastSubjectResult] = useState<any>(null);

    // Initialization Logic for Legacy/Direct Link
    useEffect(() => {
        const initLegacySession = async () => {
            if (!currentSession && subjectId) {
                setIsLoading(true);
                const id = Number(subjectId);
                const subject = await db.subjects.get(id);
                if (!subject) {
                    alert('Môn học không tồn tại');
                    navigate('/exam');
                    return;
                }

                const qs = await db.getQuestionsBySubjectRecursive(id);
                let finalQs = qs;
                if (shuffleQuestions) {
                    finalQs = qs.sort(() => Math.random() - 0.5);
                }
                finalQs = finalQs.slice(0, 40);

                startSession(
                    `Thi thử: ${subject.name}`,
                    [{ subjectId: id, subjectName: subject.name, count: finalQs.length, time: 40 }],
                    finalQs
                );
                setIsLoading(false);
            } else if (!currentSession && !subjectId) {
                navigate('/exam');
            }
        };

        initLegacySession();
    }, [subjectId, currentSession, navigate, startSession, shuffleQuestions]);

    // Timer Logic
    useEffect(() => {
        if (!currentSession || currentSession.isFinished || currentSession.isPaused || showNextSubjectModal) return;

        const timer = setInterval(() => {
            decrementTime();
        }, 1000);

        return () => clearInterval(timer);
    }, [currentSession, decrementTime, showNextSubjectModal]);

    // Auto-Submit on Timeout
    useEffect(() => {
        if (currentSession && currentSession.timeLeft === 0 && !currentSession.isFinished && !showNextSubjectModal) {
            handleSubmit(true);
        }
    }, [currentSession?.timeLeft]);

    // Identify Active Subject and Questions
    const activeSubjectIndex = currentSession?.accumulatedResults?.length || 0;
    const activeConfig = currentSession?.configs[activeSubjectIndex];

    // Slice questions for active subject
    // We assume questions are pushed sequentially: [Subject1Questions, Subject2Questions...]
    // We need to calculate start index.
    const getActiveQuestions = () => {
        if (!currentSession || !activeConfig) return [];
        let start = 0;
        for (let i = 0; i < activeSubjectIndex; i++) {
            start += currentSession.configs[i].count;
        }
        return currentSession.questions.slice(start, start + activeConfig.count);
    };

    const activeQuestions = getActiveQuestions();
    const currentQuestion = activeQuestions[currentIndex];

    if (isLoading || !currentSession || !activeConfig || !currentQuestion) {
        return <div className="p-8 text-center">Đang tải câu hỏi...</div>;
    }

    const { userAnswers, timeLeft } = currentSession;

    // Handle Answer
    const handleAnswer = (letter: string) => {
        if (currentSession.isFinished || showNextSubjectModal) return;
        updateAnswer(currentQuestion.id!, letter);
    };

    const handleSubAnswer = (idx: number, val: boolean) => {
        if (currentSession.isFinished || showNextSubjectModal) return;
        let currentSub: boolean[] = [];
        try {
            currentSub = JSON.parse(userAnswers[currentQuestion.id!] || '[]');
        } catch { }

        if (!currentSub.length) currentSub = Array(currentQuestion.subQuestions?.length || 0).fill(null);

        currentSub[idx] = val;
        updateAnswer(currentQuestion.id!, JSON.stringify(currentSub));
    };

    const handleSubmit = async (auto = false) => {
        if (!auto && !window.confirm('Bạn có chắc chắn muốn nộp bài môn này?')) return;

        // Calculate score for THIS subject
        let correctCount = 0;
        let totalItems = 0;

        activeQuestions.forEach(q => {
            if (q.questionType === 'TRUE_FALSE_TABLE') {
                let userSub: boolean[] = [];
                try { userSub = JSON.parse(userAnswers[q.id!] || '[]'); } catch { }
                q.subAnswers.forEach((correct, idx) => {
                    totalItems++;
                    if (userSub[idx] === correct) correctCount++;
                });
            } else {
                totalItems++;
                const userA = userAnswers[q.id!] || '';
                // Single Choice: exact match
                if (q.correctAnswers.includes(userA)) correctCount++;
            }
        });

        const score = totalItems > 0 ? (correctCount / totalItems) * 10 : 0;
        // Pass/Fail for Subject (optional check, but global pass depends on >=70% CORRECT COUNT usually, or Score?)
        // Requirement: "ít nhất 1 môn có số lượng câu đúng dưới 70% là rớt".
        // So passed = (correctCount / totalItems) >= 0.7
        const passed = totalItems > 0 ? (correctCount / totalItems) >= 0.7 : false;

        const result = {
            subjectId: activeConfig.subjectId,
            subjectName: activeConfig.subjectName,
            score,
            correctCount,
            totalQuestions: totalItems,
            passed
        };

        completeSubject(result);

        // Check if next?
        if (activeSubjectIndex < currentSession.configs.length - 1) {
            // Next subject exists
            setLastSubjectResult(result);
            setShowNextSubjectModal(true);
            setCurrentIndex(0); // Reset UI index
        } else {
            // Finished All
            finishAll([...(currentSession.accumulatedResults || []), result]);
        }
    };

    const finishAll = async (allResults: any[]) => {
        finishSession();

        // Calculate Global Pass/Fail
        // "Không Đạt nếu có ít nhất 1 môn < 70%" -> All must be passed
        const globalPassed = allResults.every(r => r.passed);

        // Avg Score?
        const totalScore = allResults.reduce((acc, r) => acc + r.score, 0);
        const avgScore = totalScore / allResults.length;

        // Use FIRST subject info (or composite) for legacy fields?
        // We'll mark isMultiSubject=true

        const resultId = await db.examResults.add({
            subjectId: currentSession.configs[0].subjectId,
            subjectName: currentSession.name, // "Kỳ thi tốt nghiệp..."
            score: avgScore,
            correctCount: allResults.reduce((acc, r) => acc + r.correctCount, 0),
            totalQuestions: allResults.reduce((acc, r) => acc + r.totalQuestions, 0),
            timestamp: Date.now(),
            sessionId: currentSession.sessionId,
            examName: currentSession.name,
            questionIds: currentSession.questions.map(q => q.id!),
            userAnswers: userAnswers,
            userSubAnswers: {},
            isMultiSubject: true,
            subjectResults: allResults,
            passed: globalPassed
        });

        clearSession();
        navigate(`/review/${resultId}`, { replace: true });
    };

    const startNextSubject = () => {
        setShowNextSubjectModal(false);
        // currentIndex is already 0, inputs active
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Modal for Next Subject
    if (showNextSubjectModal) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Hoàn thành môn thi!</h3>
                    <p className="text-xl font-black text-primary mb-4">{activeConfig.subjectName}</p>

                    <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Điểm số</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{lastSubjectResult?.score.toFixed(1)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">Số câu đúng</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{lastSubjectResult?.correctCount}/{lastSubjectResult?.totalQuestions}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={startNextSubject}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 active:scale-95 transition-all"
                    >
                        Thi môn tiếp theo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 p-3 flex items-center justify-between shadow-sm z-20">
                <button onClick={() => setShowExitConfirm(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl">
                    <ChevronLeft size={24} />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded">
                        {activeConfig.subjectName} ({activeSubjectIndex + 1}/{currentSession.configs.length})
                    </span>
                    <div className={clsx("flex items-center gap-2 font-mono font-bold text-lg", timeLeft < 300 ? "text-red-500 animate-pulse" : "text-gray-900 dark:text-gray-100")}>
                        <Timer size={18} />
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-2 rounded-xl transition-colors ${showGrid ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400'}`}
                    >
                        <List size={24} />
                    </button>
                    <button
                        onClick={() => handleSubmit()}
                        className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        NỘP BÀI
                    </button>
                </div>
            </div>

            {/* Grid Overlay */}
            {showGrid && (
                <div className="absolute top-[72px] inset-x-0 bottom-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10 p-4 animate-in fade-in slide-in-from-top-4 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-3">
                        {activeQuestions.map((q, idx) => {
                            const isAnswered = !!userAnswers[q.id!];
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => { setCurrentIndex(idx); setShowGrid(false); }}
                                    className={clsx(
                                        "p-3 rounded-xl border-2 font-bold text-sm transition-all",
                                        idx === currentIndex ? "border-primary text-primary bg-primary/10" :
                                            isAnswered ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-900/20" :
                                                "border-gray-100 bg-white text-gray-400 dark:border-zinc-800 dark:bg-zinc-900"
                                    )}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="max-w-2xl mx-auto" key={currentQuestion.id}>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        <span>Câu {currentIndex + 1} / {activeConfig.count}</span>
                    </div>

                    <QuestionView
                        question={currentQuestion}
                        selectedAnswer={userAnswers[currentQuestion.id!] || null}
                        selectedSubAnswers={(() => {
                            try { return JSON.parse(userAnswers[currentQuestion.id!] || '[]'); } catch { return []; }
                        })()}
                        showResult={false}
                        onAnswer={handleAnswer}
                        onSubAnswer={handleSubAnswer}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 p-4 flex gap-4 z-10 safe-area-bottom">
                <button
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="flex-1 p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl font-bold text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={20} /> Trước
                </button>
                <button
                    onClick={() => setCurrentIndex(Math.min(activeQuestions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === activeQuestions.length - 1}
                    className="flex-1 p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 font-bold disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    Sau <ChevronRight size={20} />
                </button>
            </div>

            {/* Exit Confirm */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold">Thoát bài thi?</h3>
                            <p className="text-gray-500">Kết quả bài làm sẽ bị hủy bỏ.</p>
                            <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                <button onClick={() => setShowExitConfirm(false)} className="p-3 bg-gray-100 rounded-xl font-bold text-gray-700">Ở lại</button>
                                <button onClick={() => { clearSession(); navigate('/exam'); }} className="p-3 bg-red-500 text-white rounded-xl font-bold">Thoát</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
