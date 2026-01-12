import React, { useState, useRef } from 'react';
import { db } from '../db';
import type { QuestionType } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Plus, Trash2, Image as ImageIcon, Upload, FileSpreadsheet, FileJson, FileType } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { importQuestionsFromJsonFile, importQuestionsFromExcel, importQuestionsFromDocx, importQuestionsFromZip } from '../services/ImportService';

type TabIndex = 0 | 1 | 2;
const Q_TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'TRUE_FALSE_TABLE'];

interface ImagePickerProps {
    label: string;
    image: string | null;
    onSet: (val: string | null) => void;
    compact?: boolean;
}

interface FileButtonProps {
    label: string;
    icon: React.ElementType;
    accept: string;
    onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CreateQuestionScreen: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabIndex>(0); // 0: Question, 1: Subject, 2: Import

    // --- DATA ---
    const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
    const rootSubjects = subjects.filter(s => s.parentId === null);

    // --- TAB 0: ADD QUESTION STATE ---
    const [qType, setQType] = useState<QuestionType>('MULTIPLE_CHOICE');
    const [subjectId, setSubjectId] = useState<number>(0);
    const [content, setContent] = useState('');
    const [explanation, setExplanation] = useState('');

    // Images
    const [qImage, setQImage] = useState<string | null>(null);
    const [explImage, setExplImage] = useState<string | null>(null);

    // MCQ
    const [options, setOptions] = useState(['', '', '', '']);
    const [optionImages, setOptionImages] = useState<(string | null)[]>([null, null, null, null]);
    const [correctAnswers, setCorrectAnswers] = useState<string[]>(['A']);

    // T/F
    const [tfAnswer, setTfAnswer] = useState(true);

    // T/F Table
    const [subQuestions, setSubQuestions] = useState(['', '']);
    const [subAnswers, setSubAnswers] = useState([true, true]);

    // --- TAB 1: ADD SUBJECT STATE ---
    const [newSubjectName, setNewSubjectName] = useState('');
    const [parentId, setParentId] = useState<number | null>(null); // null = Root
    const [examTerm, setExamTerm] = useState('CK1');
    const [level, setLevel] = useState('Đại học');
    const [subjType, setSubjType] = useState('Cơ sở');

    // --- TAB 2: IMPORT STATE ---
    const [importTargetId, setImportTargetId] = useState<number>(-1); // -1 = Auto
    const [importStatus, setImportStatus] = useState('');

    // --- HANDLERS ---

    const handleSaveQuestion = async () => {
        if (!content || !subjectId) {
            alert('Vui lòng nhập nội dung và chọn bộ đề');
            return;
        }

        const finalOptions = qType === 'MULTIPLE_CHOICE' ? options : [];
        const finalOptionImages = qType === 'MULTIPLE_CHOICE' ? optionImages : [];

        await db.questions.add({
            subjectId,
            content,
            questionType: qType,
            options: finalOptions,
            optionImages: finalOptionImages,
            subQuestions: qType === 'TRUE_FALSE_TABLE' ? subQuestions : [],
            subAnswers: qType === 'TRUE_FALSE_TABLE' ? subAnswers : [],
            correctAnswers: qType === 'TRUE_FALSE'
                ? [tfAnswer ? 'TRUE' : 'FALSE']
                : (qType === 'MULTIPLE_CHOICE' ? correctAnswers : []),
            explanation: explanation || null,
            image: qImage,
            explanationImage: explImage,
            status: 0,
            createdAt: Date.now(),
            selectedAnswer: null,
            selectedSubAnswers: []
        });

        alert('Đã lưu câu hỏi!');
        // Reset specific fields
        setContent('');
        setExplanation('');
        setQImage(null);
        setExplImage(null);
        // Keep subjectId for convenience
    };

    const handleSaveSubject = async () => {
        if (!newSubjectName) return;

        await db.subjects.add({
            name: newSubjectName,
            parentId: parentId,
            examTerm,
            level,
            type: subjType,
            createdAt: Date.now()
        });

        alert(`Đã thêm môn: ${newSubjectName}`);
        setNewSubjectName('');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'excel' | 'docx' | 'zip') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('Đang xử lý...');
        try {
            if (type === 'json') await importQuestionsFromJsonFile(file, importTargetId);
            if (type === 'excel') await importQuestionsFromExcel(file, importTargetId);
            if (type === 'docx') await importQuestionsFromDocx(file, importTargetId);
            if (type === 'zip') await importQuestionsFromZip(file, importTargetId);
            setImportStatus(`Thành công! Đã import từ ${file.name}`);
        } catch (err) {
            console.error(err);
            setImportStatus('Lỗi: ' + (err as Error).message);
        }
    };

    // --- RENDERERS ---

    const renderOptionLetter = (idx: number) => String.fromCharCode(65 + idx);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-bold italic">Thêm Dữ Liệu</h2>
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                    <X size={24} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl mx-2">
                {['Thêm Câu Hỏi', 'Thêm Môn', 'Import File'].map((label, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(idx as TabIndex)}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === idx ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-gray-400'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800 min-h-[60vh]">

                {/* --- TAB 0: QUESTION --- */}
                {activeTab === 0 && (
                    <div className="space-y-6">
                        {/* Subject Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Môn học</label>
                            <select
                                value={subjectId}
                                onChange={e => setSubjectId(Number(e.target.value))}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none font-medium"
                            >
                                <option value={0}>-- Chọn môn --</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Type Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Loại câu hỏi</label>
                            <div className="flex gap-2">
                                {Q_TYPES.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setQType(t)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${qType === t ? 'border-primary text-primary bg-primary/5' : 'border-transparent bg-gray-50 dark:bg-zinc-800 text-gray-500'}`}
                                    >
                                        {t.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content & Image */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Nội dung</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 outline-none min-h-[100px]"
                                placeholder="Nhập câu hỏi..."
                            />
                            <ImagePicker label="Ảnh câu hỏi" image={qImage} onSet={setQImage} />
                        </div>

                        {/* Options Logic */}
                        {qType === 'MULTIPLE_CHOICE' && (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-400 uppercase flex justify-between">
                                    Đáp án (Check để chọn đúng)
                                    <button onClick={() => {
                                        setOptions([...options, '']);
                                        setOptionImages([...optionImages, null]);
                                    }} className="text-primary"><Plus size={16} /></button>
                                </label>
                                {options.map((opt, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="checkbox"
                                                checked={correctAnswers.includes(renderOptionLetter(idx))}
                                                onChange={e => {
                                                    const letter = renderOptionLetter(idx);
                                                    if (e.target.checked) setCorrectAnswers([...correctAnswers, letter]);
                                                    else setCorrectAnswers(correctAnswers.filter(c => c !== letter));
                                                }}
                                                className="w-5 h-5 accent-primary"
                                            />
                                            <span className="font-bold w-6">{renderOptionLetter(idx)}.</span>
                                            <input
                                                value={opt}
                                                onChange={e => {
                                                    const n = [...options]; n[idx] = e.target.value; setOptions(n);
                                                }}
                                                className="flex-1 bg-transparent outline-none border-b border-gray-200 dark:border-zinc-700"
                                                placeholder={`Nội dung đáp án ${renderOptionLetter(idx)}`}
                                            />
                                            <button onClick={() => {
                                                const nOpt = options.filter((_, i) => i !== idx);
                                                const nImg = optionImages.filter((_, i) => i !== idx);
                                                setOptions(nOpt);
                                                setOptionImages(nImg);
                                            }} className="text-red-400"><Trash2 size={16} /></button>
                                        </div>
                                        <ImagePicker label={`Ảnh ${renderOptionLetter(idx)}`} image={optionImages[idx]} onSet={val => {
                                            const n = [...optionImages]; n[idx] = val; setOptionImages(n);
                                        }} compact />
                                    </div>
                                ))}
                            </div>
                        )}

                        {qType === 'TRUE_FALSE' && (
                            <div className="flex gap-4">
                                <button onClick={() => setTfAnswer(true)} className={`flex-1 p-4 rounded-xl border-2 font-bold ${tfAnswer ? 'border-primary text-primary' : 'border-gray-100'}`}>ĐÚNG</button>
                                <button onClick={() => setTfAnswer(false)} className={`flex-1 p-4 rounded-xl border-2 font-bold ${!tfAnswer ? 'border-primary text-primary' : 'border-gray-100'}`}>SAI</button>
                            </div>
                        )}

                        {qType === 'TRUE_FALSE_TABLE' && (
                            <div className="space-y-4">
                                {subQuestions.map((sq, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            value={sq}
                                            onChange={e => { const n = [...subQuestions]; n[idx] = e.target.value; setSubQuestions(n); }}
                                            className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none"
                                            placeholder={`Mệnh đề ${idx + 1}`}
                                        />
                                        <button
                                            onClick={() => { const n = [...subAnswers]; n[idx] = !n[idx]; setSubAnswers(n); }}
                                            className={`w-12 h-12 rounded-xl font-bold ${subAnswers[idx] ? 'bg-primary text-white' : 'bg-red-500 text-white'}`}
                                        >
                                            {subAnswers[idx] ? 'Đ' : 'S'}
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => { setSubQuestions([...subQuestions, '']); setSubAnswers([...subAnswers, true]); }} className="text-primary text-sm font-bold flex items-center gap-1">
                                    <Plus size={16} /> Thêm mệnh đề
                                </button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Giải thích</label>
                            <textarea
                                value={explanation}
                                onChange={e => setExplanation(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 outline-none"
                                placeholder="Giải thích đáp án..."
                            />
                            <ImagePicker label="Ảnh giải thích" image={explImage} onSet={setExplImage} />
                        </div>

                        <button onClick={handleSaveQuestion} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30">Lưu Câu Hỏi</button>
                    </div>
                )}

                {/* --- TAB 1: SUBJECT --- */}
                {activeTab === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Tên môn học</label>
                            <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Thuộc bộ đề gốc (Cha)</label>
                            <select
                                value={parentId ?? -1}
                                onChange={e => { const v = Number(e.target.value); setParentId(v === -1 ? null : v); }}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none"
                            >
                                <option value={-1}>Không (Bộ đề gốc)</option>
                                {rootSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Kỳ thi</label>
                                <select value={examTerm} onChange={e => setExamTerm(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none">
                                    {['CK1', 'CK2', 'GK1', 'GK2', 'Khác'].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Trình độ</label>
                                <select value={level} onChange={e => setLevel(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none">
                                    {['Đại học', 'Sau đại học', 'CK1', 'CK2'].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Phân loại</label>
                                <select value={subjType} onChange={e => setSubjType(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none">
                                    {['Cơ sở', 'Chuyên ngành'].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={handleSaveSubject} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30">Thêm Môn Học</button>
                    </div>
                )}

                {/* --- TAB 2: IMPORT --- */}
                {activeTab === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Import vào môn</label>
                            <select
                                value={importTargetId}
                                onChange={e => setImportTargetId(Number(e.target.value))}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none"
                            >
                                <option value={-1}>Tự động (Theo nội dung file)</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FileButton label="JSON" icon={FileJson} accept=".json" onSelect={e => handleImport(e, 'json')} />
                            <FileButton label="Excel" icon={FileSpreadsheet} accept=".xlsx, .xls" onSelect={e => handleImport(e, 'excel')} />
                            <FileButton label="Word" icon={FileType} accept=".docx" onSelect={e => handleImport(e, 'docx')} />
                            <FileButton label="ZIP" icon={Upload} accept=".zip" onSelect={e => handleImport(e, 'zip')} />
                        </div>

                        {importStatus && (
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold text-center">
                                {importStatus}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const ImagePicker = ({ label, image, onSet, compact }: ImagePickerProps) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className={`flex items-center gap-3 ${compact ? '' : 'p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl'}`}>
            <div
                className={`flex items-center justify-center bg-gray-200 dark:bg-zinc-700 rounded-lg cursor-pointer overflow-hidden ${compact ? 'w-10 h-10' : 'w-16 h-16'}`}
                onClick={() => ref.current?.click()}
            >
                {image ? (
                    <img src={image} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                    <ImageIcon size={compact ? 16 : 24} className="text-gray-400" />
                )}
            </div>
            {!compact && <span className="text-sm font-bold text-gray-500">{label}</span>}
            {image && <button onClick={() => onSet(null)} className="text-xs text-red-500 font-bold ml-auto">Xóa</button>}
            <input type="file" ref={ref} className="hidden" accept="image/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => onSet(reader.result as string);
                    reader.readAsDataURL(file);
                }
            }} />
        </div>
    )
}

const FileButton = ({ label, icon: Icon, accept, onSelect }: FileButtonProps) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <button onClick={() => ref.current?.click()} className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-50 dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-primary hover:bg-primary/5 transition-all">
            <Icon size={24} className="text-gray-500" />
            <span className="font-bold text-gray-600 dark:text-gray-300">{label}</span>
            <input type="file" ref={ref} className="hidden" accept={accept} onChange={onSelect} />
        </button>
    )
}
