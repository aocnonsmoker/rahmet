<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-title>Касса</ion-title>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-title v-if="tab === 1">Итого: {{ totalSpa + totalCar + totalPS + totalHotel }} тг.</ion-title>
          <ion-button @click="refreshAll" color="secondary">Обновить</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="tab">
          <ion-segment-button :value="1">Касса</ion-segment-button>
          <ion-segment-button :value="2">Аналитика</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">

      <!-- Касса -->
      <div v-if="tab === 1">
        <ion-item>
          <ion-datetime-button datetime="datetiming"></ion-datetime-button>
          <ion-modal :keep-contents-mounted="true">
            <ion-datetime
              id="datetiming"
              :first-day-of-week="1"
              presentation="date"
              :format-options="formatOptions"
              v-model="today"
            ></ion-datetime>
          </ion-modal>
        </ion-item>
        <ion-item>
          <ion-label>Баня</ion-label>
          <ion-label>{{ totalSpa }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Автомойка</ion-label>
          <ion-label>{{ totalCar }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>PS</ion-label>
          <ion-label>{{ totalPS }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Гостиница</ion-label>
          <ion-label>{{ totalHotel }} тг.</ion-label>
        </ion-item>
      </div>

      <!-- Аналитика -->
      <div v-if="tab === 2">
        <ion-item>
          <ion-label>С</ion-label>
          <ion-datetime
            v-model="analyticFrom"
            presentation="date"
            :first-day-of-week="1"
            :prefer-wheel="true"
            @ionChange="buildAnalytic"
          ></ion-datetime>
        </ion-item>
        <ion-item>
          <ion-label>По</ion-label>
          <ion-datetime
            v-model="analyticTo"
            presentation="date"
            :first-day-of-week="1"
            :prefer-wheel="true"
            @ionChange="buildAnalytic"
          ></ion-datetime>
        </ion-item>

        <ion-item>
          <ion-label>Баня</ion-label>
          <ion-label>{{ analyticTotals.spa }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Автомойка</ion-label>
          <ion-label>{{ analyticTotals.car }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>PS</ion-label>
          <ion-label>{{ analyticTotals.ps }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Гостиница</ion-label>
          <ion-label>{{ analyticTotals.hotel }} тг.</ion-label>
        </ion-item>
        <ion-item>
          <ion-label><strong>Итого</strong></ion-label>
          <ion-label><strong>{{ analyticTotals.spa + analyticTotals.car + analyticTotals.ps + analyticTotals.hotel }} тг.</strong></ion-label>
        </ion-item>

        <div class="chart-scroll">
          <canvas ref="chartCanvas" :width="chartWidth" :height="chartHeight"></canvas>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script>
import moment from "moment";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonButton, IonModal, IonDatetime, IonLabel, IonDatetimeButton,
  IonItem, IonSegment, IonSegmentButton,
} from "@ionic/vue";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default {
  name: 'Cash',
  components: {
    IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
    IonButton, IonModal, IonDatetime, IonLabel, IonDatetimeButton,
    IonItem, IonSegment, IonSegmentButton,
  },
  data() {
    return {
      tab: 1,
      cars: [],
      events: [],
      pss: [],
      hotelEvents: [],
      formatOptions: {
        date: { weekday: "short", month: "long", day: "2-digit" },
      },
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
  async mounted() {
    await this.refreshAll();
    this.$watch('today', this.sumTotal);
    this.$watch('tab', val => { if (val === 2) this.$nextTick(() => this.buildAnalytic()); });
  },
  methods: {
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
          r => ({ ...r, start: this.formatDate(r.start) })),
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

    sumTotal() {
      const range = this.getDayRange(this.today);
      this.totalCar   = this.cars.filter(c => c.price && this.isInRange(c.start, range)).reduce((s, c) => s + c.price, 0);
      this.totalPS    = this.pss.filter(c => c.price && this.isInRange(c.start, range)).reduce((s, c) => s + c.price, 0);
      this.totalSpa   = this.events.filter(e => e.price && this.isInRange(e.start, range)).reduce((s, e) => s + e.price, 0);
      this.totalHotel = this.hotelEvents.filter(e => e.price && e.start.split(' ')[0] === this.today).reduce((s, e) => s + e.price, 0);
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
        dayHotel.push(this.hotelEvents.filter(e => e.price && e.start.split(' ')[0] === day).reduce((s, e) => s + e.price, 0));
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
              { label: 'PS',        data: dayPS,    backgroundColor: 'rgba(245,207,146,0.8)' },
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
.chart-scroll {
  overflow-x: auto;
  padding: 16px 16px 8px;
}
</style>
