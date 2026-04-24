import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, AdobePdfIcon } from '../../../../components/atoms';
import { Upload, Download, FileText, Calendar, ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react';
import { ImpuestosService } from '../../../../services/ImpuestosService';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

interface User {
  id: string;
  cedula: string;
  name: string;
  role: string;
}

interface CertificadoIngresosViewProps {
  user: User;
  onBack: () => void;
}

const CertificadoIngresosView: React.FC<CertificadoIngresosViewProps> = ({ user, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const [años, setAños] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear() - 1);

  const isAdminAccess = user.role === 'contabilidad' || user.role === 'admin' || user.role === 'admin_sistemas';

  useEffect(() => {
    cargarAños();
  }, []);

  const cargarAños = async () => {
    try {
      const data = await ImpuestosService.getAñosDisponibles();
      setAños(data.sort((a: number, b: number) => b - a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      await ImpuestosService.subirExogena(selectedFile, uploadYear);
      addNotification('success', 'Información exógena cargada correctamente');
      setSelectedFile(null);
      cargarAños();
    } catch (err: any) {
      addNotification('error', err || 'Error al cargar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCert = async (ano: number) => {
    try {
      addNotification('info', `Generando certificado año ${ano}...`);
      await ImpuestosService.descargarCertificado220(ano);
    } catch (err: any) {
      addNotification('error', err || 'Error al descargar certificado');
    }
  };

  return (
    <div className="p-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Vanguard: Glassmorphism effect and integrated navigation */}
      <div className="relative overflow-hidden rounded-3xl bg-primary-500 p-8 text-white shadow-xl dark:bg-gradient-to-br dark:from-primary-900/80 dark:via-primary-900/60 dark:to-primary-800/40 dark:backdrop-blur-xl border border-white/10 dark:border-white/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-32 w-32 rounded-full bg-primary-400/20 blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <Button
            variant="custom"
            onClick={onBack}
            size="sm"
            className="w-fit bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2 transition-all shadow-lg shadow-black/10"
            icon={ArrowLeft}
          >
            Volver
          </Button>
          <div className="flex flex-col">
            <Title variant="h2" color="inherit" className="tracking-tight drop-shadow-sm">Certificado de Ingresos y Retenciones</Title>
            <Text variant="body2" color="inherit" className="opacity-90 dark:text-white">
              Gestión de Información Exógena (F-2276) y Certificados (F-220) para el año fiscal actual.
            </Text>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isAdminAccess ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Lado Contabilidad: Carga de Datos */}
        {isAdminAccess && (
          <MaterialCard className="group relative overflow-hidden border-none shadow-lg transition-all hover:shadow-2xl dark:bg-neutral-800/40 dark:backdrop-blur-md dark:border dark:border-white/5">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary-400 to-primary-600"></div>
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300">
                  <Upload size={24} />
                </div>
                <div>
                  <Title variant="h4" className="text-xl dark:text-white">Cargar Información 2276</Title>
                  <Text variant="caption" className="text-gray-500 dark:text-gray-400">Importación masiva vía Excel</Text>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Año Gravable"
                    type="number"
                    value={uploadYear.toString()}
                    onChange={(e) => setUploadYear(parseInt(e.target.value))}
                    className="bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-700"
                  />
                </div>

                <div
                  className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 transition-all duration-300 ${selectedFile
                    ? 'border-primary-500 bg-primary-50/10'
                    : 'border-neutral-200 hover:border-primary-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900/50'
                    }`}
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                >
                  <Input
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                        <CheckCircle size={32} />
                      </div>
                      <div className="text-center">
                        <Text weight="bold" className="text-lg dark:text-white">{selectedFile.name}</Text>
                        <Text variant="caption" className="text-primary-500 dark:text-primary-400 font-medium">Documento listo para procesar</Text>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform duration-300">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900/80">
                        <FileText size={32} />
                      </div>
                      <div className="text-center">
                        <Text weight="medium" className="dark:text-gray-300">Seleccionar formato Excel</Text>
                        <Text variant="caption" className="text-gray-500 dark:text-gray-400">O arrastra el archivo aquí</Text>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    fullWidth
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                    className="h-12 rounded-2xl shadow-lg shadow-primary-500/20 active:scale-[0.98]"
                  >
                    {loading ? 'Procesando datos...' : 'Procesar e Importar'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => ImpuestosService.descargarPlantilla()}
                    icon={Download}
                    title="Descargar Plantilla en Blanco"
                    className="h-12 w-12 rounded-2xl border border-neutral-200 dark:border-white/10 dark:text-gray-300 hover:dark:bg-white/5"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => navigate('/service-portal/gestion-humana/datos')}
                    className="justify-start text-primary-500 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
                  >
                    <FileText size={18} className="mr-2" />
                    Explorar base de datos 2276
                  </Button>
                </div>
              </div>
            </div>
          </MaterialCard>
        )}

        {/* Lado Usuario: Descarga de Certificados */}
        <MaterialCard className="group relative overflow-hidden border-none shadow-lg transition-all hover:shadow-2xl dark:bg-neutral-800/40 dark:backdrop-blur-md dark:border dark:border-white/5">
          {/* Icono de fondo decorativo estilo Adobe PDF */}
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.05] dark:opacity-[0.12] rotate-12 pointer-events-none transition-transform group-hover:scale-110 duration-700">
            <AdobePdfIcon size={180} />
          </div>

          <div className="p-8 space-y-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <FileText size={24} />
              </div>
              <div>
                <Title variant="h4" className="text-xl dark:text-white">Certificados F-220</Title>
                <Text variant="caption" className="text-gray-500 dark:text-gray-400">Disponibles para descarga inmediata</Text>
              </div>
            </div>

            {años.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <Calendar className="mx-auto text-neutral-200 dark:text-neutral-800 w-20 h-20" />
                <div className="max-w-xs mx-auto">
                  <Text className="text-gray-500 dark:text-gray-400">Actualmente no hay certificados generados para este usuario.</Text>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {años.map(ano => (
                  <div
                    key={ano}
                    className="group/item flex items-center justify-between p-5 rounded-2xl border border-neutral-100 bg-white shadow-sm ring-1 ring-black/[0.05] transition-all hover:border-primary-200 hover:shadow-md dark:border-neutral-700/50 dark:bg-neutral-800/80 hover:dark:border-primary-500/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500 transition-colors group-hover/item:bg-primary-50 group-hover/item:text-primary-500 dark:bg-neutral-900/50">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <Text weight="bold" className="text-lg dark:text-white">Año {ano}</Text>
                        <Text variant="caption" className="text-gray-500 dark:text-gray-400">Ingresos y Retenciones</Text>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadCert(ano)}
                      className="rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-500/20 dark:text-primary-300 dark:hover:bg-primary-500/30"
                      icon={AdobePdfIcon}
                    >
                      PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MaterialCard>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-primary-600 to-primary-800 p-6 text-white shadow-2xl dark:shadow-primary-900/20">
        <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 skew-x-12 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-inner">
            <HelpCircle size={32} className="text-white drop-shadow-md" />
          </div>
          <div className="flex-1 space-y-2">
            <Title variant="h3" color="inherit" className="text-2xl font-bold drop-shadow-sm">¿Necesitas soporte técnico?</Title>
            <Text variant="body1" color="inherit" className="max-w-2xl opacity-90 leading-relaxed text-sm dark:text-white">
              Si detectas discrepancias en los valores de tu certificado o requieres un año fiscal que no figura en la lista, el equipo de Contabilidad está listo para asistirte en la validación de tu información.
            </Text>
            <div className="pt-1">
              <Button
                variant="ghost"
                onClick={() => navigate('/service-portal/servicios/mejoramiento', { state: { from: location.pathname } })}
                className="bg-white text-primary-700 hover:bg-neutral-100 dark:bg-white dark:text-primary-900 px-5 py-1.5 rounded-xl font-bold text-sm shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                Contactar a Soporte
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute right-[-40px] bottom-[-40px] opacity-10 rotate-12 scale-150">
          <FileText size={200} />
        </div>
      </div>
    </div>
  );
};

export default CertificadoIngresosView;
