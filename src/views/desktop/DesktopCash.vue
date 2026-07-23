<template>
  <ion-page class="page">
    <div class="page-header">
      <h1 class="page-title">Касса</h1>
      <div class="total-badge">Итого: {{ (tab === 1 ? totalToday : totalAnalytic).toLocaleString() }} тг.</div>
      <button class="link-btn" type="button" @click="refreshAll">
        <ion-icon :icon="refreshIcon"></ion-icon>
        Обновить
      </button>
    </div>

    <div class="tabs-row">
      <button class="tab-btn" :class="{ active: tab === 1 }" type="button" @click="tab = 1">Касса</button>
      <button class="tab-btn" :class="{ active: tab === 2 }" type="button" @click="tab = 2">Аналитика</button>
    </div>

    <!-- Касса -->
    <div v-if="tab === 1" class="tab-panel">
      <div class="date-nav">
        <button class="nav-arrow" type="button" @click="prevDay">‹</button>
        <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedToday }}</button>
        <button class="nav-arrow" type="button" @click="nextDay">›</button>
      </div>
      <DesktopModal v-model="showDateModal" title="Выберите дату">
        <MonthCalendar :model-value="today" :events="allRecordsForBadges" @update:modelValue="onPickDate" />
      </DesktopModal>

      <div class="totals-list">
        <div v-for="s in sectionsData" :key="s.key" class="totals-row">
          <span class="totals-label"><span class="dot"></span>{{ s.icon }} {{ s.label }}</span>
          <span class="totals-value">{{ (todayTotals[s.key] || 0).toLocaleString() }} тг.</span>
        </div>
      </div>
    </div>

    <!-- Аналитика -->
    <div v-if="tab === 2" class="tab-panel">
      <div class="analytic-range">
        <div class="date-field">
          <label class="date-field-label">С</label>
          <button class="date-field-btn" type="button" @click="showFromModal = true">{{ formatShort(analyticFrom) }}</button>
        </div>
        <DesktopModal v-model="showFromModal" title="Выберите дату">
          <MonthCalendar :model-value="analyticFrom" :events="allRecordsForBadges" @update:modelValue="onPickFrom" />
        </DesktopModal>

        <div class="date-field">
          <label class="date-field-label">По</label>
          <button class="date-field-btn" type="button" @click="showToModal = true">{{ formatShort(analyticTo) }}</button>
        </div>
        <DesktopModal v-model="showToModal" title="Выберите дату">
          <MonthCalendar :model-value="analyticTo" :events="allRecordsForBadges" @update:modelValue="onPickTo" />
        </DesktopModal>
      </div>

      <div class="totals-list">
        <div v-for="s in sectionsData" :key="s.key" class="totals-row">
          <span class="totals-label"><span class="dot"></span>{{ s.icon }} {{ s.label }}</span>
          <span class="totals-value">{{ (analyticTotals[s.key] || 0).toLocaleString() }} тг.</span>
        </div>
        <div class="totals-row totals-row-sum">
          <span class="totals-label">Итого</span>
          <span class="totals-value">{{ totalAnalytic.toLocaleString() }} тг.</span>
        </div>
      </div>
    </div>

    <div v-if="tab === 2" class="chart-card">
      <div class="chart-scroll" ref="chartWrapper">
        <canvas ref="chartCanvas" :width="chartWidth" :height="chartHeight"></canvas>
      </div>
    </div>
  </ion-page>
</template>

<script>
import moment from 'moment';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { IonPage, IonIcon } from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import DesktopModal from '@/components/desktop/DesktopModal.vue';
import MonthCalendar from '@/components/MonthCalendar.vue';
import { apiFetch } from '@/services/api';
import { useSectionsStore } from '@/stores/sections';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CHART_PALETTE = [
  'rgba(112,192,245,0.8)', 'rgba(137,243,146,0.8)', 'rgba(186,104,200,0.8)',
  'rgba(255,183,77,0.8)', 'rgba(240,98,146,0.8)', 'rgba(129,199,132,0.8)',
];

export default {
  name: 'DesktopCash',
  components: { IonPage, IonIcon, DesktopModal, MonthCalendar },
  data() {
    return {
      refreshIcon: refreshOutline,
      tab: 1,
      showDateModal: false,
      showFromModal: false,
      showToModal: false,
      sectionsData: [],
      today: moment().format('YYYY-MM-DD'),
      todayTotals: {},
      analyticFrom: moment().startOf('month').format('YYYY-MM-DD'),
      analyticTo: moment().format('YYYY-MM-DD'),
      analyticTotals: {},
      chartInstance: null,
      chartWidth: 600,
      chartHeight: 320,
    };
  },
  computed: {
    formattedToday() {
      const date = new Date(`${this.today}T00:00:00`);
      const str = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    allRecordsForBadges() {
      return this.sectionsData.flatMap((s) => s.records);
    },
    totalToday() {
      return Object.values(this.todayTotals).reduce((s, v) => s + v, 0);
    },
    totalAnalytic() {
      return Object.values(this.analyticTotals).reduce((s, v) => s + v, 0);
    },
  },
  async mounted() {
    await this.refreshAll();
    this.$watch('today', this.sumTotals);
    this.$watch('tab', (val) => {
      if (val === 2) this.buildAnalytic();
    });
  },
  methods: {
    formatShort(date) {
      if (!date) return 'Выберите дату';
      const d = new Date(`${date}T00:00:00`);
      return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d);
    },
    onPickDate(date) {
      this.today = date;
      this.showDateModal = false;
    },
    prevDay() {
      this.today = moment(this.today).subtract(1, 'day').format('YYYY-MM-DD');
    },
    nextDay() {
      this.today = moment(this.today).add(1, 'day').format('YYYY-MM-DD');
    },
    onPickFrom(date) {
      this.analyticFrom = date;
      this.showFromModal = false;
      this.buildAnalytic();
    },
    onPickTo(date) {
      this.analyticTo = date;
      this.showToModal = false;
      this.buildAnalytic();
    },
    async refreshAll() {
      const sections = useSectionsStore();
      await sections.refresh();
      const enabled = sections.items.filter((s) => s.enabled);
      this.sectionsData = await Promise.all(
        enabled.map(async (s) => {
          const result = await apiFetch(`/records?section=${s.key}`);
          const records = result.map((r) => ({ ...r, start: this.formatDate(r.start), end: r.end ? this.formatDate(r.end) : null }));
          return { key: s.key, label: s.label, icon: s.icon, template: s.template, records };
        })
      );
      this.sumTotals();
      if (this.tab === 2) this.buildAnalytic();
    },
    formatDate(dt) {
      return dt.replace('T', ' ').slice(0, -3);
    },
    getDayRange(dateStr) {
      const start = new Date(`${dateStr}T06:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    },
    isInRange(startStr, range) {
      const dt = new Date(startStr.replace(' ', 'T'));
      return dt >= range.start && dt < range.end;
    },
    // date_range sections (e.g. Гостиница) bill a multi-day stay proportionally
    // across the nights it covers; other templates just sum same-day records.
    revenueForDay(section, day) {
      if (section.template === 'date_range') {
        return section.records
          .filter((r) => {
            if (!r.price) return false;
            const s = r.start.split(' ')[0];
            const en = r.end ? r.end.split(' ')[0] : s;
            return day >= s && day < en;
          })
          .reduce((sum, r) => {
            const s = r.start.split(' ')[0];
            const en = r.end ? r.end.split(' ')[0] : s;
            const days = moment(en).diff(moment(s), 'days') || 1;
            return sum + Math.round(r.price / days);
          }, 0);
      }
      const range = this.getDayRange(day);
      return section.records.filter((r) => r.price && this.isInRange(r.start, range)).reduce((sum, r) => sum + r.price, 0);
    },
    sumTotals() {
      const totals = {};
      for (const section of this.sectionsData) {
        totals[section.key] = this.revenueForDay(section, this.today);
      }
      this.todayTotals = totals;
    },
    buildAnalytic() {
      const from = this.analyticFrom;
      const to = this.analyticTo;
      if (!from || !to || from > to) return;
      const days = [];
      let cur = moment(from);
      const end = moment(to);
      while (cur.isSameOrBefore(end)) {
        days.push(cur.format('YYYY-MM-DD'));
        cur = cur.clone().add(1, 'days');
      }

      const dailyBySection = {};
      for (const section of this.sectionsData) {
        dailyBySection[section.key] = days.map((day) => this.revenueForDay(section, day));
      }

      const totals = {};
      for (const section of this.sectionsData) {
        totals[section.key] = dailyBySection[section.key].reduce((s, v) => s + v, 0);
      }
      this.analyticTotals = totals;

      const dayTotals = days.map((_, i) => this.sectionsData.reduce((sum, s) => sum + dailyBySection[s.key][i], 0));

      const maxLabel = Math.max(0, ...dayTotals).toLocaleString() + ' тг.';
      const labelPadding = maxLabel.length * 8 + 16;
      this.chartHeight = 260 + labelPadding;

      const totalLabelPlugin = {
        id: 'totalLabel',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.labels.forEach((_, i) => {
            let total = 0;
            let topBar = null;
            chart.data.datasets.forEach((_, di) => {
              const meta = chart.getDatasetMeta(di);
              if (meta.hidden) return;
              total += chart.data.datasets[di].data[i] || 0;
              topBar = meta.data[i];
            });
            if (!total || !topBar) return;
            ctx.save();
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            ctx.translate(topBar.x, topBar.y - 6);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(total.toLocaleString() + ' тг.', 0, 4);
            ctx.restore();
          });
        },
      };

      this.$nextTick(() => {
        // chart-card is behind v-if="tab === 2", so the wrapper only has a
        // real width once this first tick's DOM update has landed.
        const wrapper = this.$refs.chartWrapper;
        if (!wrapper) return;
        this.chartWidth = Math.max(wrapper.clientWidth, days.length * 40);

        this.$nextTick(() => {
          const canvas = this.$refs.chartCanvas;
          if (!canvas) return;
          if (this.chartInstance) this.chartInstance.destroy();
          this.chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: days.map((d) => moment(d).format('DD.MM')),
              datasets: this.sectionsData.map((s, i) => ({
                label: s.label,
                data: dailyBySection[s.key],
                backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
              })),
            },
            options: {
              responsive: false,
              maintainAspectRatio: false,
              layout: { padding: { top: labelPadding } },
              plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} тг.` } },
              },
              scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => v.toLocaleString() } },
              },
            },
            plugins: [totalLabelPlugin],
          });
        });
      });
    },
  },
};
</script>

<style scoped>
.page {
  display: block;
  overflow-y: auto;
  padding: 24px 28px;
  box-sizing: border-box;
  background: #f4f5f7;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1c1e;
  margin: 0;
}

.total-badge {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1c1c1e;
}

.link-btn {
  display: flex;
  align-items: center;
  align-self: center;
  gap: 4px;
  margin-left: auto;
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
}

.link-btn ion-icon {
  font-size: 16px;
}

.tabs-row {
  display: flex;
  border-bottom: 1px solid #e0e2e5;
  margin-bottom: 20px;
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 12px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #9aa0a6;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-btn.active {
  color: #2196f3;
  border-bottom-color: #2196f3;
}

.tab-panel {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px 24px;
  max-width: 520px;
}

.chart-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px 24px;
  margin-top: 16px;
}

.chart-scroll {
  overflow-x: auto;
}

.date-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 18px;
}

.nav-arrow {
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-size: 22px;
  line-height: 1;
  padding: 4px 10px;
  cursor: pointer;
}

.date-pill {
  border: none;
  background: #eef0f3;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #2b2f33;
  cursor: pointer;
  width: 300px;
  box-sizing: border-box;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.analytic-range {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.analytic-range > * {
  flex: 1;
}

.date-field-label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.date-field-btn {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: #eef0f0;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #2196f3;
  text-align: left;
  cursor: pointer;
}

.totals-list {
  display: flex;
  flex-direction: column;
}

.totals-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #eceef0;
}

.totals-row:last-child {
  border-bottom: none;
}

.totals-row-sum {
  font-weight: 700;
}

.totals-label {
  display: flex;
  align-items: center;
  font-weight: 700;
  color: #1c1c1e;
  font-size: 0.95rem;
}

.totals-label .dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2196f3;
  margin-right: 8px;
}

.totals-value {
  font-weight: 600;
  color: #2b2f33;
}
</style>
