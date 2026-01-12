import React, { useState, useRef } from 'react';
import { X, Upload, FileJson, FileText, Archive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ImportService } from '../services/ImportService';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('loading');
        try {
            let result = '';
            const extension = file.name.split('.').pop()?.toLowerCase();

            if (extension === 'zip') {
                result = await ImportService.importFromZip(file, null);
            } else if (extension === 'json') {
                if (selectedSubjectId === null) throw new Error('Vui lòng chọn bộ đề trước khi import JSON/Excel/Docx');
                result = await ImportService.importFromJson(file, selectedSubjectId);
            } else if (extension === 'xlsx' || extension === 'xls') {
                if (selectedSubjectId === null) throw new Error('Vui lòng chọn bộ đề trước khi import JSON/Excel/Docx');
                result = await ImportService.importFromExcel(file, selectedSubjectId);
            } else if (extension === 'docx') {
                if (selectedSubjectId === null) throw new Error('Vui lòng chọn bộ đề trước khi import JSON/Excel/Docx');
                result = await ImportService.importFromDocx(file, selectedSubjectId);
            } else {
                throw new Error('Định dạng file không được hỗ trợ');
            }

            setStatus('success');
            setMessage(result);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold italic">Import Dữ Liệu</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {status === 'idle' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold px-1">Chọn bộ đề mục tiêu (nếu không phải ZIP)</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 ring-primary/20 outline-none appearance-none"
                                    value={selectedSubjectId || ''}
                                    onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                                >
                                    <option value="">-- Chọn bộ đề --</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="group border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-[2rem] p-10 flex flex-col items-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold">Nhấn để tải file lên</p>
                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">ZIP, JSON, Excel, Docx</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".zip,.json,.xlsx,.xls,.docx"
                                onChange={handleFileChange}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <FileIcon type="ZIP" icon={<Archive size={16} />} color="text-orange-500" />
                                <FileIcon type="JSON" icon={<FileJson size={16} />} color="text-yellow-500" />
                                <FileIcon type="EXCEL" icon={<FileText size={16} />} color="text-emerald-500" />
                            </div>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="py-12 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-primary" size={48} />
                            <p className="font-semibold animate-pulse">Đang xử lý dữ liệu...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-8 flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold">Hoàn tất!</h4>
                                <p className="text-gray-500 mt-2">{message}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full mt-4 p-4 rounded-2xl bg-gray-100 dark:bg-zinc-800 font-bold hover:bg-gray-200 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-8 flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                                <AlertCircle size={48} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-red-500">Thất bại</h4>
                                <p className="text-gray-500 mt-2">{message}</p>
                            </div>
                            <button
                                onClick={() => setStatus('idle')}
                                className="w-full mt-4 p-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FileIcon = ({ type, icon, color }: any) => (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/50">
        <div className={cn("p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm", color)}>
            {icon}
        </div>
        <span className="text-[10px] font-bold opacity-50">{type}</span>
    </div>
);
