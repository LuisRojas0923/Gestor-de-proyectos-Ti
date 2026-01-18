import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './index';

const ThemeToggle: React.FC = () => {
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
            className="p-2 rounded-2xl bg-[var(--color-surface-variant)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all duration-300 shadow-sm border border-[var(--color-border)]"
            aria-label="Toggle Theme"
            icon={isDark ? Sun : Moon}
        />
    );
};

export default ThemeToggle;
