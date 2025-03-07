
/**
 * Utilitaires pour la conversion et le formatage des dates
 */

/**
 * Convertit un timestamp en date locale formatée selon les conventions françaises
 * @param timestamp Le timestamp à convertir (string ou number)
 * @param options Options de formatage supplémentaires
 * @returns Chaîne formatée selon les conventions françaises
 */
export function formatLocalDate(timestamp: string | number, options?: Intl.DateTimeFormatOptions): string {
  // Forcer l'interprétation en UTC si c'est une chaîne
  const utcTimestamp = typeof timestamp === 'string' ? timestamp + "Z" : timestamp;
  
  // Créer une date locale
  const localDate = new Date(utcTimestamp);
  
  // Options par défaut pour le format français
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  // Fusionner les options par défaut avec les options personnalisées
  const formattingOptions = { ...defaultOptions, ...options };
  
  // Retourner la date formatée
  return localDate.toLocaleString('fr-FR', formattingOptions);
}

/**
 * Convertit un timestamp en objet Date
 * @param timestamp Le timestamp à convertir (string ou number)
 * @returns Objet Date
 */
export function parseToLocalDate(timestamp: string | number): Date {
  // Forcer l'interprétation en UTC si c'est une chaîne
  const utcTimestamp = typeof timestamp === 'string' ? timestamp + "Z" : timestamp;
  
  // Retourner un objet Date
  return new Date(utcTimestamp);
}
