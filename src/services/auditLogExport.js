import moment from 'moment';
import { apiFetch } from '@/services/api';

export const AUDIT_ENTITY_LABELS = {
  trainers: 'Тренеры',
  resources: 'Группы/ресурсы',
  group_schedules: 'Расписание групп',
  sections: 'Разделы',
  records: 'Записи',
  clients: 'Клиенты',
  memberships: 'Абонементы',
  attendance: 'Посещаемость',
  trial_lessons: 'Пробные занятия',
  users: 'Сотрудники',
};

export const AUDIT_ACTION_LABELS = {
  create: 'Добавление',
  update: 'Изменение',
  delete: 'Удаление',
  renew: 'Продление',
};

// Backend caps /audit_logs at 500 rows per request.
const EXPORT_PAGE_SIZE = 500;

// Same badge colors as the on-screen table, as ARGB.
const ACTION_COLORS = {
  create: { fill: 'FFDCFCE7', font: 'FF166534' },
  update: { fill: 'FFE0E7FF', font: 'FF3730A3' },
  delete: { fill: 'FFFFE4E6', font: 'FFBE123C' },
  renew: { fill: 'FFF3E8FF', font: 'FF6B21A8' },
};

const THIN = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const COLUMNS = [
  { header: 'Дата', width: 18 },
  { header: 'Действие', width: 14 },
  { header: 'Тип', width: 20 },
  { header: 'Описание', width: 45 },
  { header: 'Раздел', width: 18 },
  { header: 'Сотрудник', width: 16 },
];

// The screen only loads 50 rows at a time ("Показать ещё"); the export should
// contain everything matching the current filters, not just what's loaded.
async function fetchAllLogs(filters) {
  const all = [];
  for (;;) {
    const params = new URLSearchParams({ ...filters, limit: EXPORT_PAGE_SIZE, offset: all.length });
    const page = await apiFetch(`/audit_logs?${params}`);
    all.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) return all;
  }
}

function periodLabel(filters) {
  const from = filters.start_date ? moment(filters.start_date).format('DD.MM.YYYY') : null;
  const to = filters.end_date ? moment(filters.end_date).format('DD.MM.YYYY') : null;
  if (from && to) return `с ${from} по ${to}`;
  if (from) return `с ${from}`;
  if (to) return `по ${to}`;
  return 'за всё время';
}

/** Returns the number of exported rows (0 means nothing was downloaded). */
export async function exportAuditLogXlsx(filters) {
  // ExcelJS is large — loaded only when someone actually exports.
  const [logs, { default: ExcelJS }] = await Promise.all([fetchAllLogs(filters), import('exceljs')]);
  if (!logs.length) return 0;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Журнал событий', {
    views: [{ state: 'frozen', ySplit: 2, showGridLines: true }],
  });
  sheet.columns = COLUMNS.map((c) => ({ width: c.width }));

  const titleRow = sheet.addRow([`Журнал событий (${periodLabel(filters)})`]);
  sheet.mergeCells(1, 1, 1, COLUMNS.length);
  titleRow.height = 24;
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
  titleRow.getCell(1).alignment = { vertical: 'middle' };

  const headerRow = sheet.addRow(COLUMNS.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = CELL_BORDER;
  });
  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } };

  logs.forEach((log) => {
    const row = sheet.addRow([
      moment(log.created_at).format('DD.MM.YYYY HH:mm'),
      AUDIT_ACTION_LABELS[log.action] || log.action,
      AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type,
      log.summary || '—',
      log.section_label || '—',
      log.username || '—',
    ]);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = CELL_BORDER;
      cell.alignment = { vertical: 'top', wrapText: colNumber === 4 };
    });
    const colors = ACTION_COLORS[log.action];
    if (colors) {
      const actionCell = row.getCell(2);
      actionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.fill } };
      actionCell.font = { bold: true, color: { argb: colors.font } };
      actionCell.alignment = { horizontal: 'center', vertical: 'top' };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Журнал_событий_${moment().format('YYYY-MM-DD')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return logs.length;
}
