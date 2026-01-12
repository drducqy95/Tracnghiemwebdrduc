import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Plus, Search, Filter } from 'lucide-react';
import { ImportModal } from '../components/ImportModal';
import { SubjectTree } from '../components/SubjectTree';

export const QuestionBankScreen: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const navigate = useNavigate();

    const allSubjects = useLiveQuery(() => db.subjects.toArray()) || [];

    // Filter subjects based on search if needed, but tree structure makes it hard.
    // For now, let's keep showing all, or maybe flatten if searching.
    // Keeping it simple: Show full tree.

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold italic">Ngân Hàng</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 active:scale-95 transition-transform"
                    >
                        <Plus size={20} className="text-primary" />
                    </button>
                    <button className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 active:scale-95 transition-transform">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Tìm kiếm bộ đề..."
                    className="w-full p-4 pl-12 rounded-[1.5rem] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm outline-none focus:ring-2 ring-primary/20 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Subject Tree */}
            <SubjectTree
                subjects={allSubjects}
                enableMenu={true}
                onSelect={(subject) => {
                    navigate(`/bank/${subject.id}`);
                }}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </div>
    );
};
