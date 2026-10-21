const normalizeText = (s) => (s || '').toLowerCase().replace(/ё/g, 'е');
const digitsOnly = (s) => (s || '').replace(/\D/g, '');

/**
 * Matches a client/trial record against a free-text search box.
 * - Name: every word of the query must appear in the full name or parent's
 *   name, so "иванов айбар" finds "Айбар Иванов".
 * - Phone: compares digits only and matches any part of the number, so "3",
 *   "701 123", "8701123" and "45-67" all find "+77011234567".
 */
export function matchesPersonSearch(person, query) {
  const q = normalizeText(query).trim();
  if (!q) return true;

  const haystack = normalizeText(`${person.full_name || ''} ${person.parent_name || ''}`);
  if (q.split(/\s+/).every((word) => haystack.includes(word))) return true;

  // Any part of the number matches, even a single digit.
  const qDigits = digitsOnly(q);
  if (!qDigits) return false;
  const phone = digitsOnly(person.phone);
  // Local "8 7xx" format of a "+7 7xx" number — only for a longer prefix,
  // otherwise a lone "8" would turn into "7" and match every number.
  const variants = qDigits.startsWith('8') && qDigits.length >= 4 ? [qDigits, `7${qDigits.slice(1)}`] : [qDigits];
  return variants.some((v) => phone.includes(v));
}
