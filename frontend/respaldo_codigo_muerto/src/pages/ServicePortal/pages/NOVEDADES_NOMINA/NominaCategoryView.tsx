import React, { useState, useEffect } from 'react';
import { Title, Text, Button } from '../../../../components/atoms';
import { ActionCard } from '../../../../components/molecules';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { ArrowLeft, FileText } from 'lucide-react';

// Importación de iconos de subcategorías
import GrancoopIcon from '../../../../assets/images/categories/Grancoop.png';
import BeneficiarIcon from '../../../../assets/images/categories/Benefeiciar.png';
import HdiIcon from '../../../../assets/images/categories/HDI.webp';
import BancoBogotaIcon from '../../../../assets/images/categories/BANCO_BOGOTA.png';
import BancoDaviviendaIcon from '../../../../assets/images/categories/BANCO_DAVIVIENDA.png';
import BancoOccidenteIcon from '../../../../assets/images/categories/BANCO_OCCIDENTE.png';
import RecordarIcon from '../../../../assets/images/categories/RECORDAR.png';
import CamposantoIcon from '../../../../assets/images/categories/CAMPOSANTO.png';
import OtrosGerenciaIcon from '../../../../assets/images/categories/OTROS_GERENCIA.png';
import MedicinaPrepagadaIcon from '../../../../assets/images/categories/MEDICINA_PREPAGADA.png';



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

    // Función para determinar el icono a mostrar
    const getSubcategoryIcon = (sub: string) => {
        const subUpper = sub.toUpperCase();
        if (subUpper === 'GRANCOOP') {
            return (
                <img
                    src={GrancoopIcon}
                    alt="Grancoop"
                    className="w-14 h-14 object-contain"
                />
            );
        }
        if (subUpper === 'BENEFICIAR') {
            return (
                <img
                    src={BeneficiarIcon}
                    alt="Beneficiar"
                    className="w-14 h-14 object-contain"
                />
            );
        }
        if (subUpper === 'SEGUROS HDI') {
            return (
                <img
                    src={HdiIcon}
                    alt="HDI"
                    className="w-14 h-14 object-contain"
                />
            );
        }
        if (subUpper === 'BOGOTA LIBRANZA') {
            return (
                <img
                    src={BancoBogotaIcon}
                    alt="Banco Bogota"
                    className="w-32 h-32 object-contain scale-110"
                />
            );
        }
        if (subUpper === 'DAVIVIENDA LIBRANZA') {
            return (
                <img
                    src={BancoDaviviendaIcon}
                    alt="Banco Davivienda"
                    className="w-32 h-32 object-contain scale-110"
                />
            );
        }
        if (subUpper === 'OCCIDENTE LIBRANZA') {
            return (
                <img
                    src={BancoOccidenteIcon}
                    alt="Banco Occidente"
                    className="w-32 h-32 object-contain scale-110"
                />
            );
        }
        if (subUpper === 'RECORDAR') {
            return (
                <img
                    src={RecordarIcon}
                    alt="Recordar"
                    className="w-32 h-32 object-contain scale-110"
                />
            );
        }
        if (subUpper === 'CAMPOSANTO') {
            return (
                <img
                    src={CamposantoIcon}
                    alt="Camposanto"
                    className="w-48 h-48 object-contain scale-150"
                />
            );
        }
        if (subUpper === 'OTROS GERENCIA') {
            return (
                <img
                    src={OtrosGerenciaIcon}
                    alt="Otros Gerencia"
                    className="w-32 h-32 object-contain scale-110"
                />
            );
        }
        if (subUpper === 'MEDICINA PREPAGADA') {
            return (
                <img
                    src={MedicinaPrepagadaIcon}
                    alt="Medicina Prepagada"
                    className="w-32 h-32 object-contain scale-110"
                />
            );
        }


        return FileText;
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
                    {subcategories.map((sub) => (
                        <ActionCard
                            key={sub}
                            title={sub}
                            icon={getSubcategoryIcon(sub)}
                            description={`Cargar archivos para ${sub}`}
                            onClick={() => navigate(`/service-portal/novedades-nomina/${category}/${sub}`)}
                        />
                    ))}
                    {subcategories.length === 0 && (
                        <Text className="col-span-full text-center py-12">No se encontraron subcategorías para esta categoría.</Text>
                    )}
                </div>
            )}
        </div>
    );
};

export default NominaCategoryView;
