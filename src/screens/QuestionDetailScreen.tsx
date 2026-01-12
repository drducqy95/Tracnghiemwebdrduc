import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, Plus, Search, Trash2, Edit, FileDown, Upload } from 'lucide-react';
import { importQuestionsFromJsonFile } from '../services/ImportService';
import JSZip from 'jszip';

export const QuestionDetailScreen: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'learning' | 'new'>('all');

    const subject = useLiveQuery(() => db.subjects.get(Number(subjectId)));

    const questions = useLiveQuery(() => {
        if (!subjectId) return [];
        let collection = db.questions.where('subjectId').equals(Number(subjectId));
        return collection.toArray();
    }, [subjectId]) || [];

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            filterStatus === 'all' ? true :
                filterStatus === 'mastered' ? q.status === 1 :
                    filterStatus === 'learning' ? q.status === 2 :
                        q.status === 0 || q.status === undefined;
        return matchesSearch && matchesStatus;
    });

    if (!subject) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-bold line-clamp-1">{subject.name}</h2>
                    <p className="text-xs text-gray-400">{questions.length} câu hỏi</p>
                </div>
                {/* Import Button */}
                <button
                    onClick={() => {
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
                    }}
                    className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 rounded-xl font-bold"
                    title="Nhập câu hỏi (JSON)"
                >
                    <Upload size={20} />
                </button>
                {/* Export Button */}
                <button
                    onClick={async () => {
                        try {
                            const zip = new JSZip();

                            // 1. Metadata
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

                            // 2. Images Setup
                            const imgFolder = zip.folder("images");
                            const processedQuestions = await Promise.all(filteredQuestions.map(async (q) => {
                                const qClone = { ...q };

                                // Process Main Image
                                if (q.image && q.image.startsWith('data:image')) {
                                    const filename = `img_q_${q.id}.png`; // Assuming png for base64 simplicity or detect mime
                                    const base64Data = q.image.split(',')[1];
                                    imgFolder?.file(filename, base64Data, { base64: true });
                                    qClone.image = `images/${filename}`;
                                }

                                // Process Option Images
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

                            // 3. Questions JSON
                            zip.file("questions.json", JSON.stringify(processedQuestions, null, 2));

                            // 4. Generate & Download
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
                    }}
                    className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-600 rounded-xl font-bold"
                    title="Xuất câu hỏi (ZIP)"
                >
                    <FileDown size={20} />
                </button>
                <button
                    onClick={() => navigate('/create', { state: { subjectId: subject.id } })}
                    className="p-2 bg-primary/10 text-primary rounded-xl font-bold"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Tìm câu hỏi..."
                        className="w-full p-3 pl-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm outline-none focus:ring-2 ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-xl p-1">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        Tất cả
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6">
                {filteredQuestions.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        Không tìm thấy câu hỏi nào
                    </div>
                ) : (
                    filteredQuestions.map((q, index) => {
                        const correctLetters = q.correctAnswers || [];

                        return (
                            <div key={q.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                                {/* Top Badges */}
                                <div className="flex justify-between items-center">
                                    <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 text-xs font-bold px-4 py-1.5 rounded-full uppercase">
                                        Câu {index + 1}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 text-xs font-bold px-4 py-1.5 rounded-full uppercase">
                                            Đáp án: {correctLetters.join(', ')}
                                        </span>
                                        <button
                                            onClick={() => navigate(`/edit/${q.id}`)}
                                            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Xóa câu hỏi này?')) {
                                                    db.questions.delete(q.id!);
                                                }
                                            }}
                                            className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-relaxed">
                                        {q.content}
                                    </h3>
                                    {q.image && (
                                        <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                                            <img src={q.image} alt="Question" className="w-full h-auto object-contain max-h-60 bg-gray-50" />
                                        </div>
                                    )}
                                </div>

                                {/* Answers based on Type */}
                                <div className="space-y-2">
                                    {q.questionType === 'TRUE_FALSE_TABLE' ? (
                                        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 dark:bg-zinc-800 text-xs uppercase font-bold text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-3">Ý</th>
                                                        <th className="px-4 py-3 text-center w-20">Đúng</th>
                                                        <th className="px-4 py-3 text-center w-20">Sai</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                                    {q.subQuestions?.map((subQ, i) => {
                                                        const isTrue = q.subAnswers?.[i] === true;
                                                        return (
                                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                                                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{subQ}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {isTrue && <div className="w-4 h-4 rounded-full bg-green-500 mx-auto" />}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {!isTrue && <div className="w-4 h-4 rounded-full bg-green-500 mx-auto" />}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        // MULTIPLE_CHOICE or TRUE_FALSE (Standard Option List)
                                        q.options.map((opt, i) => {
                                            const letter = String.fromCharCode(65 + i);
                                            // Handle True/False where options might be just 2, or specific naming
                                            // Ideally Correct Answer logic holds.
                                            let isCorrect = correctLetters.includes(letter);

                                            // If TRUE_FALSE, usually A=True, B=False, logic holds if correctAnswers=['A']

                                            return (
                                                <div
                                                    key={i}
                                                    className={`p-4 rounded-xl flex items-start gap-3 border transition-colors ${isCorrect
                                                        ? 'bg-green-50 dark:bg-green-900/10 border-green-500 text-green-900 dark:text-green-100'
                                                        : 'bg-gray-50 dark:bg-zinc-800/50 border-transparent text-gray-600 dark:text-gray-300'
                                                        }`}
                                                >
                                                    <span className={`font-bold min-w-[1.5rem] ${isCorrect ? 'text-green-600' : 'text-gray-500'}`}>{letter}.</span>
                                                    <div className="flex-1 space-y-2">
                                                        <span className={isCorrect ? 'font-medium' : ''}>{opt}</span>
                                                        {q.optionImages && q.optionImages[i] && (
                                                            <div className="rounded-lg overflow-hidden border border-black/5 mt-1 w-fit">
                                                                <img src={q.optionImages[i]!} alt={`Option ${letter}`} className="h-24 w-auto object-contain bg-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
