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
        // Logic check: if userAnswers is missing (legacy), try to fail gracefully
        const isCorrect = userAns && q.correctAnswers.includes(userAns);
        const isAnswered = userAns !== null && userAns !== undefined;

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
        <div className="space-y-6 animate-in fade-in duration-300 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-lg">{result.subjectName}</h1>
                    <p className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleString()}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl font-black text-lg ${result.passed !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.score.toFixed(1)}
                </div>
            </div>

            {/* NEW: Multi-Subject Summary Banner */}
            {(result.isMultiSubject || (result.subjectResults && result.subjectResults.length > 0)) && (
                <div className="space-y-4">
                    <div className={clsx(
                        "p-6 rounded-[2rem] text-center border-4",
                        result.passed ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
                    )}>
                        <p className="text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Kết Quả Chung Cuộc</p>
                        <h2 className="text-4xl font-black mb-1">{result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}</h2>
                        <p className="text-sm font-medium opacity-80">
                            {result.passed
                                ? 'Chúc mừng! Bạn đã vượt qua kỳ thi.'
                                : 'Rất tiếc, bạn chưa đủ điều kiện đỗ.'}
                        </p>
                    </div>

                    {/* Subject Breakdown */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <h3 className="font-bold mb-4">Kết quả chi tiết môn thi</h3>
                        <div className="space-y-3">
                            {result.subjectResults?.map((sub: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                    <div className="flex-1 mr-4">
                                        <div className="font-bold text-sm truncate">{sub.subjectName}</div>
                                        <div className="text-xs text-gray-400">
                                            {sub.correctCount}/{sub.totalQuestions} câu đúng
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-lg text-gray-900 dark:text-gray-100">{sub.score.toFixed(1)}</span>
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
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
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                            "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
                            filter === f.key
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "bg-white dark:bg-zinc-900 text-gray-500 border border-gray-100 dark:border-zinc-800"
                        )}
                    >
                        {f.icon && <f.icon size={14} />}
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Question Review Area */}
            {filteredQuestions.length > 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Câu {(activeQuestion?.id ? questions.findIndex(q => q.id === activeQuestion.id) : 0) + 1} / {questions.length}
                        </span>

                        <div className="flex gap-2">
                            <button
                                disabled={currentQuestionIndex === 0}
                                onClick={() => setCurrentQuestionIndex(i => i - 1)}
                                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                disabled={currentQuestionIndex === filteredQuestions.length - 1}
                                onClick={() => setCurrentQuestionIndex(i => i + 1)}
                                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"
                            >
                                <ChevronLeft size={20} className="rotate-180" />
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
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[2.5rem]">
                    <p className="text-gray-400">Không có câu hỏi nào trong mục này</p>
                </div>
            )}
        </div>
    );
};
