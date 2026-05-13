import { LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button, Text, Title } from '../../components/atoms';
import ThemeToggle from '../../components/atoms/ThemeToggle';
import imgLogoRefridcol from '../../assets/images/Logo Refridcol Solo.png';
import imgSolidLogo from '../../assets/images/categories/Logo SOLID-ERP.png';
import { UpdateEmailBanner } from '../../components/layout/UpdateEmailBanner';
import EmailUpdateModal from './components/EmailUpdateModal';

interface PortalLayoutProps {
    children: React.ReactNode;
    user: any;
    onHome: () => void;
    onLogout: () => void;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, user, onHome, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [fromAdmin, setFromAdmin] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const isInventario = location.pathname.includes('/inventario');

    useEffect(() => {
        // Detectar si venimos del panel administrativo en esta sesión
        const isFromAdmin = sessionStorage.getItem('fromAdmin') === 'true';
        setFromAdmin(isFromAdmin);
    }, []);

    useEffect(() => {
        // Lanzar el modal automáticamente si el correo requiere actualización
        if (user?.emailNeedsUpdate) {
            setIsEmailModalOpen(true);
        }
    }, [user?.emailNeedsUpdate]);

    const isAdmin = ['analyst', 'admin', 'director', 'manager', 'admin_sistemas', 'admin_mejoramiento'].includes(user?.role?.toLowerCase());

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-text-primary)] transition-colors duration-300">
            <header className={`bg-transparent border-b border-white/20 sticky top-0 z-50 transition-all duration-300 h-20 shadow-lg ${isInventario ? 'md:hidden' : ''}`}>
                <div className="absolute inset-0 bg-main-wallpaper transition-opacity duration-500 opacity-100 -z-10" />

                <div className="h-full bg-black/10 transition-colors duration-300">
                    <div className="w-full px-4 sm:px-10 h-full flex items-center justify-between text-white relative py-0">
                        {/* 1. SECCIÓN IZQUIERDA (Navegación y Logo) */}
                        <div className="flex items-center justify-start shrink-0 h-full py-2 gap-3">
                            {fromAdmin && isAdmin && (
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/')}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-lg backdrop-blur-md group animate-in slide-in-from-left-4 duration-500 scale-90 sm:scale-100"
                                    icon={ArrowLeft}
                                />
                            )}

                            <Button
                                variant="ghost"
                                onClick={onHome}
                                className="h-full w-auto transition-transform hover:scale-105 focus:outline-none cursor-pointer bg-transparent border-none rounded-none p-0 flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={imgLogoRefridcol}
                                    alt="Refridcol"
                                    className="h-10 sm:h-12 w-auto object-contain block drop-shadow-md"
                                />
                            </Button>
                        </div>

                        {/* 2. SECCIÓN CENTRAL (Identidad del Portal - Centrado Relativo en Móvil, Absoluto en Desktop) */}
                        <div
                            role="button"
                            tabIndex={0}
                            className="flex-1 md:absolute md:left-1/2 md:-translate-x-1/2 flex flex-col items-center cursor-pointer select-none z-10 px-2"
                            onClick={onHome}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onHome();
                                }
                            }}
                        >
                            <Title variant="h2" color="white" className="tracking-tighter drop-shadow-2xl uppercase text-center font-black leading-tight italic whitespace-nowrap text-base sm:text-2xl lg:text-3xl">
                                PORTAL SOLID
                            </Title>
                        </div>

                        {/* 3. SECCIÓN DERECHA (Controles y Sello Ecosistema al final) */}
                        <div className="flex items-center justify-end z-20 shrink-0">
                            {/* Controles Estándar */}
                            <div className="flex items-center gap-2 sm:gap-4 border-r border-white/20 pr-4 h-10">
                                <ThemeToggle className="text-white scale-80 sm:scale-100" />

                                <div className="text-right hidden lg:flex flex-col justify-center border-l border-white/10 pl-4">
                                    <Text variant="body1" weight="bold" color="white" className="drop-shadow-md uppercase text-[10px] tracking-wider leading-none mb-1">{user?.name}</Text>
                                    <Text variant="caption" color="white" className="opacity-70 uppercase text-[9px] tracking-widest font-bold leading-none">{user?.area || 'Usuario'}</Text>
                                </div>

                                <Button
                                    variant="ghost"
                                    onClick={onLogout}
                                    className="p-1 sm:p-2 rounded-xl hover:bg-white/20 text-white transition-all transform active:scale-95"
                                    title="Cerrar sesión"
                                >
                                    <LogOut size={16} />
                                </Button>
                            </div>

                            {/* SELLO ECOSISTEMA: VERTICAL Y PREMIUM */}
                            <div className="hidden xs:flex flex-col items-center gap-1.5 group select-none pl-2 sm:pl-4 border-l border-white/20 ml-1 sm:ml-2">
                                <Text variant="caption" weight="bold" color="white" className="uppercase tracking-[0.3em] text-[6px] sm:text-[7.5px] opacity-60 group-hover:opacity-100 transition-opacity leading-none drop-shadow-sm">
                                    Ecosistema
                                </Text>
                                <div className="h-4 sm:h-6 w-auto flex items-center justify-center">
                                    <img
                                        src={imgSolidLogo}
                                        alt="SOLID-ERP"
                                        className="h-full w-auto grayscale contrast-125 brightness-150 group-hover:brightness-200 group-hover:grayscale-0 transition-all duration-300"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <UpdateEmailBanner onUpdate={() => setIsEmailModalOpen(true)} />
            <EmailUpdateModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
            />
            <main className="flex-1 w-full max-w-[var(--portal-max-width)] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                {children}
            </main>

            {!isInventario && (
            <footer className="w-full h-[60px] py-2 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] opacity-60 hover:opacity-100 transition-opacity duration-500 flex items-center sticky bottom-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <div className="w-full mx-auto px-8 flex flex-col items-center justify-center gap-1">
                    <Text variant="caption" weight="medium" className="uppercase tracking-[0.2em] text-[var(--color-text-secondary)] text-[10px]">
                        Portal de Servicios
                    </Text>
                    <div className="flex items-center gap-2">
                        <Text variant="caption" weight="bold" color="navy" className="text-[9px] uppercase">
                            Powered by
                        </Text>
                        <Text variant="caption" weight="bold" color="text-primary" className="text-[11px] italic font-black">
                            Solid-ERP
                        </Text>
                    </div>
                </div>
            </footer>
            )}
        </div>
    );
};

export default PortalLayout;
