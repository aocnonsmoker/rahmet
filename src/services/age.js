import moment from 'moment';

/** "1 год", "3 года", "5 лет", "11 лет", "21 год". */
export function ageLabel(age) {
  if (age == null || age === '') return '';
  const n = Number(age);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = 'лет';
  if (mod10 === 1 && mod100 !== 11) word = 'год';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'года';
  return `${n} ${word}`;
}

/** Full years from a "YYYY-MM-DD" birth date to today, or null. */
export function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const born = moment(birthDate, 'YYYY-MM-DD', true);
  if (!born.isValid() || born.isAfter(moment(), 'day')) return null;
  return moment().diff(born, 'years');
}
