import React, { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../store';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Type, Palette, Trash2, Info, ChevronRight, Goal, Target, User, Clock, Camera, Plus, FileDown, FileUp, Settings as SettingsIcon, Image as ImageIcon, Layers, BookOpen } from 'lucide-react';
import { db } from '../db';
import type { UserProfile, Reminder } from '../db';
import { useNavigate } from 'react-router-dom';
import { ImportService } from '../services/ImportService';

export const SettingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const {
        darkMode, toggleDarkMode,
        fontScale, setFontScale,
        fontFamily, setFontFamily,
        primaryColor, setPrimaryColor,
        shuffleQuestions, setShuffleQuestions,
        shuffleAnswers, setShuffleAnswers,
        showExplanation, setShowExplanation,
        triggerBackgroundUpdate
    } = useSettingsStore();

    // Data Loaders
    const userProfile = useLiveQuery(async () => {
        const profile = await db.userProfile.toCollection().first();
        return profile || { fullName: '', gender: 'Nam', birthYear: 2000, educationLevel: 'Đại học' };
    });

    const reminders = useLiveQuery(() => db.reminders.toArray()) || [];

    // Local State
    const [editedProfile, setEditedProfile] = useState<UserProfile>({ fullName: '', gender: 'Nam', birthYear: 2000, educationLevel: 'Đại học' });
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [newReminder, setNewReminder] = useState<Partial<Reminder>>({ title: '', message: '', time: '08:00', days: [], isActive: true });

    // File Inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile) {
            setEditedProfile({ ...userProfile });
        }
    }, [userProfile]);

    const handleSaveProfile = async () => {
        if (userProfile?.id) {
            await db.userProfile.update(userProfile.id, editedProfile);
        } else {
            await db.userProfile.add(editedProfile);
        }
        alert('Đã lưu thông tin!');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditedProfile({ ...editedProfile, avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Save Blob to DB
                await db.appAssets.put({ id: 'background', data: file });
                triggerBackgroundUpdate();
                alert('Đã cập nhật hình nền!');
            } catch (error) {
                console.error('Failed to save background', error);
                alert('Lỗi lưu hình nền');
            }
        }
    };

    const removeBackground = async () => {
        await db.appAssets.delete('background');
        triggerBackgroundUpdate();
        alert('Đã xóa hình nền!');
    };

    const handleExportData = async () => {
        try {
            const data = {
                subjects: await db.subjects.toArray(),
                questions: await db.questions.toArray(),
                examConfigs: await db.examConfigs.toArray(),
                examResults: await db.examResults.toArray(),
                userProfile: await db.userProfile.toArray(),
                reminders: await db.reminders.toArray(),
                propertyOptions: await db.propertyOptions.toArray(),
                timestamp: Date.now()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `onthi_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Lỗi xuất dữ liệu!');
        }
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('Dữ liệu hiện tại sẽ bị ghi đè! Bạn có chắc chắn?')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);

                await db.transaction('rw', [db.subjects, db.questions, db.examConfigs, db.examResults, db.userProfile, db.reminders, db.propertyOptions], async () => {
                    await db.subjects.clear();
                    await db.questions.clear();
                    await db.examConfigs.clear();
                    await db.examResults.clear();
                    await db.userProfile.clear();
                    await db.reminders.clear();
                    await db.propertyOptions.clear();

                    if (data.subjects) await db.subjects.bulkAdd(data.subjects);
                    if (data.questions) await db.questions.bulkAdd(data.questions);
                    if (data.examConfigs) await db.examConfigs.bulkAdd(data.examConfigs);
                    if (data.examResults) await db.examResults.bulkAdd(data.examResults);
                    if (data.userProfile) await db.userProfile.bulkAdd(data.userProfile);
                    if (data.reminders) await db.reminders.bulkAdd(data.reminders);
                    if (data.propertyOptions) await db.propertyOptions.bulkAdd(data.propertyOptions);
                });

                alert('Khôi phục dữ liệu thành công!');
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert('File không hợp lệ hoặc lỗi nhập dữ liệu!');
            }
        };
        reader.readAsText(file);
    };

    const resetAllData = async () => {
        if (confirm('CẢNH BÁO: Hành động này sẽ xóa TOÀN BỘ dữ liệu học tập và câu hỏi. Bạn có chắc chắn?')) {
            await db.delete();
            window.location.reload();
        }
    };

    const colors = ['#1565C0', '#2E7D32', '#C62828', '#6A1B9A', '#EF6C00', '#37474F'];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <h2 className="text-2xl font-bold italic px-2">Cài Đặt</h2>

            {/* Profile Section */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Thông tin cá nhân</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-lg">
                                {editedProfile.avatar ? (
                                    <img src={editedProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={32} />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer shadow-md hover:scale-110 transition-transform">
                                <Camera size={14} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                        <div className="flex-1 space-y-3">
                            <input
                                type="text"
                                value={editedProfile.fullName}
                                onChange={e => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                                placeholder="Nhập họ tên"
                                className="w-full bg-transparent text-xl font-bold border-b border-transparent focus:border-primary outline-none transition-colors placeholder:text-gray-300"
                            />
                            <div className="flex gap-2">
                                <select
                                    value={editedProfile.gender}
                                    onChange={e => setEditedProfile({ ...editedProfile, gender: e.target.value })}
                                    className="bg-gray-50 dark:bg-zinc-800 rounded-lg px-2 py-1 text-sm outline-none"
                                >
                                    <option>Nam</option>
                                    <option>Nữ</option>
                                </select>
                                <input
                                    type="number"
                                    value={editedProfile.birthYear}
                                    onChange={e => setEditedProfile({ ...editedProfile, birthYear: parseInt(e.target.value) })}
                                    className="bg-gray-50 dark:bg-zinc-800 rounded-lg px-2 py-1 text-sm w-20 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveProfile}
                        className="mt-6 w-full py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                    >
                        Lưu thông tin
                    </button>
                </div>
            </section>

            {/* Exam Management Link */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Quản lý</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-2 shadow-sm border border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => navigate('/manage-exams')}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center">
                                <SettingsIcon size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-lg">Cấu hình Đề thi</div>
                                <div className="text-xs text-gray-500">Tạo, sửa, xóa các kỳ thi</div>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-300" />
                    </button>

                    <button
                        onClick={() => navigate('/properties')}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors border-t border-gray-50 dark:border-zinc-800"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Layers size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-lg">Quản lý Thuộc tính</div>
                                <div className="text-xs text-gray-500">Kỳ thi, Cấp độ, Loại môn</div>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-300" />
                    </button>
                </div>
            </section>

            {/* Appearance */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Giao diện (Visual)</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] divide-y divide-gray-50 dark:divide-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <SettingItem
                        icon={<Moon size={20} />}
                        label="Chế độ tối"
                        control={<Switch active={darkMode} onToggle={toggleDarkMode} />}
                    />

                    {/* Background Picker */}
                    <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <ImageIcon size={20} />
                            </div>
                            <span className="font-bold">Hình nền</span>
                        </div>
                        <div className="flex gap-2">
                            <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBackgroundChange} />
                            <button onClick={() => bgInputRef.current?.click()} className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-bold">Thay đổi</button>
                            <button onClick={removeBackground} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold">Xóa</button>
                        </div>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <Palette size={20} />
                            </div>
                            <span className="font-bold">Màu chủ đạo</span>
                        </div>
                        <div className="flex justify-between px-2">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setPrimaryColor(color)}
                                    className={`w-10 h-10 rounded-full border-4 transition-transform active:scale-90 ${primaryColor === color ? 'border-primary/30 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Font Scale Slider */}
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                    <Type size={20} />
                                </div>
                                <span className="font-bold">Kích thước chữ ({(fontScale * 100).toFixed(0)}%)</span>
                            </div>
                        </div>
                        <div className="px-2">
                            <input
                                type="range"
                                min="0.8"
                                max="1.4"
                                step="0.1"
                                value={fontScale}
                                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                <span>Nhỏ</span>
                                <span>Vừa</span>
                                <span>Lớn</span>
                            </div>
                        </div>
                    </div>

                    {/* Font Family Selector */}
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <Type size={20} />
                            </div>
                            <span className="font-bold">Kiểu chữ (Font)</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Times New Roman', 'Arial', 'Be Vietnam Pro'].map(font => (
                                <button
                                    key={font}
                                    onClick={() => setFontFamily(font)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${fontFamily === font ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-zinc-800 border-transparent hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                                    style={{ fontFamily: font }}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Reminders */}
            <section className="space-y-4">
                <div className="flex justify-between items-center px-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Nhắc nhở</label>
                    <button onClick={() => setIsReminderOpen(true)} className="text-primary text-sm font-bold flex items-center gap-1">
                        <Plus size={16} /> Thêm
                    </button>
                </div>
                <div className="space-y-3">
                    {reminders.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-zinc-900 rounded-[2rem] text-gray-400 text-sm">Chưa có nhắc nhở nào</div>
                    ) : (
                        reminders.map(r => (
                            <div key={r.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl flex justify-between items-center shadow-sm border border-gray-100 dark:border-zinc-800">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">{r.time}</div>
                                        <div className="text-xs text-gray-500">{r.title}</div>
                                    </div>
                                </div>
                                <Switch
                                    active={r.isActive}
                                    onToggle={() => db.reminders.update(r.id!, { isActive: !r.isActive })}
                                />
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Quiz Logic */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Ôn tập & Thi</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] divide-y divide-gray-50 dark:divide-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <SettingItem
                        icon={<Target size={20} />}
                        label="Trộn câu hỏi"
                        control={<Switch active={shuffleQuestions} onToggle={() => setShuffleQuestions(!shuffleQuestions)} />}
                    />
                    <SettingItem
                        icon={<Goal size={20} />}
                        label="Trộn đáp án"
                        control={<Switch active={shuffleAnswers} onToggle={() => setShuffleAnswers(!shuffleAnswers)} />}
                    />
                    <SettingItem
                        icon={<Info size={20} />}
                        label="Hiện giải thích ngay"
                        control={<Switch active={showExplanation} onToggle={() => setShowExplanation(!showExplanation)} />}
                    />
                </div>
            </section>

            {/* Help & Info */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Hỗ trợ</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] divide-y divide-gray-50 dark:divide-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <button
                        onClick={() => navigate('/guide')}
                        className="w-full p-6 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                            <BookOpen size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">Hướng dẫn sử dụng</h3>
                            <p className="text-xs text-gray-400 mt-1">Cách dùng, cấu trúc dữ liệu...</p>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>
                </div>
            </section>

            {/* Data & Backup */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Sao lưu & Dữ liệu</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] divide-y divide-gray-50 dark:divide-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <button
                        onClick={handleExportData}
                        className="w-full p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                                <FileDown size={20} />
                            </div>
                            <span className="font-bold">Sao lưu dữ liệu (JSON)</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                <FileUp size={20} />
                            </div>
                            <span className="font-bold">Khôi phục dữ liệu</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleImportData}
                        />
                    </button>

                    <button
                        onClick={resetAllData}
                        className="w-full p-5 flex justify-between items-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                                <Trash2 size={20} />
                            </div>
                            <span className="font-bold">Xóa toàn bộ dữ liệu</span>
                        </div>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </section>

            {/* Presets */}
            <section className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-4">Kho dữ liệu mẫu (Có sẵn)</label>
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] divide-y divide-gray-50 dark:divide-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    {[
                        { name: 'Giải Phẫu', file: 'GiaiPhau_3tier.zip' },
                        { name: 'Ngoại Chung', file: 'NgoaiChung_3tier.zip' },
                        { name: 'Nhận Thức Chính Trị', file: 'NhanThucChinhTri_3tier.zip' },
                        { name: 'Nội Khoa', file: 'NoiKhoa_3tier.zip' },
                        { name: 'Sinh Lý', file: 'SinhLy_3tier.zip' },
                        { name: 'Siêu Âm Tổng Quát', file: 'SieuAmTongQuat_3tier.zip' }
                    ].map((preset) => (
                        <button
                            key={preset.file}
                            onClick={async () => {
                                if (!confirm(`Bạn có muốn tải bộ đề "${preset.name}" không?`)) return;
                                try {
                                    const response = await fetch(`/${preset.file}`);
                                    if (!response.ok) throw new Error('File not found');
                                    const blob = await response.blob();
                                    const file = new File([blob], preset.file, { type: 'application/zip' });
                                    await ImportService.importFromZip(file, null);
                                    alert(`Đã thêm bộ đề "${preset.name}" thành công!`);
                                    window.location.reload();
                                } catch (e) {
                                    console.error(e);
                                    alert('Lỗi khi tải bộ đề!');
                                }
                            }}
                            className="w-full p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
                                    <FileDown size={20} />
                                </div>
                                <span className="font-bold">{preset.name}</span>
                            </div>
                            <div className="px-3 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-500 font-bold">
                                Tải về
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Reminder Modal */}
            {isReminderOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-4">Thêm nhắc nhở</h3>
                        <div className="space-y-4">
                            <input
                                placeholder="Tiêu đề (Vd: Ôn giải phẫu)"
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none"
                                value={newReminder.title}
                                onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
                            />
                            <input
                                type="time"
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 outline-none font-bold text-center text-2xl"
                                value={newReminder.time}
                                onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
                            />
                            <div className="flex gap-2 justify-end mt-6">
                                <button onClick={() => setIsReminderOpen(false)} className="px-4 py-2 text-gray-400">Hủy</button>
                                <button
                                    onClick={() => {
                                        if (newReminder.title && newReminder.time) {
                                            db.reminders.add(newReminder as Reminder);
                                            setIsReminderOpen(false);
                                            setNewReminder({ title: '', message: '', time: '08:00', days: [], isActive: true });
                                        }
                                    }}
                                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] pt-4">
                Ôn Thi Trắc Nghiệm DrDucQY95 v1.0
            </div>
        </div>
    );
};

const SettingItem = ({ icon, label, control }: any) => (
    <div className="p-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                {icon}
            </div>
            <span className="font-bold">{label}</span>
        </div>
        {control}
    </div>
);

const Switch = ({ active, onToggle }: any) => (
    <button
        onClick={onToggle}
        className={`w-12 h-7 rounded-full transition-colors relative ${active ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-800'}`}
    >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${active ? 'left-6' : 'left-1'}`} />
    </button>
);
