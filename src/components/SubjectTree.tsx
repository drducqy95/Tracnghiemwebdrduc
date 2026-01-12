import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { Subject } from '../db';
import { Folder, ChevronRight, MoreVertical } from 'lucide-react';

interface SubjectTreeProps {
    subjects: Subject[];
    onSelect: (subject: Subject) => void;
    enableMenu?: boolean; // Only QuestionBank needs context menu for creating/deleting
}

export const SubjectTree: React.FC<SubjectTreeProps> = ({ subjects, onSelect, enableMenu = false }) => {
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const rootSubjects = subjects.filter(s => s.parentId === null);

    const toggleExpand = (id: number) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    return (
        <div className="space-y-3">
            {rootSubjects.map(subject => (
                <SubjectNode
                    key={subject.id}
                    subject={subject}
                    allSubjects={subjects}
                    expandedIds={expandedIds}
                    onToggle={toggleExpand}
                    onSelect={onSelect}
                    enableMenu={enableMenu}
                />
            ))}
            {rootSubjects.length === 0 && (
                <div className="text-center py-10 text-gray-400">Không có dữ liệu</div>
            )}
        </div>
    );
};

interface SubjectNodeProps {
    subject: Subject;
    allSubjects: Subject[];
    expandedIds: Set<number>;
    onToggle: (id: number) => void;
    onSelect: (subject: Subject) => void;
    level?: number;
    enableMenu: boolean;
}

const SubjectNode: React.FC<SubjectNodeProps> = ({ subject, allSubjects, expandedIds, onToggle, onSelect, level = 0, enableMenu }) => {
    const isExpanded = expandedIds.has(subject.id!);
    const children = allSubjects.filter(s => s.parentId === subject.id);
    const hasChildren = children.length > 0;
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleNodeClick = () => {
        if (hasChildren) {
            onToggle(subject.id!);
        } else {
            onSelect(subject);
        }
    };

    return (
        <div className="space-y-2 relative">
            <div
                className={`group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all ${level > 0 ? 'ml-6' : ''}`}
                onClick={handleNodeClick}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hasChildren ? 'bg-primary/10 text-primary' : 'bg-gray-50 dark:bg-zinc-800 text-gray-400'}`}>
                        <Folder size={18} fill={hasChildren ? 'currentColor' : 'none'} />
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

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {hasChildren && (
                        <ChevronRight size={18} className={`text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                    )}

                    {/* Menu only for Leaf nodes if enabling menu, OR for all nodes if we want to manage folders */}
                    {/* For now enabling menu only for QuestionBank management purpose */}
                    {enableMenu && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors overflow-visible"
                            >
                                <MoreVertical size={16} className="text-gray-400" />
                            </button>
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 z-20 overflow-hidden animate-in fade-in zoom-in-95">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                navigate(`/bank/${subject.id}`);
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 font-medium"
                                        >
                                            Xem chi tiết
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                if (confirm('Xóa bộ đề này?')) {
                                                    db.subjects.delete(subject.id!);
                                                }
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-medium"
                                        >
                                            Xóa bộ đề
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    {children.map(child => (
                        <SubjectNode
                            key={child.id}
                            subject={child}
                            allSubjects={allSubjects}
                            expandedIds={expandedIds}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            level={level + 1}
                            enableMenu={enableMenu}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
