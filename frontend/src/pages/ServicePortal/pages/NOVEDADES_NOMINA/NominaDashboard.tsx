import React, { useState, useEffect } from 'react';
import { Title, Text, Button, Badge, MaterialCard } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../../hooks/useApi';
import { ArrowLeft, FileText, ChevronRight, Table } from 'lucide-react';
// Importación de iconos de subcategorías
import GrancoopIcon from '../../../../assets/images/categories/Grancoop.png';
import BeneficiarIcon from '../../../../assets/images/categories/Benefeiciar.png';
import HdiIcon from '../../../../assets/images/categories/HDI.webp';
import BancoBogotaIcon from '../../../../assets/images/categories/BANCO_BOGOTA.png';
import BancoDaviviendaIcon from '../../../../assets/images/categories/BANCO_DAVIVIENDA.png';
import BancoOccidenteIcon from '../../../../assets/images/categories/BANCO_OCCIDENTE.png';
import RecordarIcon from '../../../../assets/images/categories/RECORDAR.png';
import CamposantoIcon from '../../../../assets/images/categories/CAMPOSANTO.png';
import PolizasVehiculosIcon from '../../../../assets/images/categories/ARANGOBUENO.png';
import OtrosGerenciaIcon from '../../../../assets/images/categories/OTROS_GERENCIA.png';
import MedicinaPrepagadaIcon from '../../../../assets/images/categories/MEDICINA_PREPAGADA.png';
import ControlDescuentosIcon from '../../../../assets/images/categories/CONTROL_DESCUENTOS.png';
import CelularesIcon from '../../../../assets/images/categories/CELULARES.png';
import EmbargosIcon from '../../../../assets/images/categories/EMBARGOS.png';
import RetencionesIcon from '../../../../assets/images/categories/RETENCIONES.png';
import PlanillasRegionalesIcon from '../../../../assets/images/categories/PLANILLAS REGIONALES.png';
import ExcepcionesIcon from '../../../../assets/images/categories/EXCEPCIONES.png';



/**
 * Componente para renderizar una subcategoría como una tarjeta (card).
 */
const SubcategoriaCard: React.FC<{
    category: string;
    name: string;
    onClick: () => void;
}> = ({ name, onClick }) => {
    const subUpper = name.toUpperCase();
    
    // Mapeo de subcategorías a sus respectivos iconos
    const iconMap: Record<string, any> = {
        'GRANCOOP': GrancoopIcon,
        'BENEFICIAR': BeneficiarIcon,
        'SEGUROS HDI': HdiIcon,
        'BOGOTA LIBRANZA': BancoBogotaIcon,
        'DAVIVIENDA LIBRANZA': BancoDaviviendaIcon,
        'OCCIDENTE LIBRANZA': BancoOccidenteIcon,
        'RECORDAR': RecordarIcon,
        'CAMPOSANTO': CamposantoIcon,
        'POLIZAS VEHICULOS': PolizasVehiculosIcon,
        'OTROS GERENCIA': OtrosGerenciaIcon,
        'MEDICINA PREPAGADA': MedicinaPrepagadaIcon,
        'CONTROL DE DESCUENTOS': ControlDescuentosIcon,
        'CELULARES': CelularesIcon,
        'EMBARGOS': EmbargosIcon,
        'RETENCIONES': RetencionesIcon,
        'PLANILLAS REGIONALES 1Q': PlanillasRegionalesIcon,
        'PLANILLAS REGIONALES 2Q': PlanillasRegionalesIcon,
        'GESTION EXCEPCIONES': ExcepcionesIcon
    };

    const iconSrc = iconMap[subUpper];

    return (
        <MaterialCard
            onClick={onClick}
            hoverable={true}
            className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-0.5 text-left w-full h-24 cursor-pointer"
        >
            <div className="flex items-center gap-4 w-full h-full">
                {/* Contenedor del Logo */}
                <div className="w-24 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0">
                    {iconSrc ? (
                        <img
                            src={iconSrc}
                            alt={name}
                            className={`max-w-full max-h-full object-contain ${subUpper === 'POLIZAS VEHICULOS' ? 'dark:invert-0 invert' : ''}`}
                        />
                    ) : (
                        <FileText className="w-8 h-8 text-[var(--color-primary)]" />
                    )}
                </div>
                {/* Textos */}
                <div className="flex-grow min-w-0">
                    <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                        {name}
                    </Title>
                    <Text variant="caption" color="text-secondary" className="block mt-1 font-medium">
                        Cargar archivo / Ver registros
                    </Text>
                </div>
                {/* Indicador de Acción */}
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
            </div>
        </MaterialCard>
    );
};

/**
 * Componente para renderizar una sección de categoría con sus subcategorías.
 */
const CategoriaSection: React.FC<{
    name: string;
    subcategories: string[];
    onSubcategoryClick: (sub: string) => void;
}> = ({ name, subcategories, onSubcategoryClick }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                <Title variant="h5" weight="bold" className="uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {name}
                </Title>
                <Badge variant="neutral" className="px-2 py-0.5 text-xs">
                    {subcategories.length} {subcategories.length === 1 ? 'subcategoría' : 'subcategorías'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subcategories.map((sub) => (
                    <SubcategoriaCard
                        key={sub}
                        category={name}
                        name={sub}
                        onClick={() => onSubcategoryClick(sub)}
                    />
                ))}
            </div>
        </div>
    );
};

const NominaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { get } = useApi<Record<string, string[]>>();
    const [catalogo, setCatalogo] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchCatalogo = async () => {
            try {
                const data = await get('/novedades-nomina/catalogo');
                if (isMounted && data) {
                    setCatalogo(data);
                }
            } catch (err) {
                console.error("Error fetching catologo nomina:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        fetchCatalogo();
        return () => { isMounted = false; };
    }, [get]);

    const categories = Object.keys(catalogo);

    return (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/inicio')} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Novedades de Nómina
                        </Title>
                    </div>
                </div>
                <Button
                    variant="custom"
                    onClick={() => navigate('/service-portal/novedades-nomina/tabla-maestra')}
                    className="px-5 py-2 bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md hover:to-slate-200 dark:hover:to-slate-800 text-slate-700 dark:text-slate-200 font-semibold uppercase tracking-wide transition-all hover:-translate-y-0.5"
                >
                    <div className="flex flex-row items-center justify-center gap-2 whitespace-nowrap">
                        <Table className="w-5 h-5" />
                        <Text as="span" color="inherit">Ver Tabla Consolidada</Text>
                    </div>
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {categories.map((cat) => (
                        <CategoriaSection
                            key={cat}
                            name={cat}
                            subcategories={catalogo[cat]}
                            onSubcategoryClick={(sub) => navigate(`/service-portal/novedades-nomina/${cat}/${sub}`)}
                        />
                    ))}

                    {categories.length === 0 && (
                        <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-300">
                            <Text color="text-secondary" weight="medium">No se encontraron categorías en el catálogo.</Text>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NominaDashboard;
