import React, { useState } from 'react';
import type { Question } from '../db';
import { Check, X, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ImageLightbox } from './ImageLightbox';

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
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    return (
        <div className="space-y-2">
            {zoomedImage && <ImageLightbox src={zoomedImage} onClose={() => setZoomedImage(null)} />}

            {/* Question Content */}
            <div className="space-y-2">
                {question.image && (
                    <img
                        src={question.image}
                        alt="Question"
                        className="w-full max-h-40 object-contain rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 cursor-zoom-in hover:opacity-90 transition-opacity"
                        onClick={() => setZoomedImage(question.image!)}
                    />
                )}
                <h3 className="text-base font-bold leading-snug">{question.content}</h3>
            </div>

            {/* Answer Area */}
            {question.questionType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-1.5">
                    {question.options.map((option, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = !!selectedAnswer?.includes(letter);
                        const isCorrect = question.correctAnswers.includes(letter);

                        // Determine button styling based on state
                        let buttonStyle = "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-sm";
                        let badgeStyle = "bg-gray-100 dark:bg-zinc-800 text-gray-400";

                        if (showResult) {
                            // Show results state
                            if (isCorrect) {
                                buttonStyle = "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold";
                                badgeStyle = "bg-emerald-500 text-white";
                            } else if (isSelected && !isCorrect) {
                                buttonStyle = "bg-red-50 dark:bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400";
                                badgeStyle = "bg-red-500 text-white";
                            }
                        } else if (isSelected) {
                            // Selected but not checked yet
                            buttonStyle = "bg-primary/5 border-primary ring-1 ring-primary/20";
                            badgeStyle = "bg-primary text-white";
                        }

                        return (
                            <button
                                key={idx}
                                disabled={showResult}
                                onClick={() => onAnswer(letter)}
                                className={cn(
                                    "w-full p-2.5 rounded-xl border text-left transition-all active:scale-[0.99] flex gap-3 items-center text-sm",
                                    buttonStyle
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors",
                                    badgeStyle
                                )}>
                                    {showResult && isCorrect ? <Check size={14} /> :
                                        showResult && isSelected && !isCorrect ? <X size={14} /> :
                                            letter}
                                </div>
                                <div className="flex-1">
                                    {option}
                                    {question.optionImages?.[idx] && (
                                        <img
                                            src={question.optionImages[idx]!}
                                            alt={`Option ${letter}`}
                                            className="mt-1 rounded-lg max-h-32 cursor-zoom-in hover:opacity-90 transition-opacity"
                                            onClick={(e) => { e.stopPropagation(); setZoomedImage(question.optionImages![idx]!); }}
                                        />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {question.questionType === 'TRUE_FALSE' && (
                <div className="grid grid-cols-2 gap-2">
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
                <div className="space-y-2">
                    {question.subQuestions.map((subQ, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-1.5">
                            <p className="text-xs font-medium">{idx + 1}. {subQ}</p>
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

            {/* Correct Answer Summary — shown after checking */}
            {showResult && (
                <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/30 animate-in fade-in duration-300">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                        📌 Đáp án đúng: {
                            question.questionType === 'TRUE_FALSE_TABLE'
                                ? question.subAnswers.map((a, i) => `${i + 1}. ${a ? 'Đúng' : 'Sai'}`).join(' | ')
                                : question.correctAnswers.join(', ')
                        }
                    </p>
                </div>
            )}

            {/* Explanation */}
            {showResult && (question.explanation || question.explanationImage) && (
                <div className="px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-900/30 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold mb-1">
                        <AlertCircle size={14} />
                        <h4 className="text-xs">Giải thích:</h4>
                    </div>
                    {question.explanation && <p className="text-xs leading-relaxed">{question.explanation}</p>}
                    {question.explanationImage && (
                        <img
                            src={question.explanationImage}
                            alt="Explanation"
                            className="mt-2 rounded-xl w-full max-h-40 object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => setZoomedImage(question.explanationImage!)}
                        />
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
            "p-3 rounded-xl flex flex-col items-center gap-1.5 border-2 transition-all active:scale-95",
            isSelected ? "border-primary" : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900",
            showResult && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
            showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-500/10"
        )}
    >
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white", color)}>
            {label.includes('Đúng') ? <Check size={18} /> : <X size={18} />}
        </div>
        <span className="font-bold text-sm">{label}</span>
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
