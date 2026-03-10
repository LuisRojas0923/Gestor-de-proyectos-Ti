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
        if (subUpper === 'GRANCOOP') {
            return (
                <div className="w-14 h-14 flex items-center justify-center">
                    <img
                        src={GrancoopIcon}
                        alt="Grancoop"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'BENEFICIAR') {
            return (
                <div className="w-14 h-14 flex items-center justify-center">
                    <img
                        src={BeneficiarIcon}
                        alt="Beneficiar"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'SEGUROS HDI') {
            return (
                <div className="w-14 h-14 flex items-center justify-center">
                    <img
                        src={HdiIcon}
                        alt="HDI"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'BOGOTA LIBRANZA') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={BancoBogotaIcon}
                        alt="Banco Bogota"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'DAVIVIENDA LIBRANZA') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={BancoDaviviendaIcon}
                        alt="Banco Davivienda"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'OCCIDENTE LIBRANZA') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={BancoOccidenteIcon}
                        alt="Banco Occidente"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'RECORDAR') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={RecordarIcon}
                        alt="Recordar"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'CAMPOSANTO') {
            return (
                <div className="w-28 h-28 flex items-center justify-center scale-150">
                    <img
                        src={CamposantoIcon}
                        alt="Camposanto"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'POLIZAS VEHICULOS') {
            return (
                <img
                    src={PolizasVehiculosIcon}
                    alt="Pólizas Vehículos"
                    className="w-48 h-48 object-contain scale-150"
                />
            );
        }
        if (subUpper === 'OTROS GERENCIA') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={OtrosGerenciaIcon}
                        alt="Otros Gerencia"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'MEDICINA PREPAGADA') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={MedicinaPrepagadaIcon}
                        alt="Medicina Prepagada"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'CONTROL DE DESCUENTOS') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={ControlDescuentosIcon}
                        alt="Control Descuentos"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'CELULARES') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={CelularesIcon}
                        alt="Celulares"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }
        if (subUpper === 'EMBARGOS') {
            return (
                <div className="w-20 h-20 flex items-center justify-center scale-110">
                    <img
                        src={EmbargosIcon}
                        alt="Embargos"
                        className="max-w-full max-h-full object-contain"
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
                            Descuentos de Nómina
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
