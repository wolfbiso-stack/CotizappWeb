// Conversor de importes numéricos a letra en español respetando moneda y centavos exactos

const UNITS = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
    'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
];

const TENS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

const CURRENCIES = {
    MXN: { singular: 'PESO', plural: 'PESOS', suffix: 'M.N.' },
    USD: { singular: 'DÓLAR', plural: 'DÓLARES', suffix: 'USD' },
    EUR: { singular: 'EURO', plural: 'EUROS', suffix: 'EUR' },
    XXX: { singular: '', plural: '', suffix: '' }
};

const convertGroup = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    const parts = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;

    if (h > 0) parts.push(HUNDREDS[h]);

    if (rem > 0) {
        if (rem < 30) {
            parts.push(UNITS[rem]);
        } else {
            const t = Math.floor(rem / 10);
            const u = rem % 10;
            parts.push(u > 0 ? `${TENS[t]} Y ${UNITS[u]}` : TENS[t]);
        }
    }

    return parts.join(' ');
};

const integerToWords = (intVal) => {
    if (intVal === 0) return 'CERO';
    if (!Number.isFinite(intVal) || intVal < 0) return '';

    const billions = Math.floor(intVal / 1_000_000_000);
    const millions = Math.floor((intVal % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((intVal % 1_000_000) / 1_000);
    const remainder = intVal % 1_000;

    const segments = [];

    if (billions > 0) {
        segments.push(billions === 1 ? 'MIL MILLONES' : `${convertGroup(billions)} MIL MILLONES`);
    }
    if (millions > 0) {
        segments.push(millions === 1 ? 'UN MILLÓN' : `${convertGroup(millions)} MILLONES`);
    }
    if (thousands > 0) {
        segments.push(thousands === 1 ? 'MIL' : `${convertGroup(thousands)} MIL`);
    }
    if (remainder > 0) {
        segments.push(convertGroup(remainder));
    }

    return segments.join(' ').trim();
};

export const amountToWords = (rawAmount, currencyCode = 'MXN') => {
    const code = String(currencyCode || 'MXN').trim().toUpperCase();
    if (code === 'XXX') return '';

    const str = String(rawAmount ?? '0').trim().replace(/,/g, '');
    const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!match) return '';

    const isNegative = Boolean(match[1]);
    const intPart = parseInt(match[2], 10);
    const rawFrac = match[3] || '00';
    const cents = rawFrac.padEnd(2, '0').slice(0, 2);

    const words = integerToWords(intPart);
    const cur = CURRENCIES[code] || { singular: code, plural: code, suffix: code };
    const unitLabel = intPart === 1 ? cur.singular : cur.plural;
    const needsDe = intPart > 0 && intPart % 1_000_000 === 0;
    const prefix = isNegative ? 'MENOS ' : '';

    return `${prefix}${words}${needsDe ? ' DE' : ''} ${unitLabel} ${cents}/100 ${cur.suffix}`.replace(/\s+/g, ' ').trim();
};
