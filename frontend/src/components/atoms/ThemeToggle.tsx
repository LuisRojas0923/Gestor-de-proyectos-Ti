import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './index';

interface ThemeToggleProps {
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    return (
        <Button
            variant="ghost"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-2xl transition-all duration-300 shadow-sm border ${className || 'bg-[var(--color-surface-variant)] text-[var(--color-primary)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'}`}
            aria-label="Toggle Theme"
            icon={isDark ? Sun : Moon}
        />
    );
};

export default ThemeToggle;
