import React from 'react';
import { LogOut } from 'lucide-react';
import { Button, Text } from '../../components/atoms';
import ThemeToggle from '../../components/atoms/ThemeToggle';
import imgHeader from '../../assets/images/Header.png';

interface PortalLayoutProps {
    children: React.ReactNode;
    user: any;
    onHome: () => void;
    onLogout: () => void;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, user, onHome, onLogout }) => {
    return (
        <div className="min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-text-primary)] transition-colors duration-300">
            <header className="bg-transparent border-b border-white/20 sticky top-0 z-50 transition-all duration-300 h-24 shadow-lg">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 opacity-100"
                    style={{ backgroundImage: `url(${imgHeader})`, zIndex: -1 }}
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
                            <Text as="span" weight="bold" color="white" className="text-lg sm:text-2xl tracking-tighter drop-shadow-xl uppercase text-center font-extrabold leading-tight">
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
            <main className="max-w-[1300px] mx-auto p-4 sm:px-8 sm:py-2">
                {children}
            </main>
        </div>
    );
};

export default PortalLayout;
