<template>
  <ion-page>
    <ion-header :translucent="true" class="cash-header">
      <ion-toolbar class="cash-toolbar">
        <div class="header-card">
          <div class="header-title">Касса</div>
          <div class="header-total">Итого: {{ totalToday }} тг.</div>
          <button class="header-btn refresh" type="button" @click="refreshAll">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
          <HeaderMenuButton />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="page-root">
        <div class="cash-card">
          <div class="tabs-row">
            <button class="tab-btn" :class="{ active: tab === 1 }" type="button" @click="tab = 1">Касса</button>
            <button class="tab-btn" :class="{ active: tab === 2 }" type="button" @click="tab = 2">Аналитика</button>
          </div>

          <!-- Касса -->
          <div v-if="tab === 1">
            <button class="date-pill" type="button" @click="showDateModal = true">{{ formattedToday }}</button>
            <ion-modal :keep-contents-mounted="true" :is-open="showDateModal" @didDismiss="showDateModal = false">
              <MonthCalendar
                :model-value="today"
                :events="allRecordsForBadges"
                @update:modelValue="onPickDate"
              />
            </ion-modal>

            <div class="totals-list">
              <div v-for="s in sectionsData" :key="s.key" class="totals-row">
                <span class="totals-label"><span class="dot"></span>{{ s.icon }} {{ s.label }}</span>
                <span class="totals-value">{{ todayTotals[s.key] || 0 }} тг.</span>
              </div>
            </div>
          </div>

          <!-- Аналитика -->
          <div v-if="tab === 2">
            <div class="analytic-range">
              <div class="date-field">
                <label class="date-field-label">С</label>
                <ion-datetime
                  v-model="analyticFrom"
                  presentation="date"
                  :first-day-of-week="1"
                  :prefer-wheel="true"
                  @ionChange="buildAnalytic"
                ></ion-datetime>
              </div>
              <div class="date-field">
                <label class="date-field-label">По</label>
                <ion-datetime
                  v-model="analyticTo"
                  presentation="date"
                  :first-day-of-week="1"
                  :prefer-wheel="true"
                  @ionChange="buildAnalytic"
                ></ion-datetime>
              </div>
            </div>

            <div class="totals-list">
              <div v-for="s in sectionsData" :key="s.key" class="totals-row">
                <span class="totals-label"><span class="dot"></span>{{ s.icon }} {{ s.label }}</span>
                <span class="totals-value">{{ analyticTotals[s.key] || 0 }} тг.</span>
              </div>
              <div class="totals-row totals-row-sum">
                <span class="totals-label">Итого</span>
                <span class="totals-value">{{ totalAnalytic }} тг.</span>
              </div>
            </div>

            <div class="chart-scroll">
              <canvas ref="chartCanvas" :width="chartWidth" :height="chartHeight"></canvas>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import MonthCalendar from "@/components/MonthCalendar.vue";
import HeaderMenuButton from "@/components/HeaderMenuButton.vue";
import {
  IonContent, IonHeader, IonPage, IonToolbar,
  IonModal, IonDatetime, IonIcon,
} from "@ionic/vue";
import { refreshOutline } from "ionicons/icons";
import { apiFetch } from "@/services/api";
import { useSectionsStore } from "@/stores/sections";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CHART_PALETTE = [
  'rgba(112,192,245,0.8)', 'rgba(137,243,146,0.8)', 'rgba(186,104,200,0.8)',
  'rgba(255,183,77,0.8)', 'rgba(240,98,146,0.8)', 'rgba(129,199,132,0.8)',
];

export default {
  name: 'Cash',
  components: {
    IonContent, IonHeader, IonPage, IonToolbar,
    IonModal, IonDatetime, IonIcon,
    MonthCalendar,
    HeaderMenuButton,
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      tab: 1,
      showDateModal: false,
      sectionsData: [], // [{ key, label, icon, template, records }]
      today: moment().format("YYYY-MM-DD"),
      todayTotals: {},
      analyticFrom: moment().startOf('month').format("YYYY-MM-DD"),
      analyticTo: moment().format("YYYY-MM-DD"),
      analyticTotals: {},
      chartInstance: null,
      chartWidth: 300,
      chartHeight: 320,
    };
  },
  computed: {
    formattedToday() {
      const date = new Date(`${this.today}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
        day: "2-digit",
        month: "long",
      }).format(date);
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
    this.$watch('tab', val => { if (val === 2) this.$nextTick(() => this.buildAnalytic()); });
  },
  methods: {
    onPickDate(date) {
      this.today = date;
      this.showDateModal = false;
    },

    async refreshAll() {
      const sections = useSectionsStore();
      await sections.refresh();
      const enabled = sections.items.filter((s) => s.enabled);
      this.sectionsData = await Promise.all(enabled.map(async (s) => {
        const result = await apiFetch(`/records?section=${s.key}`);
        const records = result.map((r) => ({
          ...r,
          start: this.formatDate(r.start),
          end: r.end ? this.formatDate(r.end) : null,
        }));
        return { key: s.key, label: s.label, icon: s.icon, template: s.template, records };
      }));
      this.sumTotals();
      if (this.tab === 2) this.buildAnalytic();
    },

    formatDate(dt) {
      return dt.replace("T", " ").slice(0, -3);
    },

    getDayRange(dateStr) {
      const start = new Date(`${dateStr}T06:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    },

    isInRange(startStr, range) {
      const dt = new Date(startStr.replace(" ", "T"));
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
      return section.records
        .filter((r) => r.price && this.isInRange(r.start, range))
        .reduce((sum, r) => sum + r.price, 0);
    },

    sumTotals() {
      const totals = {};
      for (const section of this.sectionsData) {
        totals[section.key] = this.revenueForDay(section, this.today);
      }
      this.todayTotals = totals;
    },

    buildAnalytic() {
      const from = this.analyticFrom ? this.analyticFrom.split('T')[0] : null;
      const to   = this.analyticTo   ? this.analyticTo.split('T')[0]   : null;
      if (!from || !to || from > to) return;

      const days = [];
      let cur = moment(from);
      const end = moment(to);
      while (cur <= end) { days.push(cur.format('YYYY-MM-DD')); cur = cur.clone().add(1, 'days'); }

      const dailyBySection = {};
      for (const section of this.sectionsData) {
        dailyBySection[section.key] = days.map((day) => this.revenueForDay(section, day));
      }

      const totals = {};
      for (const section of this.sectionsData) {
        totals[section.key] = dailyBySection[section.key].reduce((s, v) => s + v, 0);
      }
      this.analyticTotals = totals;

      this.chartWidth = Math.max(300, days.length * 40);

      const dayTotals = days.map((_, i) =>
        this.sectionsData.reduce((sum, s) => sum + dailyBySection[s.key][i], 0)
      );

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
        const canvas = this.$refs.chartCanvas;
        if (!canvas) return;
        if (this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: days.map(d => moment(d).format('DD.MM')),
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
              tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} тг.` } },
            },
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true, ticks: { callback: v => v.toLocaleString() } },
            },
          },
          plugins: [totalLabelPlugin],
        });
      });
    },
  },
};
</script>

<style scoped>
.cash-toolbar {
  --background: transparent;
  --border-color: transparent;
  --min-height: auto;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 14px 16px;
  margin: 6px 10px 0;
}

.header-title {
  font-weight: 700;
  font-size: 1rem;
  color: #1c1c1e;
}

.header-total {
  font-weight: 700;
  font-size: 0.85rem;
  color: #1c1c1e;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  color: #9aa0a6;
}

.header-btn ion-icon {
  font-size: 16px;
}

.page-root {
  padding: 10px 10px 20px;
  background: #f4f5f7;
  min-height: 100%;
}

.cash-card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 6px 16px 16px;
}

.tabs-row {
  display: flex;
  border-bottom: 1px solid #eceef0;
  margin: 0 -16px 16px;
  padding: 0 16px;
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 0;
  font-size: 0.8rem;
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

.date-pill {
  display: inline-block;
  border: none;
  background: #eef0f3;
  border-radius: 18px;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2b2f33;
  cursor: pointer;
  margin-bottom: 16px;
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

.analytic-range {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.date-field-label {
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-right: 8px;
}

.chart-scroll {
  overflow-x: auto;
  padding: 16px 0 8px;
}
</style>
