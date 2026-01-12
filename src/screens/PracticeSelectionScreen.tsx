import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Search, BookOpen, Filter, ChevronRight, Folder } from 'lucide-react';
import { SubjectTree } from '../components/SubjectTree';
import { useSettingsStore } from '../store';

export const PracticeSelectionScreen: React.FC = () => {
    const navigate = useNavigate();
    const { darkMode } = useSettingsStore();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterExamTerm, setFilterExamTerm] = useState('Tất cả');
    const [filterLevel, setFilterLevel] = useState('Tất cả');
    const [filterType, setFilterType] = useState('Tất cả');
    const [showOnlyRoot, setShowOnlyRoot] = useState(true);

    const allSubjects = useLiveQuery(() => db.subjects.toArray()) || [];

    // Derive Unique Options for Dropdowns
    const uniqueExamTerms = useMemo(() => Array.from(new Set(allSubjects.map(s => s.examTerm).filter(Boolean))), [allSubjects]);
    const uniqueLevels = useMemo(() => Array.from(new Set(allSubjects.map(s => s.level).filter(Boolean))), [allSubjects]);
    const uniqueTypes = useMemo(() => Array.from(new Set(allSubjects.map(s => s.type).filter(Boolean))), [allSubjects]);

    // Filter Logic
    const filteredSubjects = useMemo(() => {
        return allSubjects.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesExamTerm = filterExamTerm === 'Tất cả' || s.examTerm === filterExamTerm;
            const matchesLevel = filterLevel === 'Tất cả' || s.level === filterLevel;
            const matchesType = filterType === 'Tất cả' || s.type === filterType;
            // Only apply "Root" filter if NOT searching/filtering deep properties
            // But reference has a toggle. Let's respect the toggle.
            // If searching, we usually want to search EVERYTHING, so maybe ignore root filter if search is active?
            // Reference logic: matchesRoot = showOnlyRoot ? !s.parentId : true;
            // But if user specific searches "Cardiology", they expect to see it even if it's a child.
            // I'll make Root Filter applied ONLY if searchQuery is empty.
            // Or just follow reference strictly. Reference applies all AND conditions.
            const matchesRoot = showOnlyRoot && !searchQuery ? s.parentId === null : true;

            return matchesSearch && matchesExamTerm && matchesLevel && matchesType && matchesRoot;
        });
    }, [allSubjects, searchQuery, filterExamTerm, filterLevel, filterType, showOnlyRoot]);

    const isFiltering = searchQuery !== '' || filterExamTerm !== 'Tất cả' || filterLevel !== 'Tất cả' || filterType !== 'Tất cả';

    const dropdownClass = `px-3 py-2 rounded-xl text-xs font-bold border outline-none focus:border-primary appearance-none ${darkMode ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white text-gray-700 border-gray-200'}`;

    return (
        <div className="flex flex-col h-full pb-20">
            <div className="px-6 py-4 flex justify-between items-center sticky top-0 bg-gray-50/90 dark:bg-black/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold italic text-gray-900 dark:text-white">Ôn tập</h2>
                        <p className="text-xs text-gray-500 font-semibold">Chọn môn để luyện tập</p>
                    </div>
                </div>
            </div>

            <div className="px-6 space-y-3">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm môn học..."
                        className="w-full p-4 pl-12 rounded-[1.5rem] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm outline-none focus:ring-2 ring-primary/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
                    <button
                        onClick={() => setShowOnlyRoot(!showOnlyRoot)}
                        className={`flex items-center px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition shrink-0 ${showOnlyRoot
                            ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-white dark:text-black'
                            : 'bg-white text-gray-600 border-gray-200 dark:bg-zinc-900 dark:text-gray-400 dark:border-zinc-800'
                            }`}
                    >
                        <Filter className="w-3 h-3 mr-1" /> {showOnlyRoot ? 'Môn gốc' : 'Tất cả'}
                    </button>

                    <select value={filterExamTerm} onChange={(e) => setFilterExamTerm(e.target.value)} className={dropdownClass}>
                        <option value="Tất cả">Kỳ thi: Tất cả</option>
                        {uniqueExamTerms.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className={dropdownClass}>
                        <option value="Tất cả">Cấp độ: Tất cả</option>
                        {uniqueLevels.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={dropdownClass}>
                        <option value="Tất cả">Loại: Tất cả</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 mt-4">
                {!isFiltering ? (
                    // Default Tree View (Pass valid subjects)
                    <SubjectTree
                        subjects={allSubjects}
                        enableMenu={false}
                        onSelect={(subject) => navigate(`/practice/${subject.id}`)}
                    />
                ) : (
                    // Flat List for Filtered Results
                    <div className="space-y-3">
                        {filteredSubjects.length === 0 ? (
                            <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                <Search className="w-10 h-10 mb-2 opacity-20" />
                                <p>Không tìm thấy môn học nào phù hợp</p>
                            </div>
                        ) : (
                            filteredSubjects.map(subject => (
                                <div
                                    key={subject.id}
                                    onClick={() => navigate(`/practice/${subject.id}`)}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                            <Folder size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm line-clamp-1">{subject.name}</h4>
                                            <div className="flex gap-2 items-center text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                                <span>{subject.level}</span>
                                                <span>•</span>
                                                <span>{subject.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300" />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
