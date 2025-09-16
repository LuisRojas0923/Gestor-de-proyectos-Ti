import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';

interface ExcelImporterProps<T> {
  onImport: (data: T[]) => void;
  columnMapping: { [key: string]: string };
  identifierKey: keyof T;
  darkMode: boolean;
}

const ExcelImporter = <T extends Record<string, any>>({ onImport, columnMapping, identifierKey, darkMode }: ExcelImporterProps<T>) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setPreviewData([]);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Configurar opciones de lectura para archivos Excel
        
        const workbook = XLSX.read(data, { 
          type: 'binary', 
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Extraer hipervínculos de todas las celdas
        const hyperlinks: { [key: string]: string } = {};
        Object.keys(worksheet).forEach(key => {
          if (key.startsWith('!')) return; // Skip metadata
          const cell = worksheet[key];
          if (cell && cell.l) { // l = hyperlink property
            hyperlinks[key] = cell.l.Target || cell.l;
          }
        });
        
        // Leer todas las filas como array
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { 
          header: 1, // Use array format
          defval: '', // Default value for empty cells
          blankrows: false // Skip blank rows
        });
        
        // Los encabezados están en la fila 1 (segunda fila, índice 1)
        // Los datos empiezan desde la fila 2 (índice 2)
        if (jsonData.length < 2) {
          setError('El archivo no tiene suficientes filas. Se esperan encabezados en la segunda fila.');
          return;
        }
        
        const headers = jsonData[1]; // Fila 1 = segunda fila (encabezados)
        const dataRows = jsonData.slice(2); // Datos desde la fila 2 en adelante
        
        // Crear mapeo de índices de columnas
        const columnIndexMap: { [key: string]: number } = {};
        headers.forEach((header: string, index: number) => {
          if (header && typeof header === 'string') {
            columnIndexMap[header.trim()] = index;
          }
        });
        
        // Verificar que tenemos las columnas necesarias
        const requiredColumns = Object.keys(columnMapping);
        const missingColumns = requiredColumns.filter(col => !(col in columnIndexMap));
        
        if (missingColumns.length > 0) {
          setError(`Faltan las siguientes columnas requeridas: ${missingColumns.join(', ')}`);
          return;
        }
        
        const mappedData = dataRows.map((row, rowIndex) => {
          const newRow: any = {};
          
          for (const excelHeader in columnMapping) {
            const objectKey = columnMapping[excelHeader];
            const colIndex = columnIndexMap[excelHeader];
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: colIndex }); // +2 porque los datos empiezan en fila 2
            
            if (row[colIndex] !== undefined && row[colIndex] !== '') {
              newRow[objectKey] = row[colIndex];
              
              // Si es la columna 'ID de la incidencia*+' y tiene hipervínculo, extraer remedy_link
              if (excelHeader === 'ID de la incidencia*+' && hyperlinks[cellAddress]) {
                newRow['remedy_link'] = hyperlinks[cellAddress];
              }
            }
          }
          return newRow as T;
        }).filter(row => row[identifierKey]); // Ensure the row has the identifier

        setPreviewData(mappedData);
      } catch (err) {
        setError('Error al procesar el archivo. Asegúrate de que sea un formato de Excel válido (.xls o .xlsx) y que los encabezados estén en la segunda fila.');
        console.error(err);
      }
    };
    reader.onerror = () => {
        setError('No se pudo leer el archivo.');
    }
    reader.readAsBinaryString(file);
  };

  const handleImportClick = () => {
    if (previewData.length > 0) {
      onImport(previewData);
      setFile(null);
      setPreviewData([]);
    }
  };

  return (
    <div className={`border rounded-xl p-6 ${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white'}`}>
      <div className="flex flex-col items-center space-y-4">
        <label htmlFor="excel-upload" className={`cursor-pointer w-full p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${darkMode ? 'border-neutral-600 hover:border-primary-500 hover:bg-neutral-700' : 'border-neutral-300 hover:border-primary-500 hover:bg-neutral-50'}`}>
          <Upload size={40} className={darkMode ? 'text-neutral-400' : 'text-neutral-500'} />
          <p className={`mt-2 text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
            {file ? file.name : 'Arrastra un archivo de Excel aquí o haz clic para seleccionar'}
          </p>
          <input
            id="excel-upload"
            type="file"
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
          />
        </label>

        {error && (
            <div className="w-full text-center p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center justify-center">
                <AlertTriangle size={18} className="mr-2"/>
                <span>{error}</span>
            </div>
        )}
        
        {previewData.length > 0 && (
          <div className="w-full">
            <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Vista Previa ({previewData.length} registros)</h4>
            <div className="max-h-60 overflow-y-auto border rounded-lg dark:border-neutral-700">
              <table className="min-w-full text-sm">
                <thead className={darkMode ? 'bg-neutral-700' : 'bg-neutral-100'}>
                  <tr>
                    {Object.values(columnMapping).map(header => (
                      <th key={header} className="p-2 text-left font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-700">
                  {previewData.slice(0, 10).map((row, index) => (
                    <tr key={index} className={darkMode ? 'bg-neutral-800' : 'bg-white'}>
                      {Object.values(columnMapping).map(key => (
                         <td key={key} className="p-2 whitespace-nowrap">{String(row[key] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
               {previewData.length > 10 && <p className="text-center text-xs p-2 dark:text-neutral-400 text-neutral-500">... y {previewData.length - 10} más.</p>}
            </div>
          </div>
        )}

        <button
          onClick={handleImportClick}
          disabled={previewData.length === 0}
          className="w-full px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:bg-neutral-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
        >
          <CheckCircle size={20} />
          <span>Importar {previewData.length > 0 ? `${previewData.length} Registros` : ''}</span>
        </button>
      </div>
    </div>
  );
};

export default ExcelImporter;
