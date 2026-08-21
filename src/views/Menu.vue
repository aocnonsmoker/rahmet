<template>
  <ion-page>
    <ion-header :translucent="true" class="mn-header">
      <ion-toolbar class="mn-toolbar">
        <div class="header-card">
          <div class="header-title">Меню</div>
          <button class="header-btn qr" type="button" @click="openQr">
            <ion-icon :icon="qrIcon"></ion-icon>
            QR-код
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content class="mn-content">
      <div class="page-root">
        <ion-button expand="block" class="add-btn" @click="openNewCategory">+ Добавить категорию</ion-button>

        <div v-if="!categories.length" class="empty-state">Пока нет категорий</div>

        <div v-for="(category, index) in categories" :key="category.id" class="category-block">
          <div class="category-head">
            <div class="category-label" @click="openEditCategory(category)">{{ category.label }}</div>
            <div class="category-actions">
              <button
                class="reorder-btn"
                type="button"
                :disabled="index === 0"
                @click.stop="moveCategory(index, -1)"
              >
                <ion-icon :icon="upIcon"></ion-icon>
              </button>
              <button
                class="reorder-btn"
                type="button"
                :disabled="index === categories.length - 1"
                @click.stop="moveCategory(index, 1)"
              >
                <ion-icon :icon="downIcon"></ion-icon>
              </button>
              <ion-icon class="edit-icon" :icon="pencilIcon" @click="openEditCategory(category)"></ion-icon>
            </div>
          </div>

          <div
            v-for="item in itemsByCategory(category.id)"
            :key="item.id"
            class="item-card"
            :class="{ unavailable: !item.is_available }"
            @click="openEditItem(item)"
          >
            <div class="item-photo">
              <img v-if="item.photo_path" :src="photoUrl(item.photo_path)" :alt="item.name" />
              <div v-else class="item-photo-placeholder">нет фото</div>
            </div>
            <div class="item-body">
              <div class="item-row">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-price">{{ item.price }} тг.</div>
              </div>
              <div v-if="item.description" class="item-desc">{{ item.description }}</div>
              <div v-if="!item.is_available" class="item-hidden-badge">Скрыто из меню</div>
            </div>
          </div>

          <button class="add-item-btn" type="button" @click="openNewItem(category.id)">+ Добавить блюдо</button>
        </div>
      </div>
    </ion-content>

    <!-- Category modal -->
    <ion-modal class="mn-modal" :is-open="showCategory">
      <ion-header class="mn-modal-header ion-no-border">
        <ion-toolbar class="mn-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showCategory = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="saveCategory">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <FormInput
          v-if="selectedCategory"
          label="Название категории"
          type="text"
          placeholder="Например, Закуски"
          :model-value="selectedCategory.label"
          @update:modelValue="selectedCategory.label = $event"
        />
        <ion-button
          v-if="selectedCategory && selectedCategory.id"
          expand="block"
          class="delete-btn"
          color="danger"
          @click="deleteCategory"
          >Удалить категорию</ion-button
        >
      </ion-content>
    </ion-modal>

    <!-- Item modal -->
    <ion-modal class="mn-modal" :is-open="showItem">
      <ion-header class="mn-modal-header ion-no-border">
        <ion-toolbar class="mn-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button fill="clear" color="medium" @click="showItem = false">Отменить</ion-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="saveItem">Сохранить</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <template v-if="selectedItem">
          <FormInput
            label="Название блюда"
            type="text"
            placeholder="Например, Хумус с питой"
            :model-value="selectedItem.name"
            @update:modelValue="selectedItem.name = $event"
          />
          <FormInput
            label="Описание"
            type="text"
            placeholder="Короткое описание"
            :model-value="selectedItem.description"
            @update:modelValue="selectedItem.description = $event"
          />
          <FormInput
            label="Цена"
            type="number"
            suffix="тг."
            :model-value="selectedItem.price"
            @update:modelValue="selectedItem.price = $event"
          />
          <FormInput
            label="Бейдж (необязательно)"
            type="text"
            placeholder="Например, вег. или острое"
            :model-value="selectedItem.tag"
            @update:modelValue="selectedItem.tag = $event"
          />

          <div class="ff">
            <label class="ff-label">Фото</label>
            <input type="file" accept="image/*" @change="onPhotoPicked" />
            <img v-if="photoPreview" :src="photoPreview" class="photo-preview" />
            <img v-else-if="selectedItem.photo_path" :src="photoUrl(selectedItem.photo_path)" class="photo-preview" />
          </div>

          <ion-item class="availability-item" lines="none">
            <ion-label>В наличии (показывать в меню)</ion-label>
            <ion-toggle v-model="selectedItem.is_available"></ion-toggle>
          </ion-item>

          <ion-button
            v-if="selectedItem.id"
            expand="block"
            class="delete-btn"
            color="danger"
            @click="deleteItem"
            >Удалить блюдо</ion-button
          >
        </template>
      </ion-content>
    </ion-modal>

    <!-- QR modal -->
    <ion-modal class="mn-modal qr-modal" :is-open="showQr" @didDismiss="showQr = false">
      <ion-header class="mn-modal-header ion-no-border">
        <ion-toolbar class="mn-modal-toolbar">
          <ion-buttons slot="end">
            <ion-button fill="clear" color="primary" :strong="true" @click="showQr = false">Готово</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding qr-content">
        <div class="qr-wrap">
          <img v-if="qrDataUrl" :src="qrDataUrl" class="qr-image" alt="QR меню" />
          <div class="qr-link">{{ publicMenuUrl }}</div>
          <a :href="qrDataUrl" download="rahmet-menu-qr.png" class="qr-download">Скачать QR</a>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script>
import QRCode from "qrcode";
import FormInput from "@/components/FormInput.vue";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButton,
  IonButtons,
  IonModal,
  IonIcon,
  IonItem,
  IonLabel,
  IonToggle,
} from "@ionic/vue";
import { qrCodeOutline, pencilOutline, chevronUpOutline, chevronDownOutline } from "ionicons/icons";

const API_BASE = "http://79.76.52.210:8000";
const PUBLIC_MENU_PATH = "/menu"; // matches the public route registered in router/index.js

export default {
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButton,
    IonButtons,
    IonModal,
    IonIcon,
    IonItem,
    IonLabel,
    IonToggle,
    FormInput,
  },
  data() {
    return {
      qrIcon: qrCodeOutline,
      pencilIcon: pencilOutline,
      upIcon: chevronUpOutline,
      downIcon: chevronDownOutline,
      categories: [],
      items: [],
      showCategory: false,
      selectedCategory: null,
      showItem: false,
      selectedItem: null,
      selectedPhotoFile: null,
      photoPreview: null,
      showQr: false,
      qrDataUrl: null,
    };
  },
  computed: {
    publicMenuUrl() {
      return `${window.location.origin}${PUBLIC_MENU_PATH}`;
    },
  },
  async mounted() {
    await this.loadAll();
  },
  methods: {
    async loadAll() {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE}/menu-categories`),
        fetch(`${API_BASE}/menu-items`),
      ]);
      this.categories = (await categoriesRes.json()).sort((a, b) => a.sort_order - b.sort_order);
      this.items = await itemsRes.json();
    },
    itemsByCategory(categoryId) {
      return this.items
        .filter((item) => item.category_id === categoryId)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    photoUrl(path) {
      return `${API_BASE}/static/${path}`;
    },

    openNewCategory() {
      this.selectedCategory = { label: "", sort_order: this.categories.length };
      this.showCategory = true;
    },
    openEditCategory(category) {
      this.selectedCategory = { ...category };
      this.showCategory = true;
    },
    async saveCategory() {
      if (!this.selectedCategory.label.trim()) return;
      if (this.selectedCategory.id) {
        await fetch(`${API_BASE}/menu-categories/${this.selectedCategory.id}`, {
          method: "put",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.selectedCategory),
        });
      } else {
        await fetch(`${API_BASE}/menu-categories`, {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.selectedCategory),
        });
      }
      this.showCategory = false;
      await this.loadAll();
    },
    async moveCategory(index, direction) {
      const other = index + direction;
      if (other < 0 || other >= this.categories.length) return;
      const reordered = [...this.categories];
      [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
      // Renumber sequentially rather than swapping raw values — avoids no-op
      // swaps when two categories happen to share the same sort_order.
      await Promise.all(
        reordered.map((category, i) =>
          fetch(`${API_BASE}/menu-categories/${category.id}`, {
            method: "put",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: category.label, sort_order: i }),
          })
        )
      );
      await this.loadAll();
    },
    async deleteCategory() {
      const apply = confirm("Удалить категорию и все блюда в ней?");
      if (!apply) return;
      await fetch(`${API_BASE}/menu-categories/${this.selectedCategory.id}`, { method: "delete" });
      this.showCategory = false;
      await this.loadAll();
    },

    openNewItem(categoryId) {
      this.selectedItem = {
        category_id: categoryId,
        name: "",
        description: "",
        price: null,
        tag: "",
        is_available: true,
        sort_order: this.itemsByCategory(categoryId).length,
      };
      this.selectedPhotoFile = null;
      this.photoPreview = null;
      this.showItem = true;
    },
    openEditItem(item) {
      this.selectedItem = { ...item };
      this.selectedPhotoFile = null;
      this.photoPreview = null;
      this.showItem = true;
    },
    onPhotoPicked(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.selectedPhotoFile = file;
      this.photoPreview = URL.createObjectURL(file);
    },
    async saveItem() {
      if (!this.selectedItem.name.trim()) return;
      const form = new FormData();
      form.append("category_id", this.selectedItem.category_id);
      form.append("name", this.selectedItem.name);
      form.append("description", this.selectedItem.description || "");
      form.append("price", this.selectedItem.price || 0);
      form.append("tag", this.selectedItem.tag || "");
      form.append("is_available", this.selectedItem.is_available ? "true" : "false");
      form.append("sort_order", this.selectedItem.sort_order || 0);
      if (this.selectedPhotoFile) form.append("photo", this.selectedPhotoFile);

      if (this.selectedItem.id) {
        await fetch(`${API_BASE}/menu-items/${this.selectedItem.id}`, { method: "put", body: form });
      } else {
        await fetch(`${API_BASE}/menu-items`, { method: "post", body: form });
      }
      this.showItem = false;
      await this.loadAll();
    },
    async deleteItem() {
      const apply = confirm("Удалить блюдо?");
      if (!apply) return;
      await fetch(`${API_BASE}/menu-items/${this.selectedItem.id}`, { method: "delete" });
      this.showItem = false;
      await this.loadAll();
    },

    async openQr() {
      this.qrDataUrl = await QRCode.toDataURL(this.publicMenuUrl, { width: 320, margin: 1 });
      this.showQr = true;
    },
  },
};
</script>

<style scoped>
.mn-toolbar {
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
  color: #bb5f45;
}

.header-btn ion-icon {
  font-size: 16px;
}

.mn-content {
  --background: #f4f5f7;
}

.page-root {
  padding: 10px 10px 30px;
}

.add-btn {
  --border-radius: 12px;
  font-weight: 700;
  margin: 0 2px 16px;
}

.category-block {
  margin-bottom: 20px;
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 10px;
  cursor: pointer;
}

.category-label {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1c1c1e;
  cursor: pointer;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reorder-btn {
  border: none;
  background: #eef0f0;
  border-radius: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a4f55;
  cursor: pointer;
  padding: 0;
}

.reorder-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.edit-icon {
  cursor: pointer;
  margin-left: 4px;
}

.item-card {
  display: flex;
  gap: 12px;
  background: #ffffff;
  border-radius: 14px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.item-card.unavailable {
  opacity: 0.55;
}

.item-photo {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #eef0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-photo-placeholder {
  font-size: 0.55rem;
  color: #9aa0a6;
  text-align: center;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.item-name {
  font-weight: 700;
  font-size: 0.92rem;
  color: #1c1c1e;
}

.item-price {
  font-weight: 700;
  font-size: 0.88rem;
  color: #bb5f45;
  white-space: nowrap;
}

.item-desc {
  font-size: 0.8rem;
  color: #6a6f75;
  margin-top: 2px;
}

.item-hidden-badge {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #9aa0a6;
}

.add-item-btn {
  width: 100%;
  border: 1px dashed #c8ccd0;
  background: transparent;
  border-radius: 12px;
  padding: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #6a6f75;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  color: #9aa0a6;
  padding: 24px 0;
}

.mn-modal {
  --border-radius: 20px;
}

.mn-modal-toolbar {
  --border-color: transparent;
}

.delete-btn {
  --border-radius: 24px;
  font-weight: 700;
  margin-top: 12px;
}

.availability-item {
  --background: transparent;
  --padding-start: 0;
  margin-top: 8px;
}

.photo-preview {
  width: 100%;
  max-width: 200px;
  border-radius: 12px;
  margin-top: 10px;
  display: block;
}

.ff-label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.qr-content {
  --background: #ffffff;
}

.qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
}

.qr-image {
  width: 220px;
  height: 220px;
}

.qr-link {
  font-size: 0.85rem;
  color: #6a6f75;
  text-align: center;
  word-break: break-all;
}

.qr-download {
  display: block;
  text-align: center;
  background: #bb5f45;
  color: #ffffff;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 24px;
  text-decoration: none;
}
</style>
