import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface ContabilidadPortalProps {
  user: User;
  onBack: () => void;
}

const ContabilidadPortal: React.FC<ContabilidadPortalProps> = ({ user, onBack }) => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [años, setAños] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear() - 1);

  const isContabilidad = user.role === 'contabilidad' || user.role === 'admin' || user.role === 'admin_sistemas';

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
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
      {/* Header Vanguard: Glassmorphism effect and integrated navigation */}
      <div className="relative overflow-hidden rounded-3xl bg-primary-500 p-8 text-white shadow-xl dark:bg-primary-900/40 dark:backdrop-blur-md border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-32 w-32 rounded-full bg-primary-400/20 blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <Button
            variant="custom"
            onClick={onBack}
            size="sm"
            className="w-fit bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2 transition-all"
            icon={ArrowLeft}
          >
            Volver
          </Button>
          <div className="flex flex-col">
            <Title variant="h2" color="inherit" className="tracking-tight">Certificado de Ingresos y Retenciones</Title>
            <Text variant="body2" color="inherit" className="opacity-80">
              Gestión de Información Exógena (F-2276) y Certificados (F-220) para el año fiscal actual.
            </Text>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isContabilidad ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Lado Contabilidad: Carga de Datos */}
        {isContabilidad && (
          <MaterialCard className="group relative overflow-hidden border-none shadow-lg transition-all hover:shadow-2xl dark:bg-neutral-900/60 dark:backdrop-blur-sm">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary-400 to-primary-600"></div>
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
                  <Upload size={24} />
                </div>
                <div>
                  <Title variant="h4" className="text-xl">Cargar Información 2276</Title>
                  <Text variant="caption" color="text-secondary">Importación masiva vía Excel</Text>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Año Gravable"
                    type="number"
                    value={uploadYear.toString()}
                    onChange={(e) => setUploadYear(parseInt(e.target.value))}
                    className="bg-neutral-50 dark:bg-neutral-800/50"
                  />
                </div>

                <div
                  className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 transition-all duration-300 ${selectedFile
                    ? 'border-primary-500 bg-primary-50/10'
                    : 'border-neutral-200 hover:border-primary-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/30'
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
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg">
                        <CheckCircle size={32} />
                      </div>
                      <div className="text-center">
                        <Text weight="bold" className="text-lg">{selectedFile.name}</Text>
                        <Text variant="caption" className="text-primary-500">Documento listo para procesar</Text>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 group-hover:scale-105 transition-transform duration-300">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                        <FileText size={32} />
                      </div>
                      <div className="text-center">
                        <Text weight="medium">Seleccionar formato Excel</Text>
                        <Text variant="caption" color="text-secondary">O arrastra el archivo aquí</Text>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    fullWidth
                    onClick={handleUpload}
                    disabled={!selectedFile || loading}
                    className="h-12 rounded-2xl shadow-lg shadow-primary-500/20"
                  >
                    {loading ? 'Procesando datos...' : 'Procesar e Importar'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => ImpuestosService.descargarPlantilla()}
                    icon={Download}
                    title="Descargar Plantilla en Blanco"
                    className="h-12 w-12 rounded-2xl border border-neutral-200 dark:border-neutral-700"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => navigate('/service-portal/contabilidad/datos')}
                    className="justify-start text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
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
        <MaterialCard className="group relative overflow-hidden border-none shadow-lg transition-all hover:shadow-2xl dark:bg-neutral-900/60 dark:backdrop-blur-sm">
          {/* Icono de fondo decorativo estilo Adobe PDF */}
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] dark:opacity-[0.08] rotate-12 pointer-events-none">
            <AdobePdfIcon size={180} />
          </div>

          <div className="p-8 space-y-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <FileText size={24} />
              </div>
              <div>
                <Title variant="h4" className="text-xl">Certificados F-220</Title>
                <Text variant="caption" color="text-secondary">Disponibles para descarga inmediata</Text>
              </div>
            </div>

            {años.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <Calendar className="mx-auto text-neutral-200 dark:text-neutral-800 w-20 h-20" />
                <div className="max-w-xs mx-auto">
                  <Text color="text-secondary">Actualmente no hay certificados generados para este usuario.</Text>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {años.map(ano => (
                  <div
                    key={ano}
                    className="group/item flex items-center justify-between p-5 rounded-2xl border border-neutral-100 bg-white shadow-sm ring-1 ring-black/[0.05] transition-all hover:border-primary-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800/40"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500 transition-colors group-hover/item:bg-primary-50 group-hover/item:text-primary-500 dark:bg-neutral-800">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <Text weight="bold" className="text-lg">Año {ano}</Text>
                        <Text variant="caption" color="text-secondary">Ingresos y Retenciones</Text>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadCert(ano)}
                      className="rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300"
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

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-primary-600 to-primary-800 p-6 text-white shadow-2xl">
        <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 skew-x-12 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-inner">
            <HelpCircle size={32} className="text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <Title variant="h3" color="inherit" className="text-2xl font-bold">¿Necesitas soporte técnico?</Title>
            <Text variant="body1" color="inherit" className="max-w-2xl opacity-90 leading-relaxed text-sm">
              Si detectas discrepancias en los valores de tu certificado o requieres un año fiscal que no figura en la lista, el equipo de Contabilidad está listo para asistirte en la validación de tu información.
            </Text>
            <div className="pt-1">
              <Button
                variant="ghost"
                onClick={() => navigate('/service-portal/servicios/mejoramiento')}
                className="bg-white text-primary-700 hover:bg-neutral-100 dark:bg-white dark:text-primary-900 px-5 py-1.5 rounded-xl font-bold text-sm"
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

export default ContabilidadPortal;
