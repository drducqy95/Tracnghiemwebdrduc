import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Question } from '../db';
import { ChevronLeft, ArrowLeft, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { QuestionView } from '../components/QuestionView';

export const ReviewExamScreen: React.FC = () => {
    const { resultId } = useParams<{ resultId: string }>();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Fetch the exam result
    const result = useLiveQuery(() =>
        resultId ? db.examResults.get(Number(resultId)) : undefined
        , [resultId]);

    // Fetch questions associated with this exam session
    // Note: In a real app, we might need to store the exact questions snapshot in ExamResult
    // For now, we'll try to reconstruct or use a stored list if available.
    // Since our current DB schema doesn't store the list of question IDs in ExamResult, 
    // we might need to rely on the fact that we can't easily reconstruction EXACTLY the same random set 
    // UNLESS we modify the ExamResult to store question IDs.

    // WAIT: The valid verification plan implies we should be able to review.
    // Let's check `db.ts`. 
    // `ExamResult` has `subjectId`, `sessionId`. We don't have a `questions` list in `ExamResult`.
    // However, when we implemented `QuizScreen` in the previous turn, we didn't save the questions list to `ExamResult`.
    // We should probably update `db.ts` to store `questionIds` in `ExamResult` to accurately review the EXACT exam.
    // BUT, for now, let's assume we might need to just fetch all questions for the subject OR
    // checking if we can query by session. 
    // Actually, `QuizScreen` logic I wrote earlier:
    // await db.examResults.add({ ... });
    // It didn't save the question IDs. This is a gap.

    // To fix this without changing DB schema too drastically (which might break existing data if not careful),
    // I will add `questionIds: number[]` AND `userAnswers: Record<number, string>` to `ExamResult` in `db.ts` first.
    // But since I cannot easily change the DB schema in a running app without version bump and migration (Dexie handles this but need to be careful),
    // I will check `db.ts` version first. It is version 1.

    // Let's implement this screen assuming `result` will eventually have the data, or we fetch standard questions.
    // Actually, looking at the previous Android code `ReviewExamScreen.kt`, it loads questions.
    // To match strict PWA requirements, let's update `db.ts` now to include `questionIds` and `userAnswers` map in `ExamResult`.

    // For this step, I'll write the component expecting these fields.

    // Mocking for now until DB update:
    // const questionIds = result?.questionIds || [];
    // const userAnswers = result?.userAnswers || {};

    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        const loadQuestions = async () => {
            if (!result) return;

            // Use stored question IDs if available (New Schema)
            if (result.questionIds && result.questionIds.length > 0) {
                const qs = await db.questions.bulkGet(result.questionIds);
                // Preserve order of IDs
                const qMap = new Map(qs.map(q => [q?.id, q]));
                const orderedQs = result.questionIds.map(id => qMap.get(id)).filter(q => !!q) as Question[];
                setQuestions(orderedQs);
            }
            // Fallback for old results (Subject only)
            else {
                const qs = await db.questions.where('subjectId').equals(result.subjectId).toArray();
                // Slice to match count if possible, but without IDs it's inaccurate.
                setQuestions(qs.slice(0, result.totalQuestions));
            }
        };
        loadQuestions();
    }, [result]);

    const filteredQuestions = questions.filter(q => {
        const userAns = result?.userAnswers?.[q.id!] || null;
        const isAnswered = userAns !== null && userAns !== undefined && userAns !== '';

        let isCorrect = false;
        if (isAnswered) {
            if (q.questionType === 'TRUE_FALSE_TABLE') {
                try {
                    const userSub: boolean[] = JSON.parse(userAns || '[]');
                    isCorrect = q.subAnswers.every((correct, idx) => userSub[idx] === correct);
                } catch { isCorrect = false; }
            } else if (q.questionType === 'MULTIPLE_CHOICE') {
                const selectedLetters = (userAns || '').split('').sort();
                const correctLetters = [...q.correctAnswers].sort();
                isCorrect = selectedLetters.length === correctLetters.length &&
                    selectedLetters.every((l, i) => l === correctLetters[i]);
            } else {
                isCorrect = q.correctAnswers.includes(userAns!);
            }
        }

        switch (filter) {
            case 'CORRECT': return isCorrect;
            case 'WRONG': return isAnswered && !isCorrect;
            case 'UNANSWERED': return !isAnswered;
            default: return true;
        }
    });

    // Safe access to current question based on filter
    const activeQuestion = filteredQuestions[currentQuestionIndex];

    if (!result) return <div className="p-8 text-center">Đang tải kết quả...</div>;

    const stats = [
        { label: 'Câu hỏi', value: result.totalQuestions, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Đúng', value: result.correctCount, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Sai', value: result.totalQuestions - result.correctCount, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Điểm', value: result.score.toFixed(1), color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="space-y-3 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-sm truncate">{result.subjectName}</h1>
                    <p className="text-[10px] text-gray-500">{new Date(result.timestamp).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg font-black text-base ${result.passed !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.score.toFixed(1)}
                </div>
            </div>

            {/* Multi-Subject Summary */}
            {(result.isMultiSubject || (result.subjectResults && result.subjectResults.length > 0)) && (
                <div className="space-y-2">
                    <div className={clsx(
                        "p-3 rounded-xl text-center border-2",
                        result.passed ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
                    )}>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Kết Quả Chung Cuộc</p>
                        <h2 className="text-2xl font-black">{result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}</h2>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <h3 className="font-bold text-sm mb-2">Chi tiết môn thi</h3>
                        <div className="space-y-1.5">
                            {result.subjectResults?.map((sub: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                    <div className="flex-1 mr-3 min-w-0">
                                        <div className="font-bold text-xs truncate">{sub.subjectName}</div>
                                        <div className="text-[10px] text-gray-400">
                                            {sub.correctCount}/{sub.totalQuestions} câu đúng
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-sm text-gray-900 dark:text-gray-100">{sub.score.toFixed(1)}</span>
                                        <span className={clsx(
                                            "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                                            sub.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {sub.passed ? 'ĐẠT' : 'RỚT'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
                {stats.map((stat, i) => (
                    <div key={i} className={clsx("p-3 rounded-2xl flex flex-col items-center justify-center gap-1", stat.bg)}>
                        <span className={clsx("font-black text-lg", stat.color)}>{stat.value}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400">{stat.label}</span>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'CORRECT', label: 'Đúng', icon: CheckCircle, color: 'text-green-600' },
                    { key: 'WRONG', label: 'Sai', icon: XCircle, color: 'text-red-600' },
                    { key: 'UNANSWERED', label: 'Chưa làm', icon: HelpCircle, color: 'text-gray-600' },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => {
                            setFilter(f.key as any);
                            setCurrentQuestionIndex(0); // Reset index on filter change
                        }}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5",
                            filter === f.key
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "bg-white dark:bg-zinc-900 text-gray-500 border border-gray-100 dark:border-zinc-800"
                        )}
                    >
                        {f.icon && <f.icon size={12} />}
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Question Review Area */}
            {filteredQuestions.length > 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Câu {(activeQuestion?.id ? questions.findIndex(q => q.id === activeQuestion.id) : 0) + 1} / {questions.length}
                        </span>

                        <div className="flex gap-1">
                            <button
                                disabled={currentQuestionIndex === 0}
                                onClick={() => setCurrentQuestionIndex(i => i - 1)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                disabled={currentQuestionIndex === filteredQuestions.length - 1}
                                onClick={() => setCurrentQuestionIndex(i => i + 1)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                            >
                                <ChevronLeft size={18} className="rotate-180" />
                            </button>
                        </div>
                    </div>

                    {activeQuestion && (
                        <QuestionView
                            question={activeQuestion}
                            selectedAnswer={result?.userAnswers?.[activeQuestion.id!] || null}
                            selectedSubAnswers={result?.userSubAnswers?.[activeQuestion.id!] || []}
                            showResult={true} // Always show result in review
                            onAnswer={() => { }} // Read only
                            onSubAnswer={() => { }} // Read only
                        />
                    )}
                </div>
            ) : (
                <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl">
                    <p className="text-gray-400 text-sm">Không có câu hỏi nào trong mục này</p>
                </div>
            )}
        </div>
    );
};
