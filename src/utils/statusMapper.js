// Status mapping utilities for repair tracking

export const STATUS_OPTIONS = [
    { value: 'recibido', label: 'Recibido', color: 'black', progress: 20 },
    { value: 'diagnosticado', label: 'Diagnosticado', color: 'yellow', progress: 40 },
    { value: 'listo_para_entregar', label: 'Listo para Entregar', color: 'blue', progress: 80 },
    { value: 'entregado', label: 'Entregado', color: 'green', progress: 100 },
    { value: 'no_reparable', label: 'No fue posible reparar', color: 'red', progress: 100 }
];

export const ELECTRIC_FENCE_STATUS_OPTIONS = [
    { value: 'aprobado', label: 'Aprobado', color: 'green', progress: 100 },
    { value: 'aprobado con observaciones', label: 'Aprobado con observaciones', color: 'yellow', progress: 100 },
    { value: 'requiere otra visita', label: 'Requiere otra visita', color: 'orange', progress: 50 },
    { value: 'pendiente de refacción', label: 'Pendiente de refacción', color: 'blue', progress: 60 },
    { value: 'no operativo', label: 'No operativo', color: 'red', progress: 0 }
];

export const ALL_STATUS_OPTIONS = [...STATUS_OPTIONS, ...ELECTRIC_FENCE_STATUS_OPTIONS];

export const getProgressFromStatus = (status) => {
    if (!status) return 0;
    const statusObj = ALL_STATUS_OPTIONS.find(s => s.value === status.toLowerCase());
    return statusObj ? statusObj.progress : 0;
};

export const getStatusLabel = (status) => {
    if (!status) return 'Pendiente';
    const statusObj = ALL_STATUS_OPTIONS.find(s => s.value === status.toLowerCase());
    return statusObj ? statusObj.label : status;
};

export const getStatusColor = (status) => {
    if (!status) return 'gray';
    const statusObj = ALL_STATUS_OPTIONS.find(s => s.value === status.toLowerCase());
    return statusObj ? statusObj.color : 'gray';
};
