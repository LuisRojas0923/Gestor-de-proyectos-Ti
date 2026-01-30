export const formatFriendlyDate = (dateString: string | undefined) => {
    if (!dateString) return 'Fecha no especificada';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Fallback al original si no es fecha válida

        return date.toLocaleString('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return dateString;
    }
};

export const formatShortDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
};
