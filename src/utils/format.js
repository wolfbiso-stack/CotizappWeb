// Utility function to format currency with thousand separators
export const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Utility function to format dates that might be in text format (DD/MM/YYYY)
export const formatServiceDate = (dateString) => {
    if (!dateString) return '-';

    // If it's YYYY-MM-DD, append time to ensure local parsing
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const date = new Date(dateString + 'T00:00:00');
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
        }
    }

    // Try native parsing
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
    }
    // Try parsing DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        date = new Date(`${year}-${month}-${day}T00:00:00`);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
        }
    }
    return dateString; // Fallback to original string
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
