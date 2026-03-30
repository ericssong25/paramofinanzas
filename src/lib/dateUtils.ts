/**
 * Parsea una fecha ISO (YYYY-MM-DD) como hora local para evitar el desfase de un día
 * cuando se muestra en zonas horarias detrás de UTC.
 */
export function parseDateLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatDateLocal(dateStr: string | null | undefined): string {
  const date = parseDateLocal(dateStr);
  return date ? date.toLocaleDateString('es-ES') : '-';
}

/** Día del mes (1–31) guardado en fecha_corte */
export function getDiaCorte(dateStr: string | null | undefined): number | null {
  const d = parseDateLocal(dateStr);
  return d ? d.getDate() : null;
}

/**
 * Próxima fecha de calendario ≥ hoy que coincide con ese día del mes
 * (ajusta 31 → último día en meses cortos).
 */
export function getNextDayOfMonthOccurrence(dayOfMonth: number, from: Date = new Date()): Date {
  const y0 = from.getFullYear();
  const m0 = from.getMonth();
  const d0 = from.getDate();
  const startOfToday = new Date(y0, m0, d0);

  for (let i = 0; i < 24; i++) {
    const cal = new Date(y0, m0 + i, 1);
    const y = cal.getFullYear();
    const m = cal.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const day = Math.min(dayOfMonth, dim);
    const candidate = new Date(y, m, day);
    if (candidate >= startOfToday) return candidate;
  }
  return startOfToday;
}

/** Etiqueta para tabla Clientes: "24 de cada mes" */
export function formatDiaDeCadaMes(dateStr: string | null | undefined): string {
  const dia = getDiaCorte(dateStr);
  if (dia == null) return '-';
  return `${dia} de cada mes`;
}

/** Para clientes quincenales, calcula dos dias estimados de corte dentro del mes. */
export function getDiasCorteQuincenal(
  dateStr: string | null | undefined
): { primera: number; segunda: number } | null {
  const diaBase = getDiaCorte(dateStr);
  if (diaBase == null) return null;
  const segunda = Math.min(diaBase + 15, 30);
  return { primera: diaBase, segunda };
}

export function formatDiasCorteQuincenal(dateStr: string | null | undefined): string {
  const dias = getDiasCorteQuincenal(dateStr);
  if (!dias) return '-';
  return `${dias.primera} y ${dias.segunda} de cada mes`;
}

/** Etiqueta para dashboard: "Próximo 24" */
export function formatProximoDiaLabel(dateStr: string | null | undefined): string {
  const dia = getDiaCorte(dateStr);
  if (dia == null) return '-';
  return `Próximo ${dia}`;
}

/** Timestamp de la próxima ocurrencia del día de corte (para ordenar). Sin fecha → null. */
export function getNextCorteTimestamp(
  fechaCorte: string | null | undefined,
  from: Date = new Date()
): number | null {
  const dia = getDiaCorte(fechaCorte);
  if (dia == null) return null;
  return getNextDayOfMonthOccurrence(dia, from).getTime();
}
