import React from 'react';
import { Title, Text, Button } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { Settings2, Calculator, Table2, ArrowLeft } from 'lucide-react';

const ControlDescuentosDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 shrink-0 gap-4 transition-colors duration-200">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate('/service-portal/novedades-nomina')}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <div>
                        <Title level={4} className="!mb-1 font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 flex items-center gap-3">
                            <Calculator className="w-6 h-6 text-emerald-500" />
                            Control de Descuentos
                        </Title>
                        <Text size="sm" color="text-tertiary" className="font-medium tracking-wide">
                            Panel Principal de Gestión
                        </Text>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
                        <Title level={2} className="font-bold text-slate-800 dark:text-slate-100">
                            ¿Qué deseas hacer hoy?
                        </Title>
                        <Text className="text-slate-500 dark:text-slate-400 text-lg">
                            Selecciona una de las opciones a continuación para gestionar los descuentos de nómina y parametrizar los conceptos de la compañía.
                        </Text>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Registro / Modificación */}
                        <div 
                            onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/registro')}
                            className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                            <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                                <Calculator className="w-10 h-10" />
                            </div>
                            <Title level={4} className="font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Registrar Descuentos
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">
                                Buscar empleados en el ERP, agregar nuevos descuentos o modificar cuotas quincenales del personal activo.
                            </Text>
                        </div>

                        {/* Parametrización de Conceptos */}
                        <div 
                            onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/conceptos')}
                            className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                            <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                                <Settings2 className="w-10 h-10" />
                            </div>
                            <Title level={4} className="font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                Parametrizar Conceptos
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">
                                Agregar, modificar o eliminar la lista maestra de conceptos que se utilizarán para registrar los descuentos.
                            </Text>
                        </div>

                        {/* Ver Tabla */}
                        <div 
                            onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/tabla')}
                            className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                            <div className="w-20 h-20 rounded-2xl bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                                <Table2 className="w-10 h-10" />
                            </div>
                            <Title level={4} className="font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                Ver Tabla Final
                            </Title>
                            <Text className="text-slate-500 dark:text-slate-400">
                                Visualizar el registro tabular maestro de descuentos. Esta vista alimentará a la interfaz global.
                            </Text>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ControlDescuentosDashboard;
