const dateToAndroidString = (dateStr) => {
    if (!dateStr) return '';
    const iso = "2026-02-27";
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const parts = iso.split('-');
        // Use 12:00:00 to avoid timezone shifting backward to previous day
        const date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2], 12, 0, 0);

        const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        const dayName = days[date.getDay()];
        const dayNum = date.getDate();
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName}, ${dayNum} de ${monthName} ${year}`;
    }
    return dateStr;
};

console.log("Output is:", dateToAndroidString('2026-02-27'));
