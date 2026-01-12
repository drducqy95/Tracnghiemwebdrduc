import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Question } from '../db';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';

export const PracticeScreen: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [showExplanation, setShowExplanation] = useState(false);

    // Load subject and questions
    const subject = useLiveQuery(() => db.subjects.get(Number(subjectId)));
    const questions = useLiveQuery(async () => {
        if (!subjectId) return [];
        return await db.questions.where('subjectId').equals(Number(subjectId)).toArray();
    }, [subjectId]) || [];

    // Helper to check answer
    const isCorrect = (q: Question) => {
        const userAns = selectedAnswers[q.id!];
        if (!userAns) return undefined;
        // Check if user answer is in the array of correct answers
        return q.correctAnswers.includes(userAns);
    };

    const handleSelectAnswer = (qId: number, answer: string) => {
        if (selectedAnswers[qId]) return; // Prevent changing after selection (optional)
        setSelectedAnswers(prev => ({ ...prev, [qId]: answer }));
    };

    const handleResetQuestion = () => {
        if (questions[currentIndex]) {
            const qId = questions[currentIndex].id!;
            setSelectedAnswers(prev => {
                const next = { ...prev };
                delete next[qId];
                return next;
            });
        }
    };

    if (!subject) return <div className="p-8 text-center">Đang tải...</div>;
    if (questions.length === 0) return <div className="p-8 text-center">Không có câu hỏi nào.</div>;

    const currentQ = questions[currentIndex];

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 p-4 flex items-center justify-between shadow-sm z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-sm line-clamp-1">{subject.name}</h1>
                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Luyện tập</p>
                </div>
                <div className="flex gap-1">
                    <button onClick={handleResetQuestion} className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <RotateCcw size={20} />
                    </button>
                    <button onClick={() => setShowExplanation(!showExplanation)} className="p-2 text-gray-400 hover:text-primary transition-colors">
                        {showExplanation ? <EyeOff size={24} /> : <Eye size={24} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300" key={currentQ.id}>
                    {/* Question Card */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-gray-500">
                                Câu {currentIndex + 1}/{questions.length}
                            </div>
                            {selectedAnswers[currentQ.id!] && (
                                isCorrect(currentQ) ?
                                    <span className="flex items-center gap-1 text-green-500 font-bold text-xs"><CheckCircle size={14} /> Đúng</span> :
                                    <span className="flex items-center gap-1 text-red-500 font-bold text-xs"><XCircle size={14} /> Sai</span>
                            )}
                        </div>

                        <h2 className="text-lg font-bold leading-relaxed mb-4">{currentQ.content}</h2>
                        {currentQ.image && (
                            <img src={currentQ.image} alt="Question" className="w-full rounded-2xl mb-4 object-contain max-h-60 border border-gray-100 dark:border-zinc-800" />
                        )}

                        <div className="space-y-3">
                            {currentQ.options.map((opt, idx) => {
                                // Logic: Convert Index to Letter (0->A, 1->B)
                                const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                                const optionKey = labels[idx] || '?';

                                const userSelectedKey = selectedAnswers[currentQ.id!]; // Now stores 'A', 'B' etc.
                                const isSelected = userSelectedKey === optionKey;
                                const isKeyCorrect = currentQ.correctAnswers.includes(optionKey);

                                let stateColor = "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800";
                                // Immediate Feedback Logic
                                if (userSelectedKey) { // If user has answered
                                    if (isKeyCorrect) {
                                        stateColor = "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 text-green-700 dark:text-green-400";
                                    } else if (isSelected) {
                                        stateColor = "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-700 dark:text-red-400";
                                    } else if (currentQ.questionType === 'MULTIPLE_CHOICE' && !isSelected && !isKeyCorrect) {
                                        // Dim unrelated options
                                        stateColor = "opacity-50 grayscale";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectAnswer(currentQ.id!, optionKey)}
                                        disabled={!!userSelectedKey} // Disable after selecting
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.99] flex items-start gap-3 ${stateColor}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${userSelectedKey
                                                ? (isKeyCorrect ? 'bg-green-500 border-green-500 text-white' : (isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-400'))
                                                : 'border-gray-200 text-gray-400 group-hover:border-primary group-hover:text-primary'
                                            }`}>
                                            {optionKey}
                                        </div>
                                        <span className="flex-1 font-medium text-sm pt-1">{opt}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Explanation */}
                    {(showExplanation || selectedAnswers[currentQ.id!]) && currentQ.explanation && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 animate-in fade-in zoom-in-95">
                            <div className="flex gap-2 items-center mb-2 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
                                <AlertCircle size={16} /> Giải thích
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentQ.explanation}</p>
                        </div>
                    )}
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
