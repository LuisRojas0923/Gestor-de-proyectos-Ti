import React, { useState, useEffect } from 'react';
import { Title, Text, Button, Badge } from '../../../../components/atoms';
import { ActionCard } from '../../../../components/molecules';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react';
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
import ExcepcionesIcon from '../../../../assets/images/categories/EXCEPCIONES.png';



/**
 * Componente para renderizar una subcategoría como una tarjeta (card).
 */
const SubcategoriaCard: React.FC<{
    category: string;
    name: string;
    onClick: () => void;
}> = ({ name, onClick }) => {
    // Función para determinar el icono a mostrar
    const getSubcategoryIcon = (sub: string) => {
        const subUpper = sub.toUpperCase();
        
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
            'GESTION EXCEPCIONES': ExcepcionesIcon
        };

        const iconSrc = iconMap[subUpper];

        // Escalas especiales para iconos que por su forma se ven más pequeños
        const specialScales: Record<string, string> = {
            'CAMPOSANTO': 'scale-[1.8]',
            'RECORDAR': 'scale-[1.5]',
            'POLIZAS VEHICULOS': 'scale-[1.8]',
            'OCCIDENTE LIBRANZA': 'scale-[1.4]',
            'DAVIVIENDA LIBRANZA': 'scale-[1.4]'
        };

        const extraScale = specialScales[subUpper] || '';

        if (iconSrc) {
            return (
                <div className="w-[90px] h-[90px] flex items-center justify-center">
                    <img
                        src={iconSrc}
                        alt={sub}
                        className={`max-w-full max-h-full object-contain ${extraScale} ${subUpper === 'POLIZAS VEHICULOS' ? 'dark:invert-0 invert' : ''}`}
                    />
                </div>
            );
        }

        return FileText;
    };

    return (
        <ActionCard
            title={name}
            description="Cargar archivo / Ver registros"
            icon={getSubcategoryIcon(name)}
            onClick={onClick}
            className="!p-6" // Ajuste de padding para que no sea tan grande
        />
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
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-2 mb-6">
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
    const [catalogo, setCatalogo] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchCatalogo = async () => {
            try {
                const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/catalogo`);
                if (isMounted) {
                    setCatalogo(res.data);
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
    }, []);

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
                    onClick={() => navigate('/service-portal/novedades-nomina/resumen')}
                    className="group flex items-center gap-2 hover:opacity-80 transition-all duration-300 p-0 h-auto bg-transparent border-none"
                >
                    <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                        Resumen Mensual
                    </Title>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : (
                <div className="space-y-16">
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
