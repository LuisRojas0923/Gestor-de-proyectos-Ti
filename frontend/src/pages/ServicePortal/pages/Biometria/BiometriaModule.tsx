import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, MaterialCard, Spinner, Text } from '../../../../components/atoms';
import Callout from '../../../../components/molecules/Callout';
import { obtenerCapacidadesBiometria } from '../../../../services/horariosRelacionesService';
import BiometriaDashboard from './BiometriaDashboard';
import BiometriaAdminView from './BiometriaAdminView';

const BiometriaModule: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<'admin' | 'asistencia'>('asistencia');
    const [puedeSupervisar, setPuedeSupervisar] = useState(false);
    const [cargandoCapacidades, setCargandoCapacidades] = useState(true);
    const [errorCapacidades, setErrorCapacidades] = useState('');
    const [revision, setRevision] = useState(0);

    const conRetorno = (contenido: React.ReactNode) => (
        <Text as="div" className="space-y-4">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/service-portal/tiempo-asistencia')}>
                Volver a Tiempo y Asistencia
            </Button>
            {contenido}
        </Text>
    );

    useEffect(() => {
        const controller = new AbortController();
        setCargandoCapacidades(true);
        setErrorCapacidades('');
        obtenerCapacidadesBiometria(controller.signal)
            .then((response) => {
                setPuedeSupervisar(response.puede_supervisar_equipo);
                if (response.puede_supervisar_equipo) setView('admin');
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) setErrorCapacidades(reason instanceof Error ? reason.message : 'No fue posible consultar las capacidades de supervisión.');
            })
            .finally(() => { if (!controller.signal.aborted) setCargandoCapacidades(false); });
        return () => controller.abort();
    }, [revision]);

    if (cargandoCapacidades) {
        return conRetorno(<MaterialCard className="flex min-h-64 items-center justify-center"><Spinner size="lg" /></MaterialCard>);
    }

    if (errorCapacidades) {
        return conRetorno(<Text as="div" className="space-y-4"><Callout variant="error" role="alert" title="No fue posible verificar la supervisión">{errorCapacidades}<Button variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button></Callout><BiometriaDashboard /></Text>);
    }

    if (!puedeSupervisar) {
        return conRetorno(<BiometriaDashboard />);
    }

    const cambiarTab = (event: React.KeyboardEvent<HTMLButtonElement>, next: 'admin' | 'asistencia') => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        setView(next);
        window.setTimeout(() => document.getElementById(`biometria-tab-${next}`)?.focus(), 0);
    };

    return conRetorno(
        <MaterialCard className="flex min-h-full w-full flex-1 flex-col overflow-hidden bg-[var(--color-background)]">
            <div className="sticky top-0 z-10 flex justify-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm" role="tablist" aria-label="Vistas de biometría">
                <Button
                    id="biometria-tab-admin"
                    role="tab"
                    aria-selected={view === 'admin'}
                    aria-controls="biometria-panel-admin"
                    tabIndex={view === 'admin' ? 0 : -1}
                    variant={view === 'admin' ? 'primary' : 'ghost'}
                    onClick={() => setView('admin')}
                    onKeyDown={(event) => cambiarTab(event, 'asistencia')}
                >
                    Asistencia del equipo
                </Button>
                <Button
                    id="biometria-tab-asistencia"
                    role="tab"
                    aria-selected={view === 'asistencia'}
                    aria-controls="biometria-panel-asistencia"
                    tabIndex={view === 'asistencia' ? 0 : -1}
                    variant={view === 'asistencia' ? 'primary' : 'ghost'}
                    onClick={() => setView('asistencia')}
                    onKeyDown={(event) => cambiarTab(event, 'admin')}
                >
                    Mi asistencia
                </Button>
            </div>

            <div id={`biometria-panel-${view}`} role="tabpanel" aria-labelledby={`biometria-tab-${view}`} tabIndex={0} className="flex-1 overflow-auto">
                {view === 'admin' ? <BiometriaAdminView /> : <BiometriaDashboard />}
            </div>
        </MaterialCard>
    );
};

export default BiometriaModule;
