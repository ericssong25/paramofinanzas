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
