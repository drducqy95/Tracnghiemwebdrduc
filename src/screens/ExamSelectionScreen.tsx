import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Search, PenTool, Settings, PlayCircle, Clock, BookOpen, ChevronRight, Filter } from 'lucide-react';
import { useExamStore } from '../store';
import { useSettingsStore } from '../store';

export const ExamSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { startSession } = useExamStore();
    const { darkMode } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<'Kỳ thi' | 'Tự chọn'>('Kỳ thi');
    const [searchQuery, setSearchQuery] = useState('');

    // Custom Config State
    const [customCount, setCustomCount] = useState(40);
    const [customTime, setCustomTime] = useState(45);

    // Data
    const examConfigs = useLiveQuery(() => db.examConfigs.toArray()) || [];
    const allSubjects = useLiveQuery(() => db.subjects.toArray()) || [];

    // Filter Logic for Subjects (Tự chọn)
    const filteredSubjects = useMemo(() => {
        return allSubjects.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            // Only show root subjects or leaf? User might want to test specific module.
            // Reference shows flat list of all subjects (or filtered).
            // Let's show all for flexibility, or filter by search.
            true
        );
    }, [allSubjects, searchQuery]);

    const handleStartPreset = async (config: any) => {
        // Fetch questions for all subjects in config
        const allQuestions = [];
        for (const subConfig of config.subjects) {
            const qs = await db.getQuestionsBySubjectRecursive(subConfig.subjectId);
            // Shuffle and slice
            const selected = qs.sort(() => 0.5 - Math.random()).slice(0, subConfig.count);
            // We need to tag them or just push them? 
            // Since we flatten `questions` in SessionState, we just push.
            // But wait, if multiple subjects have same question IDs? IDs are unique in DB.
            allQuestions.push(...selected);
        }

        if (allQuestions.length === 0) return alert('Không có câu hỏi nào!');

        startSession(config.name, config.subjects, allQuestions);
        navigate('/exam/run');
    };

    const handleStartSelfSelect = async (subject: any) => {
        const qs = await db.getQuestionsBySubjectRecursive(subject.id);
        if (qs.length === 0) return alert('Chưa có câu hỏi!');

        const count = Math.min(qs.length, customCount);
        const selected = qs.sort(() => 0.5 - Math.random()).slice(0, count);

        // Create a temporary "SubjectConfig"
        const config = [{
            subjectId: subject.id,
            subjectName: subject.name,
            count: count,
            time: customTime
        }];

        startSession(`Thi thử: ${subject.name}`, config, selected);
        navigate('/exam/run');
    };

    return (
        <div className="flex flex-col h-full pb-20">
            {/* Header */}
            <div className="px-6 py-4 flex flex-col gap-4 sticky top-0 bg-gray-50/90 dark:bg-black/90 backdrop-blur-md z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                            <PenTool size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold italic text-gray-900 dark:text-white">Thi thử</h2>
                            <p className="text-xs text-gray-500 font-semibold">Mô phỏng kỳ thi thật</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-200 dark:bg-zinc-800 rounded-xl">
                    {['Kỳ thi', 'Tự chọn'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab
                                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-6 pt-2">

                {/* TAB: KỲ THI */}
                {activeTab === 'Kỳ thi' && (
                    <div className="space-y-4">
                        {examConfigs.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 italic">
                                Chưa có kỳ thi nào. Vào Cài đặt để tạo thêm.
                            </div>
                        ) : (
                            examConfigs.map(config => (
                                <div key={config.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold uppercase text-gray-800 dark:text-gray-200">{config.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold">{config.examTerm}</span>
                                                <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full font-bold">{config.level}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleStartPreset(config)}
                                            className="p-3 bg-red-500 text-white rounded-xl shadow-lg shadow-red-200 dark:shadow-none active:scale-95 transition-transform"
                                        >
                                            <PlayCircle size={24} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {config.subjects.map((sub: any) => (
                                            <div key={sub.subjectId} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">● {sub.subjectName}</span>
                                                <div className="flex gap-3 text-xs text-gray-400 font-bold">
                                                    <span className="flex items-center"><BookOpen size={12} className="mr-1" /> {sub.count}</span>
                                                    <span className="flex items-center"><Clock size={12} className="mr-1" /> {sub.time}'</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB: TỰ CHỌN */}
                {activeTab === 'Tự chọn' && (
                    <div className="space-y-6">
                        {/* Config Panel */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-red-100 dark:border-zinc-800">
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-gray-800 dark:text-white">
                                <Settings size={18} className="text-red-500" /> Cấu hình bài thi
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Số câu hỏi</label>
                                    <input
                                        type="number"
                                        value={customCount}
                                        onChange={e => setCustomCount(Number(e.target.value))}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none font-bold text-center outline-none focus:ring-2 ring-red-200"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Thời gian (phút)</label>
                                    <input
                                        type="number"
                                        value={customTime}
                                        onChange={e => setCustomTime(Number(e.target.value))}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border-none font-bold text-center outline-none focus:ring-2 ring-red-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm bộ đề..."
                                className="w-full p-3 pl-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>

                        {/* Subject List */}
                        <div className="space-y-3">
                            {filteredSubjects.map(subject => (
                                <div
                                    key={subject.id}
                                    onClick={() => handleStartSelfSelect(subject)}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-colors">
                                            <PlayCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm line-clamp-1">{subject.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{subject.level} • {subject.type}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
