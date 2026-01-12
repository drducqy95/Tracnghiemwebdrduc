import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { ExamConfig } from '../db';
import { ChevronLeft, Plus, Trash2, Save, X } from 'lucide-react';

export const ManageExamsScreen: React.FC = () => {
    const navigate = useNavigate();
    const configs = useLiveQuery(() => db.examConfigs.toArray()) || [];
    const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

    // UI State
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [form, setForm] = useState<ExamConfig>({
        name: '',
        examTerm: 'Thi hết môn',
        level: 'Đại học',
        subjects: []
    });

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');

    const handleSave = async () => {
        if (!form.name || form.subjects.length === 0) return alert('Vui lòng nhập tên và chọn ít nhất 1 môn');

        if (form.id) {
            await db.examConfigs.put(form);
        } else {
            await db.examConfigs.add(form);
        }
        setIsEditing(false);
        resetForm();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Xóa kỳ thi này?')) {
            await db.examConfigs.delete(id);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            examTerm: 'Thi hết môn',
            level: 'Đại học',
            subjects: []
        });
    };

    const addSubject = () => {
        if (!selectedSubjectId) return;
        const sub = subjects.find(s => s.id === Number(selectedSubjectId));
        if (!sub) return;

        if (form.subjects.find(s => s.subjectId === sub.id)) return;

        setForm(prev => ({
            ...prev,
            subjects: [...prev.subjects, {
                subjectId: sub.id!,
                subjectName: sub.name,
                count: 40,
                time: 45
            }]
        }));
        setSelectedSubjectId('');
    };

    const removeSubject = (sid: number) => {
        setForm(prev => ({
            ...prev,
            subjects: prev.subjects.filter(s => s.subjectId !== sid)
        }));
    };

    const updateSubjectConfig = (sid: number, field: 'count' | 'time', val: number) => {
        setForm(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => s.subjectId === sid ? { ...s, [field]: val } : s)
        }));
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-950 pb-20">
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold">Quản lý Kỳ thi</h2>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {isEditing ? (
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-lg border border-primary/20 space-y-6 animate-in zoom-in-95">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Tên kỳ thi</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full py-2 border-b border-gray-200 dark:border-zinc-800 bg-transparent text-xl font-bold outline-none focus:border-primary"
                                    placeholder="Nhập tên..."
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Loại thi</label>
                                    <select
                                        value={form.examTerm}
                                        onChange={e => setForm({ ...form, examTerm: e.target.value })}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl text-sm font-bold outline-none"
                                    >
                                        <option>Thi hết môn</option>
                                        <option>Thi đầu vào</option>
                                        <option>Thi tốt nghiệp</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Cấp độ</label>
                                    <select
                                        value={form.level}
                                        onChange={e => setForm({ ...form, level: e.target.value })}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl text-sm font-bold outline-none"
                                    >
                                        <option>Đại học</option>
                                        <option>Sau đại học</option>
                                        <option>Chuyên khoa 1</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase">Danh sách môn thi</label>

                            {form.subjects.map(sub => (
                                <div key={sub.subjectId} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{sub.subjectName}</span>
                                        <button onClick={() => removeSubject(sub.subjectId)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Số câu</span>
                                            <input
                                                type="number"
                                                value={sub.count}
                                                onChange={e => updateSubjectConfig(sub.subjectId, 'count', Number(e.target.value))}
                                                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border font-bold text-center"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Phút</span>
                                            <input
                                                type="number"
                                                value={sub.time}
                                                onChange={e => updateSubjectConfig(sub.subjectId, 'time', Number(e.target.value))}
                                                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border font-bold text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex gap-2">
                                <select
                                    value={selectedSubjectId}
                                    onChange={e => setSelectedSubjectId(Number(e.target.value))}
                                    className="flex-1 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl font-bold text-sm outline-none"
                                >
                                    <option value="">+ Chọn môn học</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button
                                    onClick={addSubject}
                                    disabled={!selectedSubjectId}
                                    className="px-4 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    Thêm
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                            <button
                                onClick={() => { setIsEditing(false); resetForm(); }}
                                className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 text-gray-500 font-bold rounded-2xl"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20"
                            >
                                Lưu Kỳ Thi
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full py-4 bg-white dark:bg-zinc-900 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-3xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all"
                        >
                            <Plus size={20} /> Tạo kỳ thi mới
                        </button>

                        <div className="space-y-3">
                            {configs.map(config => (
                                <div key={config.id} className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{config.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-full font-bold text-gray-500">{config.subjects.length} môn</span>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-full font-bold text-blue-500">{config.examTerm}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setForm(config); setIsEditing(true); }}
                                                className="p-2 bg-gray-50 dark:bg-zinc-800 text-blue-500 rounded-full"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(config.id!)}
                                                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {config.subjects.slice(0, 4).map(s => (
                                            <div key={s.subjectId} className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                <span className="truncate">{s.subjectName}</span>
                                            </div>
                                        ))}
                                        {config.subjects.length > 4 && <span className="text-xs text-gray-400 italic">+{config.subjects.length - 4} môn khác</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
