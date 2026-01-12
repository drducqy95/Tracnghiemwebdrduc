import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Calendar, ChevronRight, Trophy, Clock, Trash2, Filter, AlertCircle, PlayCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store';

export const HistoryScreen: React.FC = () => {
    const results = useLiveQuery(() => db.examResults.orderBy('timestamp').reverse().toArray()) || [];
    const navigate = useNavigate();
    const { startSession } = useExamStore();

    const handleDelete = async (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa lịch sử này?')) {
            await db.examResults.delete(id);
        }
    };

    const handleRetake = async (result: any) => {
        // Load original questions
        // If questionIds exist, use them. Else fetch by subject (legacy)
        let questions = [];
        if (result.questionIds && result.questionIds.length > 0) {
            questions = await db.questions.bulkGet(result.questionIds);
            questions = questions.filter(q => !!q); // Filter undefined
        } else {
            questions = await db.getQuestionsBySubjectRecursive(result.subjectId);
            questions = questions.slice(0, result.totalQuestions); // Approx
        }

        if (questions.length === 0) return alert('Không tìm thấy dữ liệu câu hỏi cũ');

        startSession(
            `Thi lại: ${result.examName}`,
            [{ subjectId: result.subjectId, subjectName: result.subjectName, count: questions.length, time: 45 }], // Time might be lost if not stored, default 45
            questions
        );
        navigate('/exam/run');
    };

    const handleReview = (id: number) => {
        navigate(`/review/${id}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-bold italic">Lịch sử Thi</h2>
                <button className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <Filter size={18} />
                </button>
            </div>

            <div className="space-y-4">
                {results.length > 0 ? results.map((result) => (
                    <div key={result.id} className="group relative bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 active:scale-[0.98] transition-all overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg line-clamp-1">{result.subjectName}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-widest">
                                    <Calendar size={12} />
                                    <span>{format(result.timestamp, 'dd/MM/yyyy HH:mm')}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className={`text-2xl font-black ${result.passed !== false ? 'text-primary' : 'text-red-500'}`}>
                                    {result.score.toFixed(1)}
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Điểm số</span>
                                {result.isMultiSubject && (
                                    <span className={`mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Multi-subject Details */}
                        {result.isMultiSubject && result.subjectResults && (
                            <div className="mb-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-2">
                                {result.subjectResults.map((sub: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[60%]">• {sub.subjectName}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400">{sub.correctCount}/{sub.totalQuestions}</span>
                                            <span className={`font-bold ${sub.passed ? 'text-green-600' : 'text-red-500'}`}>
                                                {sub.score.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-zinc-800">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Trophy size={14} className="text-orange-400" />
                                <span className="text-xs font-medium">Đúng: <span className="text-gray-900 dark:text-gray-100 font-bold">{result.correctCount}/{result.totalQuestions}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                                <Clock size={14} className="text-blue-400" />
                                <span className="text-xs font-medium">Phiên: <span className="text-gray-900 dark:text-gray-100 font-bold uppercase tracking-tighter">{result.sessionId}</span></span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4 pt-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleReview(result.id!); }}
                                className="flex-1 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl font-bold text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                                <Eye size={16} /> Xem lại
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRetake(result); }}
                                className="flex-1 py-3 bg-primary/10 text-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                            >
                                <PlayCircle size={16} /> Thi lại
                            </button>
                        </div>

                        {/* Quick Actions overlay (visible on hover/active) */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(result.id!); }}
                                className="p-2 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="absolute right-0 bottom-0 p-3 opacity-10 pointer-events-none">
                            <ChevronRight size={48} />
                        </div>
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center gap-4 text-center bg-gray-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-zinc-800">
                        <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-500">Chưa có lịch sử thi</p>
                            <p className="text-xs text-gray-400 uppercase mt-1 tracking-widest">Hãy bắt đầu làm bài ngay!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
