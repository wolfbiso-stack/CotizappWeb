// ==============================================================================
// UTILIDADES DE SEGURIDAD, SANITIZACIÓN Y ANTI-SPAM (Cotizapp Web)
// ==============================================================================

/**
 * Sanitiza una cadena de texto eliminando etiquetas HTML, secuencias de control
 * y recortando la longitud máxima permitida.
 */
export function sanitizeInput(input, maxLength = 500) {
    if (!input || typeof input !== 'string') return '';
    
    return input
        // Eliminar etiquetas HTML y scripts
        .replace(/<[^>]*>/g, '')
        // Eliminar caracteres de control invisibles
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        // Normalizar espacios en blanco repetidos
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

/**
 * Detecta patrones conocidos de bots, inyecciones de código o spam masivo.
 */
export function isSuspiciousPayload(text) {
    if (!text || typeof text !== 'string') return false;

    const lower = text.toLowerCase();

    // 1. Detección de inyecciones de script o SQL
    const injectionPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onload=/i,
        /union\s+select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /--\s*$/m
    ];

    if (injectionPatterns.some(p => p.test(text))) {
        return true;
    }

    // 2. Detección de enlaces excesivos (típico en bots de spam)
    const urlMatches = text.match(/https?:\/\//gi);
    if (urlMatches && urlMatches.length > 2) {
        return true;
    }

    // 3. Palabras clave de spam automatizado común
    const spamKeywords = [
        'viagra',
        'cialis',
        'casino online',
        'poker bonus',
        'crypto profit',
        'earn money fast',
        'telegram bot',
        'whatsapp blast',
        'seo ranking guarantee',
        'seo backlink'
    ];

    if (spamKeywords.some(keyword => lower.includes(keyword))) {
        return true;
    }

    return false;
}

/**
 * Valida formato estricto de número telefónico (10 a 15 dígitos numéricos).
 */
export function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Valida formato seguro de correo electrónico.
 */
export function validateEmailAddress(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    if (clean.length > 100) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
}
