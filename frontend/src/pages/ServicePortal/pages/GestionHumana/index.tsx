import React, { useState } from 'react';
import { Title, Text, Button, MaterialCard } from '../../../../components/atoms';
import { FileText, ClipboardList, ReceiptText, ArrowLeft, ChevronRight } from 'lucide-react';
import CertificadoIngresosView from './CertificadoIngresosView';

interface User {
  id: string;
  cedula: string;
  name: string;
  role: string;
}

interface GestionHumanaPortalProps {
  user: User;
  onBack: () => void;
}

type ViewType = 'selection' | 'certificado_ingresos' | 'certificados_laborales' | 'desprendibles_pago';

const ServicePortalCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
}> = ({ title, description, icon, onClick }) => {
    return (
        <MaterialCard
            onClick={onClick}
            hoverable={true}
            className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-0.5 text-left w-full min-h-24 h-auto cursor-pointer"
        >
            <div className="flex items-center gap-4 w-full h-full">
                {/* Contenedor del Icono/Logo */}
                <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]">
                        {icon}
                    </div>
                </div>
                {/* Textos */}
                <div className="flex-grow min-w-0">
                    <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                        {title}
                    </Title>
                    <Text variant="caption" color="text-secondary" className="block mt-1 font-medium line-clamp-2">
                        {description}
                    </Text>
                </div>
                {/* Indicador de Acción */}
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
            </div>
        </MaterialCard>
    );
};

const GestionHumanaPortal: React.FC<GestionHumanaPortalProps> = ({ user, onBack }) => {
  const [currentView, setCurrentView] = useState<ViewType>('selection');

  const handleBack = () => {
    if (currentView === 'selection') {
      onBack();
    } else {
      setCurrentView('selection');
    }
  };

  if (currentView === 'certificado_ingresos') {
    return <CertificadoIngresosView user={user} onBack={handleBack} />;
  }

  if (currentView === 'certificados_laborales' || currentView === 'desprendibles_pago') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 dark:bg-primary-500/10">
          {currentView === 'certificados_laborales' ? <ClipboardList size={48} /> : <ReceiptText size={48} />}
        </div>
        <div className="text-center space-y-2">
          <Title variant="h3">Módulo en Desarrollo</Title>
          <Text variant="body1" className="text-gray-500 max-w-md">
            Estamos trabajando para brindarte acceso a tus {currentView === 'certificados_laborales' ? 'certificados laborales' : 'desprendibles de pago'} directamente desde este portal.
          </Text>
        </div>
        <Button 
          onClick={handleBack}
          className="px-8 h-12 rounded-xl shadow-lg shadow-primary-500/20"
        >
          Volver a Selección
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
        {/* Header Estandarizado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                        Gestión Humana
                    </Title>
                </div>
            </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ServicePortalCard
          title="Certificado de Ingresos y Retenciones"
          description="Descarga tu certificado 220 o gestiona información exógena."
          icon={<FileText className="w-8 h-8 text-[var(--color-primary)]" />}
          onClick={() => setCurrentView('certificado_ingresos')}
        />

        <ServicePortalCard
          title="Certificados Laborales"
          description="Solicita y descarga certificados de tiempo de servicio y salario."
          icon={<ClipboardList className="w-8 h-8 text-[var(--color-primary)]" />}
          onClick={() => setCurrentView('certificados_laborales')}
        />

        <ServicePortalCard
          title="Desprendibles de Pago"
          description="Consulta y descarga tus comprobantes de nómina mensuales."
          icon={<ReceiptText className="w-8 h-8 text-[var(--color-primary)]" />}
          onClick={() => setCurrentView('desprendibles_pago')}
        />
      </div>
    </div>
  );
};

export default GestionHumanaPortal;
