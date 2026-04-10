import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input } from '../../../../components/atoms';
import { Upload, Download, FileText, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
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
    <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" onClick={onBack} size="sm" className="p-2" icon={ArrowLeft} />
        <div className="flex flex-col">
          <Title variant="h3" color="text-primary">Certificado de Ingresos y Retenciones</Title>
          <Text variant="caption" color="text-secondary">Gestión de Información Exógena (F-2276) y Certificados (F-220)</Text>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Contabilidad: Carga de Datos */}
        {isContabilidad && (
          <MaterialCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <Upload className="text-primary-500" />
              <Title variant="h4">Cargar Información Exógena (2276)</Title>
            </div>
            
            <div className="space-y-4">
              <div>
                <Input 
                  label="Año Gravable"
                  type="number" 
                  value={uploadYear.toString()}
                  onChange={(e) => setUploadYear(parseInt(e.target.value))}
                />
              </div>

              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedFile ? 'border-success-500 bg-success-50/10' : 'border-neutral-300 hover:border-primary-500'}`}
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
              >
                <Input 
                  type="file" 
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="text-success-500 w-10 h-10" />
                    <Text weight="bold">{selectedFile.name}</Text>
                    <Text variant="caption">Listo para cargar</Text>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="text-neutral-400 w-10 h-10" />
                    <Text>Click para seleccionar archivo Excel</Text>
                    <Text variant="caption">Formato 2276 oficial</Text>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  fullWidth 
                  onClick={handleUpload} 
                  disabled={!selectedFile || loading}
                >
                  {loading ? 'Procesando...' : 'Procesar e Importar'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => ImpuestosService.descargarPlantilla()}
                  icon={Download}
                  title="Descargar Plantilla en Blanco"
                />
              </div>

              <div className="pt-4 border-t border-[var(--color-border)]">
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => navigate('/service-portal/contabilidad/datos')}
                  icon={FileText}
                >
                  Ver datos del formato 2276
                </Button>
              </div>
            </div>
          </MaterialCard>
        )}

        {/* Lado Usuario: Descarga de Certificados */}
        <MaterialCard className="p-6 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <FileText className="text-primary-500" />
            <Title variant="h4">Mis Certificados (Formato 220)</Title>
          </div>

          {años.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Calendar className="mx-auto text-neutral-300 w-12 h-12" />
              <Text color="text-secondary">No hay certificados disponibles para tu identificación.</Text>
            </div>
          ) : (
            <div className="space-y-3">
              {años.map(ano => (
                <div key={ano} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                      <Calendar size={20} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <Text weight="bold">Año Gravable {ano}</Text>
                      <Text variant="caption">Certificado de Ingresos y Retenciones</Text>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDownloadCert(ano)}
                    icon={Download}
                  >
                    Descargar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </MaterialCard>
      </div>

      <MaterialCard className="p-6 bg-primary-500 text-white overflow-hidden relative">
        <div className="relative z-10 space-y-2">
          <Title variant="h4" color="inherit">¿Necesitas ayuda con tus impuestos?</Title>
          <Text variant="body2" color="inherit" className="opacity-90">
            Si encuentras inconsistencias en tu certificado o el año que buscas no aparece, contacta al departamento de contabilidad.
          </Text>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <FileText size={160} />
        </div>
      </MaterialCard>
    </div>
  );
};

export default ContabilidadPortal;
