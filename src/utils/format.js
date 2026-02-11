
// Utility function to format currency with thousand separators
export const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Utility function to format dates to DD/MM/YYYY
export const formatServiceDate = (dateString) => {
    if (!dateString) return '-';

    // If it's already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
    }

    // If it's YYYY-MM-DD (standard database/input format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    // Try parsing ISO strings or other formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return dateString; // Fallback
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    // If we want consistent visual format everywhere, we might want to use this too,
    // but usually this is for "long" dates.
    // Let's keep it as is for now unless user asked to change ALL dates to short format.
    // User said: "haz que todas respeten ese formato" (make all respect THAT format).
    // But "formatDate" is likely used in receipts or titles where long date is better.
    // "formatServiceDate" is used in the table.
    // Let's stick to modifying formatServiceDate which is used in the list.
    
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
