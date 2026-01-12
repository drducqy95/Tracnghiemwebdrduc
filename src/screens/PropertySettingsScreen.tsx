import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { PropertyOption } from '../db';
import { ArrowLeft, Plus, Edit2, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';

export const PropertySettingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'term' | 'level' | 'type'>('term');
    const [showDialog, setShowDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<PropertyOption | null>(null);
    const [inputText, setInputText] = useState('');

    const options = useLiveQuery(
        () => db.propertyOptions.where('type').equals(activeTab).toArray(),
        [activeTab]
    );

    const tabs = [
        { id: 'term', label: 'Kỳ thi' },
        { id: 'level', label: 'Cấp độ' },
        { id: 'type', label: 'Loại môn' },
    ];

    const handleDelete = async (id: number) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa?')) {
            await db.propertyOptions.delete(id);
        }
    };

    const handleSave = async () => {
        if (!inputText.trim()) return;

        if (editingItem && editingItem.id) {
            await db.propertyOptions.update(editingItem.id, { name: inputText });
        } else {
            await db.propertyOptions.add({
                name: inputText,
                type: activeTab
            });
        }
        setShowDialog(false);
        setInputText('');
        setEditingItem(null);
    };

    const openAdd = () => {
        setEditingItem(null);
        setInputText('');
        setShowDialog(true);
    };

    const openEdit = (item: PropertyOption) => {
        setEditingItem(item);
        setInputText(item.name);
        setShowDialog(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Quản lý thuộc tính
                </h1>
            </div>

            <div className="p-4 max-w-lg mx-auto">
                {/* Tabs */}
                <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                                activeTab === tab.id
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-3">
                    {options?.map((item) => (
                        <div key={item.id} className="group bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                            <span className="font-bold text-gray-700 dark:text-gray-200">{item.name}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(item.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {options?.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>
            </div>

            {/* FAB */}
            <button
                onClick={openAdd}
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
            >
                <Plus size={28} />
            </button>

            {/* Dialog */}
            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">{editingItem ? 'Sửa thuộc tính' : 'Thêm mới'}</h3>
                            <button onClick={() => setShowDialog(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <input
                            type="text"
                            autoFocus
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Nhập tên..."
                            className="w-full p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none outline-none font-bold mb-6 focus:ring-2 ring-primary/20"
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />

                        <button
                            onClick={handleSave}
                            disabled={!inputText.trim()}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
