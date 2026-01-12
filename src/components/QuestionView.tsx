import React from 'react';
import type { Question } from '../db';
import { Check, X, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface QuestionViewProps {
    question: Question;
    selectedAnswer: string | null;
    selectedSubAnswers: (boolean | null)[];
    showResult?: boolean;
    onAnswer: (answer: string) => void;
    onSubAnswer: (index: number, answer: boolean) => void;
}

export const QuestionView: React.FC<QuestionViewProps> = ({
    question,
    selectedAnswer,
    selectedSubAnswers,
    showResult = false,
    onAnswer,
    onSubAnswer
}) => {
    return (
        <div className="space-y-6">
            {/* Question Content */}
            <div className="space-y-4">
                {question.image && (
                    <img src={question.image} alt="Question" className="w-full rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800" />
                )}
                <h3 className="text-lg font-bold leading-relaxed">{question.content}</h3>
            </div>

            {/* Answer Area */}
            {question.questionType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-3">
                    {question.options.map((option, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = selectedAnswer?.includes(letter);
                        const isCorrect = question.correctAnswers.includes(letter);

                        return (
                            <button
                                key={idx}
                                disabled={showResult}
                                onClick={() => onAnswer(letter)}
                                className={cn(
                                    "w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.99] flex gap-4 items-center",
                                    !showResult && isSelected ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-sm",
                                    showResult && isCorrect && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold",
                                    showResult && isSelected && !isCorrect && "bg-red-50 dark:bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                                    isSelected ? "bg-primary text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-400"
                                )}>
                                    {letter}
                                </div>
                                <div className="flex-1">
                                    {option}
                                    {question.optionImages?.[idx] && (
                                        <img src={question.optionImages[idx]!} alt={`Option ${letter}`} className="mt-2 rounded-xl max-h-40" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {question.questionType === 'TRUE_FALSE' && (
                <div className="grid grid-cols-2 gap-4">
                    <TFButton
                        label="Đúng (True)"
                        isSelected={selectedAnswer === 'TRUE'}
                        isCorrect={showResult && question.correctAnswers.includes('TRUE')}
                        showResult={showResult}
                        onClick={() => onAnswer('TRUE')}
                        color="bg-emerald-500"
                    />
                    <TFButton
                        label="Sai (False)"
                        isSelected={selectedAnswer === 'FALSE'}
                        isCorrect={showResult && question.correctAnswers.includes('FALSE')}
                        showResult={showResult}
                        onClick={() => onAnswer('FALSE')}
                        color="bg-red-500"
                    />
                </div>
            )}

            {question.questionType === 'TRUE_FALSE_TABLE' && (
                <div className="space-y-4">
                    {question.subQuestions.map((subQ, idx) => (
                        <div key={idx} className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3">
                            <p className="text-sm font-medium">{idx + 1}. {subQ}</p>
                            <div className="flex gap-2">
                                <MiniTFButton
                                    active={selectedSubAnswers[idx] === true}
                                    correct={showResult ? question.subAnswers[idx] === true : undefined}
                                    onClick={() => !showResult && onSubAnswer(idx, true)}
                                >Đúng</MiniTFButton>
                                <MiniTFButton
                                    active={selectedSubAnswers[idx] === false}
                                    correct={showResult ? question.subAnswers[idx] === false : undefined}
                                    onClick={() => !showResult && onSubAnswer(idx, false)}
                                >Sai</MiniTFButton>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Explanation */}
            {showResult && (question.explanation || question.explanationImage) && (
                <div className="p-6 rounded-[2rem] bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-900/30 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold mb-3">
                        <AlertCircle size={18} />
                        <h4>Giải thích:</h4>
                    </div>
                    {question.explanation && <p className="text-sm leading-relaxed">{question.explanation}</p>}
                    {question.explanationImage && (
                        <img src={question.explanationImage} alt="Explanation" className="mt-4 rounded-2xl w-full" />
                    )}
                </div>
            )}
        </div>
    );
};

const TFButton = ({ label, isSelected, isCorrect, showResult, onClick, color }: any) => (
    <button
        disabled={showResult}
        onClick={onClick}
        className={cn(
            "p-6 rounded-[2rem] flex flex-col items-center gap-3 border-2 transition-all active:scale-95",
            isSelected ? "border-primary" : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900",
            showResult && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
            showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-500/10"
        )}
    >
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", color)}>
            {label.includes('Đúng') ? <Check size={24} /> : <X size={24} />}
        </div>
        <span className="font-bold">{label}</span>
    </button>
);

const MiniTFButton = ({ children, active, correct, onClick }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all border",
            active ? "bg-primary text-white border-primary" : "bg-gray-50 dark:bg-zinc-800 border-transparent text-gray-500",
            correct === true && "bg-emerald-500 text-white border-emerald-500",
            correct === false && active && "bg-red-500 text-white border-red-500"
        )}
    >
        {children}
    </button>
);
