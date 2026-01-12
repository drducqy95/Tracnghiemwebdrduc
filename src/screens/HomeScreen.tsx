import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, ChevronRight, PlusCircle, TrendingUp, Library } from 'lucide-react';
import { ImportModal } from '../components/ImportModal';


export const HomeScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isImportOpen, setIsImportOpen] = useState(false);

    // Data Loading
    const userProfile = useLiveQuery(async () => {
        const profile = await db.userProfile.toCollection().first();
        return profile || { fullName: 'User', avatar: undefined };
    });

    const subjectsCount = useLiveQuery(() => db.subjects.count()) || 0;
    const questionsCount = useLiveQuery(() => db.questions.count()) || 0;
    const masteredCount = useLiveQuery(() => db.questions.where('status').equals(1).count()) || 0; // Status 1 = Mastered
    const recentSubjects = useLiveQuery(() => db.subjects.limit(3).toArray()) || [];
    const recentExams = useLiveQuery(() => db.examResults.orderBy('timestamp').reverse().limit(3).toArray()) || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
            {/* Header */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Xin chào,</p>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{userProfile?.fullName || 'Bạn'}</h1>
                </div>
                {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xl">👋</span>
                    </div>
                )}
            </header>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                    onClick={() => navigate('/bank')}
                    className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all outline-none group"
                >
                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                        <Library size={24} />
                    </div>
                    <span className="font-bold text-sm text-blue-900 dark:text-blue-200">Ngân hàng</span>
                </button>

                <button
                    onClick={() => navigate('/create')}
                    className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all outline-none group"
                >
                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm text-purple-600 group-hover:scale-110 transition-transform">
                        <PlusCircle size={24} />
                    </div>
                    <span className="font-bold text-sm text-purple-900 dark:text-purple-200">Tạo câu hỏi</span>
                </button>

                <button
                    onClick={() => navigate('/progress')}
                    className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-[2rem] flex flex-col items-center gap-2 active:scale-95 transition-all outline-none group"
                >
                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm text-orange-600 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                    <span className="font-bold text-sm text-orange-900 dark:text-orange-200">Tiến độ</span>
                </button>
            </div>

            {/* Header Stat Card */}
            <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/20">
                <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold">Thống kê</h2>
                            <p className="text-blue-100 mt-1">Tổng quan quá trình học tập</p>
                        </div>
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                            <Target size={24} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                        <StatItem label="Đã học" value={questionsCount} />
                        <StatItem label="Đã thuộc" value={masteredCount} />
                        <StatItem label="Môn học" value={subjectsCount} />
                    </div>
                </div>
                {/* Abstract background shapes */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -left-10 -top-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
            </div>

            <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

            {/* Recent Exams */}
            {recentExams.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-lg font-bold">Lịch sử thi gần đây</h3>
                        <button onClick={() => navigate('/history')} className="text-primary text-sm font-semibold">Tất cả</button>
                    </div>

                    <div className="space-y-3">
                        {recentExams.map(exam => (
                            <div key={exam.id} onClick={() => navigate(`/review/${exam.id}`)} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${exam.score >= 5 ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {exam.score.toFixed(1)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold line-clamp-1">{exam.subjectName}</h4>
                                        <p className="text-xs text-gray-500 dark:text-zinc-500">
                                            {new Date(exam.timestamp).toLocaleDateString()} • {exam.correctCount}/{exam.totalQuestions} câu đúng
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-300" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Subjects */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-bold">Học gần đây</h3>
                    <button className="text-primary text-sm font-semibold">Tất cả</button>
                </div>

                <div className="space-y-3">
                    {recentSubjects.length > 0 ? recentSubjects.map(subject => (
                        <div
                            key={subject.id}
                            onClick={() => navigate(`/practice/${subject.id}`)}
                            className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                                    <BookOpen size={20} className="text-gray-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">{subject.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-zinc-500">{subject.level} • {subject.type}</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    )) : (
                        <div className="text-center py-10 text-gray-400">Chưa có dữ liệu học tập</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, value }: { label: string, value: number | string }) => (
    <div className="text-center">
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
);
