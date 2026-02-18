
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

/**
 * Formats a date string specifically for HTML <input type="date">
 * Handles ISO strings, DD/MM/YYYY, and normal date strings.
 * Always returns YYYY-MM-DD format.
 */
export const formatDateForInput = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-CA');

    try {
        // If it's already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        // If it's DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
            const [day, month, year] = dateString.split('/');
            return `${year}-${month}-${day}`;
        }

        // Handle ISO strings with 'T' or other standard date strings
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            // Use en-CA for YYYY-MM-DD format
            return date.toLocaleDateString('en-CA');
        }

        return new Date().toLocaleDateString('en-CA'); // Final fallback
    } catch (error) {
        console.error("Error formatting date for input:", error);
        return new Date().toLocaleDateString('en-CA');
    }
};
