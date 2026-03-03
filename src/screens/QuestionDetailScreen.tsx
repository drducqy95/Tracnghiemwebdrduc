import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Search, Trash2, Edit, FileDown, Upload } from 'lucide-react';
import { importQuestionsFromJsonFile } from '../services/ImportService';
import { QuestionView } from '../components/QuestionView';
import JSZip from 'jszip';

export const QuestionDetailScreen: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'learning' | 'new'>('all');
    const [currentIndex, setCurrentIndex] = useState(0);

    const subject = useLiveQuery(() => db.subjects.get(Number(subjectId)));

    const questions = useLiveQuery(() => {
        if (!subjectId) return [];
        return db.questions.where('subjectId').equals(Number(subjectId)).toArray();
    }, [subjectId]) || [];

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                filterStatus === 'all' ? true :
                    filterStatus === 'mastered' ? q.status === 1 :
                        filterStatus === 'learning' ? q.status === 2 :
                            q.status === 0 || q.status === undefined;
            return matchesSearch && matchesStatus;
        });
    }, [questions, searchQuery, filterStatus]);

    // Reset index when filter changes or when index out of bounds
    const safeIndex = filteredQuestions.length > 0
        ? Math.min(currentIndex, filteredQuestions.length - 1)
        : 0;

    const currentQ = filteredQuestions[safeIndex];

    // Handle delete: after deletion, adjust index
    const handleDelete = async () => {
        if (!currentQ) return;
        if (confirm('Xóa câu hỏi này?')) {
            await db.questions.delete(currentQ.id!);
            if (safeIndex >= filteredQuestions.length - 1 && safeIndex > 0) {
                setCurrentIndex(safeIndex - 1);
            }
        }
    };

    // Handle import
    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && subjectId) {
                try {
                    await importQuestionsFromJsonFile(file, Number(subjectId));
                    alert('Import thành công!');
                } catch (err) {
                    console.error(err);
                    alert('Lỗi import');
                }
            }
        };
        input.click();
    };

    // Handle export
    const handleExport = async () => {
        if (!subject) return;
        try {
            const zip = new JSZip();
            const metadata = {
                version: "1.0",
                subjects: [{
                    id: subject.id,
                    name: subject.name,
                    parentId: subject.parentId,
                    level: subject.level,
                    type: subject.type,
                    examTerm: subject.examTerm
                }]
            };
            zip.file("metadata.json", JSON.stringify(metadata, null, 2));

            const imgFolder = zip.folder("images");
            const processedQuestions = await Promise.all(filteredQuestions.map(async (q) => {
                const qClone = { ...q };
                if (q.image && q.image.startsWith('data:image')) {
                    const filename = `img_q_${q.id}.png`;
                    const base64Data = q.image.split(',')[1];
                    imgFolder?.file(filename, base64Data, { base64: true });
                    qClone.image = `images/${filename}`;
                }
                if (q.optionImages && q.optionImages.some(img => img)) {
                    qClone.optionImages = await Promise.all(q.optionImages.map(async (img, idx) => {
                        if (img && img.startsWith('data:image')) {
                            const filename = `img_q_${q.id}_opt_${idx}.png`;
                            const base64Data = img.split(',')[1];
                            imgFolder?.file(filename, base64Data, { base64: true });
                            return `images/${filename}`;
                        }
                        return img;
                    }));
                }
                return qClone;
            }));

            zip.file("questions.json", JSON.stringify(processedQuestions, null, 2));
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${subject.name}_export.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Lỗi xuất dữ liệu (ZIP)');
        }
    };

    if (!subject) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50/90 dark:bg-zinc-950/90">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-3 py-2 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="font-bold text-sm line-clamp-1">{subject.name}</h1>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Ngân hàng · {filteredQuestions.length} câu</p>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={handleImport} className="p-1.5 text-gray-400 hover:text-primary transition-colors" title="Nhập (JSON)">
                        <Upload size={18} />
                    </button>
                    <button onClick={handleExport} className="p-1.5 text-gray-400 hover:text-primary transition-colors" title="Xuất (ZIP)">
                        <FileDown size={18} />
                    </button>
                    <button onClick={() => navigate('/create', { state: { subjectId: subject.id } })} className="p-1.5 text-primary hover:text-primary/80 transition-colors" title="Tạo câu hỏi">
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-3 py-1.5 space-y-1.5 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Tìm câu hỏi..."
                        className="w-full p-2 pl-9 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 text-xs outline-none focus:ring-2 ring-primary/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                    />
                </div>
                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
                    {([
                        { key: 'all', label: 'Tất cả' },
                        { key: 'mastered', label: 'Đã thuộc' },
                        { key: 'learning', label: 'Đang học' },
                        { key: 'new', label: 'Mới' },
                    ] as const).map(f => (
                        <button
                            key={f.key}
                            onClick={() => { setFilterStatus(f.key); setCurrentIndex(0); }}
                            className={`flex-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${filterStatus === f.key ? 'bg-white dark:bg-zinc-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
                {filteredQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                        <Search size={48} className="opacity-30" />
                        <p className="font-bold">Không tìm thấy câu hỏi nào</p>
                    </div>
                ) : currentQ && (
                    <div className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300" key={currentQ.id}>
                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            {/* Top bar: position + edit/delete */}
                            <div className="flex justify-between items-center mb-2">
                                <div className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-[10px] font-bold text-gray-500">
                                    Câu {safeIndex + 1}/{filteredQuestions.length}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => navigate(`/edit/${currentQ.id}`)}
                                        className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
                                        title="Sửa câu hỏi"
                                    >
                                        <Edit size={12} />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-7 h-7 flex items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                                        title="Xóa câu hỏi"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Question content via QuestionView (read-only, showResult=true) */}
                            <QuestionView
                                question={currentQ}
                                selectedAnswer={null}
                                selectedSubAnswers={[]}
                                showResult={true}
                                onAnswer={() => { }}
                                onSubAnswer={() => { }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            {filteredQuestions.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 px-3 py-2 flex items-center justify-between z-10">
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, safeIndex - 1))}
                        disabled={safeIndex === 0}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-all"
                    >
                        <ChevronLeft size={18} /> Trước
                    </button>
                    <span className="text-[10px] font-bold text-gray-400">{safeIndex + 1} / {filteredQuestions.length}</span>
                    <button
                        onClick={() => setCurrentIndex(Math.min(filteredQuestions.length - 1, safeIndex + 1))}
                        disabled={safeIndex === filteredQuestions.length - 1}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm bg-primary text-white shadow-md shadow-primary/30 disabled:opacity-50 transition-all active:scale-95"
                    >
                        Sau <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};
