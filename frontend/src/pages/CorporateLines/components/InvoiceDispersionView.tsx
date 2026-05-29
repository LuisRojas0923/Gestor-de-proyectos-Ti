import React, { useState } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { 
  Button, 
  Input, 
  Title,
  Text,
  Icon,
  Badge,
} from '../../../components/atoms';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

interface ReportRow {
  co: string;
  cargo_mes: number;
  descuento_mes: number;
  impoconsumo: number;
  descuento_iva: number;
  iva_19: number;
  total: number;
}

interface FacturaAlert {
  id: number;
  linea_id: number;
  numero: string;
  total: number;
}

interface Props {
  onImport: (periodo: string, file: File) => Promise<any>;
  onFetchReport: (periodo: string) => Promise<any>;
  onFetchAlerts: (periodo: string) => Promise<any>;
  onSelectLine: (id: number) => void;
}

export const InvoiceDispersionView: React.FC<Props> = ({ 
  onImport, 
  onFetchReport, 
  onFetchAlerts, 
  onSelectLine 
}) => {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7).replace('-', ''));
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [alerts, setAlerts] = useState<FacturaAlert[]>([]);
  const { addNotification } = useNotifications();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !periodo) {
      addNotification('warning', 'Seleccione un periodo y un archivo');
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(periodo, file);
      addNotification('success', 'Factura procesada y dispersada correctamente');
      const [reportData, alertsData] = await Promise.all([
        onFetchReport(periodo),
        onFetchAlerts(periodo)
      ]);
      setReport(reportData);
      setAlerts(alertsData);
    } catch (err: any) {
      addNotification('error', err.message || 'Error al procesar factura');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadReport = async () => {
    setIsProcessing(true);
    try {
      const [reportData, alertsData] = await Promise.all([
        onFetchReport(periodo),
        onFetchAlerts(periodo)
      ]);
      setReport(reportData);
      setAlerts(alertsData);
    } catch (err: any) {
      addNotification('error', 'Error al cargar reporte');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">Periodo (AAAAMM)</Text>
            <Input 
              type="text" 
              placeholder="Ej: 202403" 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)}
              className="!rounded-2xl"
            />
          </div>
          
          <div className="flex-[2] space-y-2">
            <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60">Archivo de Factura (Excel Claro)</Text>
            <div className="relative group h-12">
              <Input 
                type="file" 
                accept=".xlsx, .xls, .xlsm" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                fullWidth
              />
              <div className="absolute inset-0 flex items-center gap-3 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl group-hover:border-primary transition-colors bg-white dark:bg-neutral-800 z-10 pointer-events-none">
                <Icon name={Upload} className="text-primary w-5 h-5" />
                <Text variant="body2" className="truncate">
                  {file ? file.name : "Seleccionar archivo .xlsx"}
                </Text>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="primary" 
              onClick={handleUpload} 
              disabled={isProcessing || !file}
              loading={isProcessing}
              className="rounded-2xl h-12 px-6"
            >
              Procesar dispersión
            </Button>
            <Button 
              variant="outline" 
              onClick={loadReport}
              className="rounded-2xl h-12 px-6"
            >
              Cargar Reporte
            </Button>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="p-0 border-2 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 rounded-3xl overflow-hidden">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/30 flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-white">
              <Icon name={AlertCircle} size="sm" />
            </div>
            <div>
              <Text weight="bold" className="text-amber-800 dark:text-amber-200">
                Se detectaron {alerts.length} líneas nuevas o sin asignar
              </Text>
              <Text variant="caption" className="text-amber-700/70 dark:text-amber-400/70">
                Estas líneas ya fueron creadas en el inventario pero requieren que asignes un responsable.
              </Text>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                onClick={() => onSelectLine(alert.linea_id)}
                className="group flex justify-between items-center p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-amber-200 dark:border-neutral-700 hover:border-amber-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col">
                  <Text weight="bold" className="text-primary">{alert.numero}</Text>
                  <Text variant="caption" className="opacity-60">Consumo: ${alert.total.toLocaleString()}</Text>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px] py-0 px-2 rounded-lg text-amber-600">GESTIONAR</Badge>
                  <Icon name={ArrowRight} size="xs" className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.length > 0 && (
        <div className="overflow-hidden rounded-3xl">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex justify-between items-center">
             <Title variant="h4">Resumen Contable por Centro de Costo (C.O)</Title>
             <Button variant="outline" size="sm" icon={Download} className="rounded-xl">Exportar PDF</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">C.O</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Cargo Mes</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Desc. Mes</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Impoconsumo</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Desc. IVA</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">IVA 19%</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {report.map((row, idx) => (
                  <tr key={`${row.id || row.cedula || 'row'}-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{row.co}</td>
                    <td className="px-6 py-4 text-right">${row.cargo_mes?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-red-500">${row.descuento_mes?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">${row.impoconsumo?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-red-500">${row.descuento_iva?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">${row.iva_19?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      ${row.total?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.length === 0 && !isProcessing && (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
           <Icon name={FileText} className="w-16 h-16 mb-4" />
           <Text>No hay datos procesados para este periodo.</Text>
        </div>
      )}
    </div>
  );
};
