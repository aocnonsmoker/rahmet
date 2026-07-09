<template>
  <ion-page>
    <ion-header :translucent="true" class="cash-header">
      <ion-toolbar class="cash-toolbar">
        <div class="header-card">
          <div class="header-title">Касса</div>
          <div class="header-total">Итого: {{ totalSpa + totalCar + totalPS + totalHotel }} тг.</div>
          <button class="header-btn refresh" type="button" @click="refreshAll">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
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
            <button id="cash-date-trigger" class="date-pill" type="button">{{ formattedToday }}</button>
            <ion-modal :keep-contents-mounted="true" trigger="cash-date-trigger" ref="dateModal">
              <MonthCalendar
                :model-value="today"
                :events="allRecordsForBadges"
                @update:modelValue="onPickDate"
              />
            </ion-modal>

            <div class="totals-list">
              <div class="totals-row">
                <span class="totals-label"><span class="dot"></span>Баня</span>
                <span class="totals-value">{{ totalSpa }} тг.</span>
              </div>
              <div class="totals-row">
                <span class="totals-label"><span class="dot"></span>Автомойка</span>
                <span class="totals-value">{{ totalCar }} тг.</span>
              </div>
              <div class="totals-row">
                <span class="totals-label"><span class="dot"></span>Гостиница</span>
                <span class="totals-value">{{ totalHotel }} тг.</span>
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
              <div class="totals-row">
                <span class="totals-label"><span class="dot"></span>Баня</span>
                <span class="totals-value">{{ analyticTotals.spa }} тг.</span>
              </div>
              <div class="totals-row">
                <span class="totals-label"><span class="dot"></span>Автомойка</span>
                <span class="totals-value">{{ analyticTotals.car }} тг.</span>
              </div>
              <div class="totals-row">
                <span class="totals-label"><span class="dot"></span>Гостиница</span>
                <span class="totals-value">{{ analyticTotals.hotel }} тг.</span>
              </div>
              <div class="totals-row totals-row-sum">
                <span class="totals-label">Итого</span>
                <span class="totals-value">{{ analyticTotals.spa + analyticTotals.car + analyticTotals.ps + analyticTotals.hotel }} тг.</span>
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
import {
  IonContent, IonHeader, IonPage, IonToolbar,
  IonModal, IonDatetime, IonIcon,
} from "@ionic/vue";
import { refreshOutline } from "ionicons/icons";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default {
  name: 'Cash',
  components: {
    IonContent, IonHeader, IonPage, IonToolbar,
    IonModal, IonDatetime, IonIcon,
    MonthCalendar,
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      tab: 1,
      cars: [],
      events: [],
      pss: [],
      hotelEvents: [],
      today: moment().format("YYYY-MM-DD"),
      totalSpa: 0,
      totalCar: 0,
      totalPS: 0,
      totalHotel: 0,
      analyticFrom: moment().startOf('month').format("YYYY-MM-DD"),
      analyticTo: moment().format("YYYY-MM-DD"),
      analyticTotals: { spa: 0, car: 0, ps: 0, hotel: 0 },
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
      return [...this.cars, ...this.events, ...this.hotelEvents];
    },
  },
  async mounted() {
    await this.refreshAll();
    this.$watch('today', this.sumTotal);
    this.$watch('tab', val => { if (val === 2) this.$nextTick(() => this.buildAnalytic()); });
  },
  methods: {
    onPickDate(date) {
      this.today = date;
      if (this.$refs.dateModal) this.$refs.dateModal.$el.dismiss();
    },
    async fetchData(url, key, formatFn) {
      const res = await fetch(url);
      const data = await res.json();
      this[key] = data.map(formatFn);
    },

    async refreshAll() {
      await Promise.all([
        this.fetchData('http://79.76.52.210:8000/car', 'cars',
          r => ({ ...r, start: this.formatDate(r.start) })),
        this.fetchData('http://79.76.52.210:8000/ps', 'pss',
          r => ({ ...r, start: this.formatDate(r.start) })),
        this.fetchData('http://79.76.52.210:8000/hotel', 'hotelEvents',
          r => ({ ...r, start: this.formatDate(r.start), end: this.formatDate(r.end) })),
        this.fetchData('http://79.76.52.210:8000/events', 'events',
          r => ({ ...r, start: this.formatDate(r.start), end: this.formatDate(r.end) })),
      ]);
      this.sumTotal();
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

    hotelRevenueForDay(day) {
      return this.hotelEvents
        .filter(e => {
          if (!e.price) return false;
          const s = e.start.split(' ')[0];
          const en = e.end ? e.end.split(' ')[0] : s;
          return day >= s && day < en;
        })
        .reduce((sum, e) => {
          const s = e.start.split(' ')[0];
          const en = e.end ? e.end.split(' ')[0] : s;
          const days = moment(en).diff(moment(s), 'days') || 1;
          return sum + Math.round(e.price / days);
        }, 0);
    },

    sumTotal() {
      const range = this.getDayRange(this.today);
      this.totalCar   = this.cars.filter(c => c.price && this.isInRange(c.start, range)).reduce((s, c) => s + c.price, 0);
      this.totalPS    = this.pss.filter(c => c.price && this.isInRange(c.start, range)).reduce((s, c) => s + c.price, 0);
      this.totalSpa   = this.events.filter(e => e.price && this.isInRange(e.start, range)).reduce((s, e) => s + e.price, 0);
      this.totalHotel = this.hotelRevenueForDay(this.today);
    },

    buildAnalytic() {
      const from = this.analyticFrom ? this.analyticFrom.split('T')[0] : null;
      const to   = this.analyticTo   ? this.analyticTo.split('T')[0]   : null;
      if (!from || !to || from > to) return;

      const days = [];
      let cur = moment(from);
      const end = moment(to);
      while (cur <= end) { days.push(cur.format('YYYY-MM-DD')); cur = cur.clone().add(1, 'days'); }

      const daySpa = [], dayCar = [], dayPS = [], dayHotel = [];
      for (const day of days) {
        const range = this.getDayRange(day);
        daySpa.push(this.events.filter(e => e.price && this.isInRange(e.start, range)).reduce((s, e) => s + e.price, 0));
        dayCar.push(this.cars.filter(c => c.price && this.isInRange(c.start, range)).reduce((s, c) => s + c.price, 0));
        dayPS.push(this.pss.filter(c => c.price && this.isInRange(c.start, range)).reduce((s, c) => s + c.price, 0));
        dayHotel.push(this.hotelRevenueForDay(day));
      }

      this.analyticTotals = {
        spa:   daySpa.reduce((s, v) => s + v, 0),
        car:   dayCar.reduce((s, v) => s + v, 0),
        ps:    dayPS.reduce((s, v) => s + v, 0),
        hotel: dayHotel.reduce((s, v) => s + v, 0),
      };

      this.chartWidth = Math.max(300, days.length * 40);

      // Totals per day for label on top
      const dayTotals = days.map((_, i) => daySpa[i] + dayCar[i] + dayPS[i] + dayHotel[i]);

      const maxLabel = Math.max(...dayTotals).toLocaleString() + ' тг.';
      const labelPadding = maxLabel.length * 8 + 16;
      this.chartHeight = 260 + labelPadding;

      const totalLabelPlugin = {
        id: 'totalLabel',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.labels.forEach((_, i) => {
            // Sum only visible datasets for this column
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
            datasets: [
              { label: 'Баня',      data: daySpa,   backgroundColor: 'rgba(112,192,245,0.8)' },
              { label: 'Автомойка', data: dayCar,   backgroundColor: 'rgba(137,243,146,0.8)' },
              { label: 'Гостиница', data: dayHotel, backgroundColor: 'rgba(186,104,200,0.8)' },
            ],
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
