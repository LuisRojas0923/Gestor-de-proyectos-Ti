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
    <div className="p-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[var(--portal-max-width)] mx-auto">
      
      {/* Botón de Navegación Superior (UX Pattern: Salida Clara) */}
      <div className="flex w-full mb-[-1rem]">
        <Button 
          variant="outline" 
          onClick={handleBack} 
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-[var(--deep-navy)] dark:text-slate-300 dark:hover:text-white border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al Menú Principal
        </Button>
      </div>

      <div className="text-center space-y-4">
        <Title variant="h2" weight="bold" className="text-[var(--deep-navy)] dark:text-white">
          Gestión Humana
        </Title>
        <Text variant="body1" color="text-secondary" className="max-w-2xl mx-auto font-medium">
          Accede a tus documentos laborales, certificados tributarios y comprobantes de pago de forma segura.
        </Text>
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
