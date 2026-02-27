
// Utility function to format currency with thousand separators
export const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Helper for standardized decoding across web and app
export const getNormalizedIsoDate = (dateString) => {
    if (!dateString) return null;

    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) return dateString.trim();

    // If it's DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString.trim())) {
        const [day, month, year] = dateString.trim().split('/');
        return `${year}-${month}-${day}`;
    }

    // Android Spanish Date: "Sabado, 27 de febrero 2026" or "27 de febrero de 2026"
    const esMatch = dateString.toLowerCase().match(/(\d{1,2})\s*de\s*([a-záéíóú]+)\s*(?:de\s*)?(\d{4})/i);
    if (esMatch) {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const day = esMatch[1].padStart(2, '0');
        const monthText = esMatch[2].normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents
        const monthIndex = months.indexOf(monthText);
        if (monthIndex !== -1) {
            const month = String(monthIndex + 1).padStart(2, '0');
            const year = esMatch[3];
            return `${year}-${month}-${day}`;
        }
    }

    // JavaScript native date parsing fallback
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-CA');
    }

    return null;
};

// Utility function to format dates to DD/MM/YYYY for UI tables
export const formatServiceDate = (dateString) => {
    if (!dateString) return '-';

    const iso = getNormalizedIsoDate(dateString);
    if (iso) {
        const [year, month, day] = iso.split('-');
        return `${day}/${month}/${year}`;
    }

    return dateString; // Ultimate fallback
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Formats a date string specifically for HTML <input type="date">
 * Handles ISO strings, DD/MM/YYYY, Android texts, and normal date strings.
 * Always returns YYYY-MM-DD format.
 */
export const formatDateForInput = (dateString) => {
    const iso = getNormalizedIsoDate(dateString);
    return iso ? iso : new Date().toLocaleDateString('en-CA');
};

/**
 * Returns a Spanish string like "Sabado, 27 de febrero 2026" 
 * as required by the native Android Intent parser
 */
export const dateToAndroidString = (dateStr) => {
    if (!dateStr) return '';
    const iso = getNormalizedIsoDate(dateStr);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const parts = iso.split('-');
        // Use 12:00:00 to avoid timezone shifting backward to previous day locally
        const date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2], 12, 0, 0);

        const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        const dayName = days[date.getDay()];
        const dayNum = String(date.getDate()).padStart(2, '0');
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName}, ${dayNum} de ${monthName} ${year}`;
    }
    return dateStr;
};
