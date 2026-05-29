import React, { useState, useEffect } from 'react';
import { Title, Text, Button, MaterialCard } from '../../../../components/atoms';
import { useNavigate, useParams } from 'react-router-dom';
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
import RetencionesIcon from '../../../../assets/images/categories/RETENCIONES.png';
import PlanillasRegionalesIcon from '../../../../assets/images/categories/PLANILLAS REGIONALES.png';
import ExcepcionesIcon from '../../../../assets/images/categories/EXCEPCIONES.png';

const NominaCategoryView: React.FC = () => {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCatalogo = async () => {
            try {
                const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/catalogo`);
                setSubcategories(res.data[category || ''] || []);
            } catch (err) {
                console.error("Error fetching subcategories:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCatalogo();
    }, [category]);

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

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <Title variant="h4" weight="bold">{category}</Title>
                    <Text color="text-secondary">Selecciona una subcategoría para iniciar la carga</Text>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategories.map((sub) => {
                        const subUpper = sub.toUpperCase();
                        const iconSrc = iconMap[subUpper];

                        return (
                            <MaterialCard
                                key={sub}
                                onClick={() => navigate(`/service-portal/novedades-nomina/${category}/${sub}`)}
                                hoverable={true}
                                className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-0.5 text-left w-full h-24 cursor-pointer"
                            >
                                <div className="flex items-center gap-4 w-full h-full">
                                    {/* Contenedor del Logo */}
                                    <div className="w-24 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0">
                                        {iconSrc ? (
                                            <img
                                                src={iconSrc}
                                                alt={sub}
                                                className={`max-w-full max-h-full object-contain ${subUpper === 'POLIZAS VEHICULOS' ? 'dark:invert-0 invert' : ''}`}
                                            />
                                        ) : (
                                            <FileText className="w-8 h-8 text-[var(--color-primary)]" />
                                        )}
                                    </div>
                                    {/* Textos */}
                                    <div className="flex-grow min-w-0">
                                        <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                                            {sub}
                                        </Title>
                                        <Text variant="caption" color="text-secondary" className="block mt-1 font-medium">
                                            Cargar archivos para {sub}
                                        </Text>
                                    </div>
                                    {/* Indicador de Acción */}
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
                                </div>
                            </MaterialCard>
                        );
                    })}
                    {subcategories.length === 0 && (
                        <Text className="col-span-full text-center py-12">No se encontraron subcategorías para esta categoría.</Text>
                    )}
                </div>
            )}
        </div>
    );
};

export default NominaCategoryView;
