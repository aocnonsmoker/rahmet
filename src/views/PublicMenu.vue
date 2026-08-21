<template>
  <ion-page>
    <ion-content :fullscreen="true" class="pm-content">
      <div class="pm-root">
        <h1 class="pm-title">Рахмет</h1>

        <div class="pm-search">
          <ion-icon :icon="searchIcon"></ion-icon>
          <input
            v-model="query"
            type="text"
            placeholder="Найти блюдо..."
            class="pm-search-input"
          />
        </div>

        <div class="pm-pills">
          <button
            v-for="category in categories"
            :key="category.id"
            class="pm-pill"
            :class="{ active: activeCategoryId === category.id }"
            type="button"
            @click="scrollToCategory(category.id)"
          >
            {{ category.label }}
          </button>
        </div>

        <div v-if="loading" class="pm-empty">Загрузка...</div>
        <div v-else-if="!filteredCategories.length" class="pm-empty">Ничего не найдено</div>

        <div v-for="category in filteredCategories" :key="category.id" :id="'cat-' + category.id" class="pm-section">
          <h2 class="pm-section-title">{{ category.label }}</h2>

          <div v-for="item in category.items" :key="item.id" class="pm-card">
            <div class="pm-photo">
              <img v-if="item.photo_path" :src="photoUrl(item.photo_path)" :alt="item.name" />
            </div>
            <div class="pm-card-body">
              <div class="pm-card-row">
                <div class="pm-card-name">{{ item.name }}</div>
                <div class="pm-card-price">{{ item.price }} тг.</div>
              </div>
              <div v-if="item.description" class="pm-card-desc">{{ item.description }}</div>
              <div v-if="item.tag" class="pm-tag">{{ item.tag }}</div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonContent, IonPage, IonIcon } from "@ionic/vue";
import { searchOutline } from "ionicons/icons";

const API_BASE = "http://79.76.52.210:8000";

export default {
  name: "PublicMenu",
  components: { IonContent, IonPage, IonIcon },
  data() {
    return {
      searchIcon: searchOutline,
      categories: [],
      query: "",
      activeCategoryId: null,
      loading: true,
    };
  },
  computed: {
    filteredCategories() {
      const q = this.query.trim().toLowerCase();
      if (!q) return this.categories;
      return this.categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => item.name.toLowerCase().includes(q)),
        }))
        .filter((category) => category.items.length);
    },
  },
  async mounted() {
    await this.loadMenu();
  },
  methods: {
    async loadMenu() {
      this.loading = true;
      try {
        const response = await fetch(`${API_BASE}/menu`);
        this.categories = await response.json();
        if (this.categories.length) this.activeCategoryId = this.categories[0].id;
      } finally {
        this.loading = false;
      }
    },
    photoUrl(path) {
      return `${API_BASE}/static/${path}`;
    },
    scrollToCategory(categoryId) {
      this.activeCategoryId = categoryId;
      const el = document.getElementById("cat-" + categoryId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  },
};
</script>

<style scoped>
.pm-content {
  --background: #f7efe6;
}

.pm-root {
  min-height: 100%;
  padding: 24px 16px 40px;
  background: #f7efe6;
}

.pm-title {
  text-align: center;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  font-weight: 700;
  color: #2b2320;
  margin: 4px 0 20px;
}

.pm-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 14px;
  color: #9a8f85;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.pm-search-input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.95rem;
  color: #2b2320;
}

.pm-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 18px;
  -webkit-overflow-scrolling: touch;
}

.pm-pill {
  flex-shrink: 0;
  border: none;
  background: #efe2d4;
  color: #4a3f37;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 10px 18px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
}

.pm-pill.active {
  background: #bb5f45;
  color: #ffffff;
}

.pm-section {
  margin-bottom: 22px;
}

.pm-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2b2320;
  margin: 0 0 12px;
}

.pm-card {
  display: flex;
  gap: 12px;
  background: #fffaf4;
  border: 1px solid #ecdfd0;
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 12px;
}

.pm-photo {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
}

.pm-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pm-card-body {
  flex: 1;
  min-width: 0;
}

.pm-card-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pm-card-name {
  font-weight: 700;
  font-size: 0.98rem;
  color: #2b2320;
}

.pm-card-price {
  font-weight: 700;
  font-size: 0.95rem;
  color: #bb5f45;
  white-space: nowrap;
}

.pm-card-desc {
  font-size: 0.82rem;
  color: #7c7168;
  margin-top: 4px;
}

.pm-tag {
  display: inline-block;
  margin-top: 8px;
  background: #f3d9d3;
  color: #a5453a;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
}

.pm-empty {
  text-align: center;
  color: #a49a90;
  padding: 40px 0;
}
</style>
