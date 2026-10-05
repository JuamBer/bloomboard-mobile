/** "mar, 30 sept 2026" / "Tue, 30 Sep 2026" — a workout's day. */
export const formatWorkoutDate = (iso: string, language: string) =>
  new Date(iso).toLocaleDateString(language === 'en' ? 'en-GB' : 'es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** "30 sept" — a chart's axis tick. */
export const formatShortDate = (iso: string, language: string) =>
  new Date(iso).toLocaleDateString(language === 'en' ? 'en-GB' : 'es-ES', {
    day: 'numeric',
    month: 'short',
  });

/** "18:05" */
export const formatTime = (iso: string, language: string) =>
  new Date(iso).toLocaleTimeString(language === 'en' ? 'en-GB' : 'es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

/** "1 h 05 min" / "45 min" */
export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
};
