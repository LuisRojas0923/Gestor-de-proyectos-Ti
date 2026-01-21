import React, { useState } from 'react';
import {
    Text,
    Title,
    Subtitle,
    Button,
    MaterialCard
} from '../components/atoms';
import {
    Type,
    MousePointer2,
    Layout,
    CheckCircle2,
    Palette,
    Bell,
    Star,
    BookOpen,
    Plus
} from 'lucide-react';

import TypographySection from './DesignSystemCatalog/TypographySection';
import ButtonsSection from './DesignSystemCatalog/ButtonsSection';
import FormsSection from './DesignSystemCatalog/FormsSection';
import IconsSection from './DesignSystemCatalog/IconsSection';
import FeedbackSection from './DesignSystemCatalog/FeedbackSection';
import ColorsSection from './DesignSystemCatalog/ColorsSection';
import NotificationsSection from './DesignSystemCatalog/NotificationsSection';
import ModalsSection from './DesignSystemCatalog/ModalsSection';
import CardsSection from './DesignSystemCatalog/CardsSection';
import MoleculesSection from './DesignSystemCatalog/MoleculesSection';

const DesignSystemCatalog: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'typography' | 'buttons' | 'forms' | 'icons' | 'feedback' | 'colors' | 'notifications' | 'modals' | 'cards' | 'molecules'>('typography');

    const renderTabButton = (id: typeof activeTab, label: string, icon: React.ReactNode) => (
        <Button
            variant={activeTab === id ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(id)}
            className="justify-start font-medium"
            fullWidth
        >
            <div className="flex items-center gap-3">
                {icon}
                <Text color="inherit" weight={activeTab === id ? 'bold' : 'medium'}>{label}</Text>
            </div>
        </Button>
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                    <Title variant="h2" color="text-primary">
                        Catálogo de Sistema de Diseño
                    </Title>
                    <Subtitle variant="body1">
                        Documentación interactiva de los átomos y moléculas del proyecto.
                    </Subtitle>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1">
                    <MaterialCard className="p-4 sticky top-6 border-[var(--color-border)]/30 shadow-xl overflow-hidden">
                        <div className="space-y-1">
                            <Text variant="caption" weight="bold" color="text-secondary" className="px-4 mb-4 uppercase tracking-[0.2em] block">
                                Componentes
                            </Text>
                            {renderTabButton('typography', 'Tipografía', <Type size={20} />)}
                            {renderTabButton('buttons', 'Botones', <MousePointer2 size={20} />)}
                            {renderTabButton('forms', 'Formularios', <Layout size={20} />)}
                            {renderTabButton('icons', 'Iconos', <Star size={20} />)}
                            {renderTabButton('feedback', 'Feedback', <CheckCircle2 size={20} />)}
                            <div className="my-4 border-t border-neutral-200 dark:border-neutral-700 opacity-50" />
                            {renderTabButton('colors', 'Colores', <Palette size={20} />)}
                            {renderTabButton('notifications', 'Notificaciones', <Bell size={20} />)}
                            {renderTabButton('modals', 'Modales', <Layout size={18} />)}
                            {renderTabButton('cards', 'Tarjetas', <BookOpen size={18} />)}
                            {renderTabButton('molecules', 'Moléculas', <Plus size={18} />)}
                        </div>
                    </MaterialCard>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 space-y-8">
                    {activeTab === 'typography' && <TypographySection />}
                    {activeTab === 'buttons' && <ButtonsSection />}
                    {activeTab === 'forms' && <FormsSection />}
                    {activeTab === 'icons' && <IconsSection />}
                    {activeTab === 'feedback' && <FeedbackSection />}
                    {activeTab === 'colors' && <ColorsSection />}
                    {activeTab === 'notifications' && <NotificationsSection />}
                    {activeTab === 'modals' && <ModalsSection />}
                    {activeTab === 'cards' && <CardsSection />}
                    {activeTab === 'molecules' && <MoleculesSection />}
                </div>
            </div>
        </div>
    );
};

export default DesignSystemCatalog;
