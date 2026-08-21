<template>
  <ion-page>
    <ion-header :translucent="true" class="ord-header">
      <ion-toolbar class="ord-toolbar">
        <div class="header-card">
          <div class="header-title">Заказы</div>
          <button class="header-btn refresh" type="button" @click="loadAll">
            <ion-icon :icon="refreshIcon"></ion-icon>
            Обновить
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :scrollY="false">
      <div class="page-root">
        <div class="date-row">
          <button id="ord-date-trigger" class="date-pill" type="button">{{ formattedDate }}</button>
          <div class="record-count">Заказов: <span>{{ ordersForDay.length }}</span></div>
        </div>
        <ion-modal :keep-contents-mounted="true" trigger="ord-date-trigger" ref="dateModal">
          <MonthCalendar
            :model-value="today"
            :events="allOrders"
            @update:modelValue="onPickDate"
          />
        </ion-modal>

        <ion-button expand="block" class="add-btn" @click="openNewOrder">+ Новый заказ</ion-button>

        <div class="list-wrapper">
          <div class="records-scroll">
            <div
              v-for="order in ordersForDay"
              :key="order.id"
              class="record-card"
              @click="openEditOrder(order)"
            >
              <div class="record-bar"></div>
              <div class="record-body">
                <div class="record-time">{{ order.start.split(' ')[1] }}</div>
                <div class="record-title">{{ order.table_label || 'Без стола' }}</div>
                <div class="record-sub">{{ itemsSummary(order) }}</div>
                <div class="record-price">Сумма: {{ order.price }} тг.</div>
              </div>
            </div>
            <div v-if="!ordersForDay.length" class="empty-state">Нет заказов на этот день</div>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-modal class="ord-modal" :is-open="showOrder">
      <ion-header class="ord-modal-header ion-no-border">
        <ion-toolbar class="ord-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showOrder = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="saveOrder">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <template v-if="draft">
          <FormInput
            label="Стол / имя гостя"
            type="text"
            placeholder="Например, Стол 5"
            :model-value="draft.table_label"
            @update:modelValue="draft.table_label = $event"
          />

          <div class="selected-label">Состав заказа</div>
          <div v-if="!selectedItems.length" class="empty-picker">Пока нет блюд — добавьте ниже</div>
          <div v-for="item in selectedItems" :key="item.id" class="picker-row">
            <div class="picker-row-body">
              <div class="picker-name">{{ item.name }}</div>
              <div class="picker-price">{{ item.price }} тг.</div>
            </div>
            <div class="qty-stepper">
              <button type="button" class="qty-btn" @click="decQty(item.id)">−</button>
              <span class="qty-value">{{ draft.qty[item.id] || 0 }}</span>
              <button type="button" class="qty-btn" @click="incQty(item.id)">+</button>
            </div>
          </div>

          <button class="add-item-btn" type="button" @click="showPicker = !showPicker">
            {{ showPicker ? "Скрыть меню" : "+ Добавить блюдо" }}
          </button>

          <template v-if="showPicker">
            <div class="picker-search">
              <ion-icon :icon="searchIcon"></ion-icon>
              <input
                v-model="pickerQuery"
                type="text"
                placeholder="Найти блюдо..."
                class="picker-search-input"
              />
            </div>

            <div v-if="!hasAnyAvailableItems" class="empty-picker">Ничего не найдено</div>

            <div v-for="category in categories" :key="category.id" class="picker-category">
              <template v-if="availableItemsByCategory(category.id).length">
                <div class="picker-category-label">{{ category.label }}</div>
                <div
                  v-for="item in availableItemsByCategory(category.id)"
                  :key="item.id"
                  class="picker-row picker-row-add"
                  @click="addFromPicker(item.id)"
                >
                  <div class="picker-row-body">
                    <div class="picker-name">{{ item.name }}</div>
                    <div class="picker-price">{{ item.price }} тг.</div>
                  </div>
                  <div class="add-icon">+</div>
                </div>
              </template>
            </div>
          </template>

          <div class="order-total">Итого: {{ draftTotal }} тг.</div>

          <ion-button
            v-if="draft.id"
            expand="block"
            class="delete-btn"
            color="danger"
            @click="deleteOrder"
            >Удалить заказ</ion-button
          >
        </template>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script>
import moment from "moment";
import FormInput from "@/components/FormInput.vue";
import MonthCalendar from "@/components/MonthCalendar.vue";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButton,
  IonButtons,
  IonModal,
  IonIcon,
} from "@ionic/vue";
import { refreshOutline, searchOutline } from "ionicons/icons";

const API_BASE = "http://79.76.52.210:8000";

// Business day runs 06:00 to 06:00 next day, matching the other tabs.
function computeBusinessDay(date) {
  const d = moment(date);
  if (d.hour() < 6) {
    return d.clone().subtract(1, "day").format("YYYY-MM-DD");
  }
  return d.format("YYYY-MM-DD");
}

export default {
  name: "Orders",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonButtons,
    IonModal,
    IonIcon,
    FormInput,
    MonthCalendar,
  },
  data() {
    return {
      refreshIcon: refreshOutline,
      searchIcon: searchOutline,
      categories: [],
      items: [],
      allOrders: [],
      today: computeBusinessDay(new Date()),
      showOrder: false,
      draft: null,
      showPicker: false,
      pickerQuery: "",
    };
  },
  computed: {
    formattedDate() {
      const date = new Date(`${this.today}T00:00:00`);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    },
    ordersForDay() {
      const dayStart = moment(this.today, "YYYY-MM-DD").add(6, "hours");
      const dayEnd = dayStart.clone().add(24, "hours");
      return this.allOrders
        .filter((o) => {
          const s = moment(o.start, "YYYY-MM-DD HH:mm:ss");
          return s.isSameOrAfter(dayStart) && s.isBefore(dayEnd);
        })
        .sort((a, b) => b.start.localeCompare(a.start));
    },
    draftTotal() {
      if (!this.draft) return 0;
      return this.items.reduce((sum, item) => {
        const qty = this.draft.qty[item.id] || 0;
        return sum + qty * (item.price || 0);
      }, 0);
    },
    selectedItems() {
      if (!this.draft) return [];
      return this.items.filter((item) => (this.draft.qty[item.id] || 0) > 0);
    },
    hasAnyAvailableItems() {
      if (!this.draft) return false;
      return this.categories.some((category) => this.availableItemsByCategory(category.id).length);
    },
  },
  async mounted() {
    await this.loadAll();
    this.$watch("today", () => {});
  },
  methods: {
    async loadAll() {
      const [categoriesRes, itemsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/menu-categories`),
        fetch(`${API_BASE}/menu-items`),
        fetch(`${API_BASE}/restaurant-orders`),
      ]);
      this.categories = (await categoriesRes.json()).sort((a, b) => a.sort_order - b.sort_order);
      this.items = (await itemsRes.json()).filter((item) => item.is_available);
      this.allOrders = (await ordersRes.json()).map((o) => ({
        ...o,
        start: o.start.replace("T", " ").slice(0, 19),
      }));
    },
    itemsByCategory(categoryId) {
      return this.items
        .filter((item) => item.category_id === categoryId)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    availableItemsByCategory(categoryId) {
      const q = this.pickerQuery.trim().toLowerCase();
      return this.itemsByCategory(categoryId).filter(
        (item) => !(this.draft.qty[item.id] > 0) && (!q || item.name.toLowerCase().includes(q))
      );
    },
    itemsSummary(order) {
      return order.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
    },
    onPickDate(date) {
      this.today = date;
      if (this.$refs.dateModal) this.$refs.dateModal.$el.dismiss();
    },

    openNewOrder() {
      this.draft = {
        id: null,
        table_label: "",
        start: moment().format("YYYY-MM-DD HH:mm:ss"),
        qty: {},
      };
      this.showPicker = true;
      this.pickerQuery = "";
      this.showOrder = true;
    },
    openEditOrder(order) {
      const qty = {};
      for (const i of order.items) {
        if (i.menu_item_id) qty[i.menu_item_id] = i.qty;
      }
      this.draft = {
        id: order.id,
        table_label: order.table_label || "",
        start: order.start,
        qty,
      };
      this.showPicker = false;
      this.pickerQuery = "";
      this.showOrder = true;
    },
    incQty(itemId) {
      this.draft.qty[itemId] = (this.draft.qty[itemId] || 0) + 1;
    },
    addFromPicker(itemId) {
      this.incQty(itemId);
      this.pickerQuery = "";
    },
    decQty(itemId) {
      const next = (this.draft.qty[itemId] || 0) - 1;
      this.draft.qty[itemId] = next > 0 ? next : 0;
    },
    async saveOrder() {
      const items = Object.entries(this.draft.qty)
        .filter(([, qty]) => qty > 0)
        .map(([menu_item_id, qty]) => ({ menu_item_id: Number(menu_item_id), qty }));
      if (!items.length) return;

      const body = { table_label: this.draft.table_label || null, start: this.draft.start, items };

      if (this.draft.id) {
        await fetch(`${API_BASE}/restaurant-orders/${this.draft.id}`, {
          method: "put",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`${API_BASE}/restaurant-orders`, {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      this.showOrder = false;
      await this.loadAll();
    },
    async deleteOrder() {
      const apply = confirm("Удалить заказ?");
      if (!apply) return;
      await fetch(`${API_BASE}/restaurant-orders/${this.draft.id}`, { method: "delete" });
      this.showOrder = false;
      await this.loadAll();
    },
  },
};
</script>

<style scoped>
.ord-toolbar {
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
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 4px;
  background: #f4f5f7;
}

.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
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
}

.record-count {
  font-size: 0.88rem;
  font-weight: 600;
  color: #6a6f75;
  white-space: nowrap;
}

.record-count span {
  color: #bb5f45;
  font-weight: 700;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 14px;
}

.list-wrapper {
  flex: 1;
  min-height: 0;
}

.records-scroll {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  background: #ffffff;
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
}

.record-bar {
  width: 3px;
  border-radius: 2px;
  background: #bb5f45;
  flex-shrink: 0;
}

.record-time {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1c1c1e;
}

.record-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2b2f33;
  margin-top: 2px;
}

.record-sub {
  font-size: 0.8rem;
  color: #6a6f75;
  margin-top: 2px;
}

.record-price {
  font-size: 0.85rem;
  font-weight: 700;
  color: #bb5f45;
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.ord-modal {
  --border-radius: 20px;
}

.ord-modal-toolbar {
  --border-color: transparent;
}

.selected-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1c1c1e;
  margin-top: 18px;
  margin-bottom: 8px;
}

.empty-picker {
  font-size: 0.85rem;
  color: #9aa0a6;
  padding: 8px 0;
}

.add-item-btn {
  width: 100%;
  border: 1px dashed #c8ccd0;
  background: transparent;
  border-radius: 12px;
  padding: 10px;
  margin-top: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #bb5f45;
  cursor: pointer;
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f5f7;
  border-radius: 12px;
  padding: 10px 14px;
  margin-top: 12px;
  color: #9aa0a6;
}

.picker-search-input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.9rem;
  color: #1c1c1e;
}

.picker-category {
  margin-top: 16px;
}

.picker-category-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1c1c1e;
  margin-bottom: 8px;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #eceef0;
}

.picker-row-add {
  cursor: pointer;
}

.add-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #eef0f0;
  color: #2b2f33;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.picker-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1c1c1e;
}

.picker-price {
  font-size: 0.78rem;
  color: #6a6f75;
  margin-top: 2px;
}

.qty-stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.qty-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: #eef0f0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2b2f33;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-value {
  min-width: 18px;
  text-align: center;
  font-weight: 700;
}

.order-total {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #eceef0;
  font-weight: 700;
  font-size: 1.05rem;
  color: #1c1c1e;
  text-align: right;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 16px;
}
</style>
