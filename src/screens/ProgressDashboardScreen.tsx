import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement,
} from 'chart.js';
import { AlertCircle, TrendingUp, BookOpen } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export const ProgressDashboardScreen: React.FC = () => {
    const results = useLiveQuery(() => db.examResults.orderBy('timestamp').toArray()) || [];
    const questionsCount = useLiveQuery(() => db.questions.count()) || 0;
    const statusCounts = useLiveQuery(async () => {
        const fresh = await db.questions.where('status').equals(0).count();
        const correct = await db.questions.where('status').equals(1).count();
        const wrong = await db.questions.where('status').equals(2).count();
        return { fresh, correct, wrong };
    }) || { fresh: 0, correct: 0, wrong: 0 };

    const lineData = {
        labels: results.map(r => new Date(r.timestamp).toLocaleDateString('vi-VN')),
        datasets: [
            {
                label: 'Điểm số',
                data: results.map(r => r.score),
                fill: false,
                borderColor: '#1565C0',
                tension: 0.4,
            },
        ],
    };

    const pieData = {
        labels: ['Mới', 'Đã thuộc', 'Hay sai'],
        datasets: [
            {
                data: [statusCounts.fresh, statusCounts.correct, statusCounts.wrong],
                backgroundColor: ['#e2e8f0', '#10b981', '#ef4444'],
                borderWidth: 0,
            },
        ],
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <h2 className="text-2xl font-bold italic px-2">Tiến độ Học tập</h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/30">
                    <BookOpen className="text-blue-500 mb-2" size={24} />
                    <div className="text-2xl font-black">{questionsCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tổng câu hỏi</div>
                </div>
                <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30">
                    <TrendingUp className="text-emerald-500 mb-2" size={24} />
                    <div className="text-2xl font-black">{statusCounts.correct}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Câu đã thuộc</div>
                </div>
            </div>

            {/* Line Chart: Score progress */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" />
                    Xu hướng điểm số
                </h3>
                {results.length > 0 ? (
                    <div className="h-64">
                        <Line data={lineData} options={{ maintainAspectRatio: false }} />
                    </div>
                ) : (
                    <EmptyState message="Chưa có dữ liệu thi thử" />
                )}
            </div>

            {/* Pie Chart: Question Status */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-zinc-800">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                    <PieChartIcon size={18} className="text-primary" />
                    Phân bố câu hỏi
                </h3>
                <div className="flex flex-col items-center gap-6">
                    <div className="w-48 h-48">
                        <Pie data={pieData} options={{ cutout: '70%' }} />
                    </div>
                    <div className="grid grid-cols-3 gap-8 w-full">
                        <StatMini label="Mới" value={statusCounts.fresh} color="bg-gray-200" />
                        <StatMini label="Thuộc" value={statusCounts.correct} color="bg-emerald-500" />
                        <StatMini label="Sai" value={statusCounts.wrong} color="bg-red-500" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const PieChartIcon = ({ size, className }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

const EmptyState = ({ message }: { message: string }) => (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
        <AlertCircle size={32} opacity={0.3} />
        <p className="text-xs font-bold uppercase tracking-widest">{message}</p>
    </div>
);

const StatMini = ({ label, value, color }: any) => (
    <div className="text-center group">
        <div className="text-lg font-black">{value}</div>
        <div className="flex items-center justify-center gap-1.5 mt-1">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{label}</div>
        </div>
    </div>
);
