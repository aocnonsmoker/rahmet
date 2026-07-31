// Manual RU names instead of moment's locale system — Vite's dev-mode
// dependency pre-bundling doesn't reliably share the global `moment.locale()`
// state set in main.js with the copy of moment used inside lazy-loaded route
// chunks, silently falling back to English.
export const RU_MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export const RU_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function ruDayShort(momentDate) {
  return RU_DAYS_SHORT[momentDate.isoWeekday() - 1];
}

export function ruMonthGenitive(momentDate) {
  return RU_MONTHS_GENITIVE[momentDate.month()];
}
