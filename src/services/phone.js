/**
 * Formats a Kazakhstan number as "+7 701 890 22 33" for readability.
 * A leading local "8" becomes "+7". Anything that doesn't look like a
 * +7 number (foreign codes, too many digits) is returned unchanged, so
 * typing is never blocked.
 */
export function formatPhone(value) {
  const raw = value == null ? '' : String(value);
  let digits = raw.replace(/\D/g, '');
  if (!digits) return raw.trim().startsWith('+') ? '+' : '';
  if (digits.startsWith('8') && !raw.trim().startsWith('+')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7') || digits.length > 11) return raw;

  const rest = digits.slice(1);
  const parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 8), rest.slice(8, 10)].filter(Boolean);
  return ['+7', ...parts].join(' ');
}
