import React from 'react';
import { LogOut } from 'lucide-react';
import { Button, Text } from '../../components/atoms';
import ThemeToggle from '../../components/atoms/ThemeToggle';
import imgHeader from '../../assets/images/Header.png';
import imgSolidLogo from '../../assets/images/categories/Logo SOLID-ERP.png';

interface PortalLayoutProps {
    children: React.ReactNode;
    user: any;
    onHome: () => void;
    onLogout: () => void;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, user, onHome, onLogout }) => {
    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-text-primary)] transition-colors duration-300">
            <header className="bg-transparent border-b border-white/20 sticky top-0 z-50 transition-all duration-300 h-24 shadow-lg">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 opacity-100 -z-10"
                    style={{ backgroundImage: `url(${imgHeader})` }}
                />

                <div className="h-full bg-black/5 transition-colors duration-300">
                    <div className="max-w-[1300px] mx-auto px-4 h-full flex items-center justify-between text-white relative">
                        {/* 1. SECCIÓN IZQUIERDA (Equilibrio) */}
                        <div className="flex-1 flex justify-start">
                            <div className="w-10 md:w-20"></div>
                        </div>

                        {/* 2. SECCIÓN CENTRAL (Marca) - Siempre centrada por flex-1 en los lados */}
                        <div
                            className="flex flex-col items-center cursor-pointer select-none mx-2 sm:mx-6 shrink-0"
                            onClick={onHome}
                        >
                            <Text weight="bold" color="white" className="text-lg sm:text-2xl tracking-tighter drop-shadow-xl uppercase text-center font-extrabold leading-tight">
                                <Text as="span" color="white" className="hidden sm:inline">Portal de Servicios SOLID</Text>
                                <Text as="span" color="white" className="inline sm:hidden">Portal SOLID</Text>
                            </Text>
                        </div>

                        {/* 3. SECCIÓN DERECHA (Controles) */}
                        <div className="flex-1 flex items-center justify-end space-x-2 sm:space-x-4 z-10">
                            <ThemeToggle className="text-white scale-90 sm:scale-100" />
                            <div className="text-right hidden lg:block border-l border-white/30 pl-4">
                                <Text variant="body1" weight="bold" color="white" className="drop-shadow-md uppercase text-[10px] tracking-wider leading-none mb-1">{user?.name}</Text>
                                <Text variant="caption" color="white" className="opacity-80 uppercase text-[9px] tracking-widest font-bold">{user?.area || 'Usuario'}</Text>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onLogout}
                                className="p-2 sm:p-3 rounded-xl hover:bg-white/20 text-white transition-all"
                            >
                                <LogOut size={20} />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-grow max-w-[1300px] w-full mx-auto p-4 sm:px-8 sm:py-2">
                {children}
            </main>

            <footer className="w-full py-6 mt-auto bg-[var(--color-surface)] border-t border-[var(--color-border)] opacity-60 hover:opacity-100 transition-opacity duration-500">
                <div className="max-w-[1300px] mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 order-2 md:order-1">
                        <Text variant="caption" weight="bold" className="uppercase tracking-[0.3em] text-[9px] opacity-70">
                            Ecosistema
                        </Text>
                        <img src={imgSolidLogo} alt="SOLID-ERP" className="h-4 w-auto dark:invert" />
                    </div>

                    <div className="flex flex-col items-center order-1 md:order-2">
                        <Text variant="caption" weight="medium" className="uppercase tracking-[0.2em] text-[var(--color-text-secondary)] text-[10px]">
                            Portal de Servicios
                        </Text>
                        <div className="flex items-center gap-2">
                            <Text variant="caption" weight="bold" color="navy" className="text-[9px] uppercase">
                                Powered by
                            </Text>
                            <img
                                src={imgSolidLogo}
                                alt="SOLID-ERP"
                                className="h-5 w-auto grayscale contrast-125 dark:invert dark:brightness-200"
                            />
                        </div>
                    </div>

                    <div className="hidden md:block w-32 order-3"></div>
                </div>
            </footer>
        </div>
    );
};

export default PortalLayout;
