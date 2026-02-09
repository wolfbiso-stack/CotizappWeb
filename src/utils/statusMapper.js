// Status mapping utilities for repair tracking

export const STATUS_OPTIONS = [
  { value: 'recibido', label: 'Recibido', color: 'blue', progress: 20 },
  { value: 'diagnosticado', label: 'Diagnosticado', color: 'yellow', progress: 40 },
  { value: 'listo_para_entregar', label: 'Listo para Entregar', color: 'green', progress: 80 },
  { value: 'entregado', label: 'Entregado', color: 'purple', progress: 100 },
  { value: 'no_reparable', label: 'No fue posible reparar', color: 'red', progress: 100 }
];

export const getProgressFromStatus = (status) => {
  if (!status) return 0;
  const statusObj = STATUS_OPTIONS.find(s => s.value === status.toLowerCase());
  return statusObj ? statusObj.progress : 0;
};

export const getStatusLabel = (status) => {
  if (!status) return 'Pendiente';
  const statusObj = STATUS_OPTIONS.find(s => s.value === status.toLowerCase());
  return statusObj ? statusObj.label : status;
};

export const getStatusColor = (status) => {
  if (!status) return 'gray';
  const statusObj = STATUS_OPTIONS.find(s => s.value === status.toLowerCase());
  return statusObj ? statusObj.color : 'gray';
};
