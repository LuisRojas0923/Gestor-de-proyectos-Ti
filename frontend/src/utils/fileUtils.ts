/**
 * Convierte un objeto File a una cadena Base64 (sin el prefijo de data de datos).
 * @param file Archivo a convertir
 * @returns Promesa con el contenido en Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Extraer solo la parte de los datos (después de la coma)
            const base64String = result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * Valida el tamaño de un archivo en MB.
 * @param file Archivo a validar
 * @param maxMB Tamaño máximo permitido
 * @returns boolean
 */
export const validateFileSize = (file: File, maxMB: number = 2): boolean => {
    const fileSizeMB = file.size / (1024 * 1024);
    return fileSizeMB <= maxMB;
};
