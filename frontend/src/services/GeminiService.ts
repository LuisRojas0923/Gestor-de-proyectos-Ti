const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
const API_KEY = ""; // Obtener de variable de entorno en producción

/**
 * Llama a la API de Gemini con manejo de reintentos
 */
export const callGeminiAPI = async (userQuery: string, systemPrompt: string): Promise<string> => {
    if (!API_KEY) {
        return "ERROR: La clave de la API de Gemini no está configurada.";
    }

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    let delay = 1000;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${BASE_API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                return result.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: No se pudo generar contenido.';
            } else if (response.status === 429 && i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                const errorResult = await response.json();
                return `Error del servicio: ${response.status} - ${errorResult.error?.message || 'Error desconocido'}`;
            }
        } catch (error) {
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                return 'Error de conexión al servidor de IA.';
            }
        }
    }
    return 'Error al generar contenido tras reintentos.';
};
