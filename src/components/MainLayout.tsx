import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, PenTool, Settings, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface LayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 pb-20">
            <main className="max-w-md mx-auto px-4 pt-6">
                {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-zinc-800 safe-area-bottom">
                <div className="max-w-md mx-auto flex justify-between items-center px-6 py-3">
                    <NavItem to="/practice" icon={<BookOpen size={22} />} label="Ôn tập" />
                    <NavItem to="/exam" icon={<PenTool size={22} />} label="Thi thử" />
                    <NavItem to="/" icon={<Home size={22} />} label="Home" />
                    <NavItem to="/history" icon={<History size={22} />} label="Lịch sử" />
                    <NavItem to="/settings" icon={<Settings size={22} />} label="Cài đặt" />
                </div>
            </nav>
        </div>
    );
};

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-gray-400 dark:text-zinc-500"
            )}
        >
            {icon}
            <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
        </NavLink>
    );
};
