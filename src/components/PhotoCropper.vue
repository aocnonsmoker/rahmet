<template>
  <div class="cropper-overlay" @click.self="$emit('cancel')">
    <div class="cropper-panel">
      <div class="cropper-title">Настройте фото</div>
      <div
        ref="viewport"
        class="cropper-viewport"
        @pointerdown="startDrag"
        @wheel.prevent="onWheel"
      >
        <img
          ref="img"
          :src="imageSrc"
          class="cropper-img"
          :style="imgStyle"
          draggable="false"
          @load="onImageLoad"
        />
      </div>
      <input
        type="range"
        class="cropper-zoom"
        :min="minScale"
        :max="minScale * 3"
        :step="(minScale * 3 - minScale) / 100 || 0.01"
        v-model.number="scale"
        @input="clampOffset"
      />
      <div class="cropper-actions">
        <button type="button" class="cropper-btn ghost" @click="$emit('cancel')">Отмена</button>
        <button type="button" class="cropper-btn primary" @click="confirm">Готово</button>
      </div>
    </div>
  </div>
</template>

<script>
// Круглый аватар: пользователь двигает фото (drag/touch) и масштабирует
// (колесо мыши или ползунок), затем "Готово" запекает видимую область
// в квадратный canvas — ровно то, что было видно в кружке.
const VIEWPORT = 220;
const OUTPUT_SIZE = 320;

export default {
  name: 'PhotoCropper',
  props: {
    imageSrc: { type: String, required: true },
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      naturalWidth: 1,
      naturalHeight: 1,
      minScale: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      dragStart: { x: 0, y: 0 },
    };
  },
  computed: {
    imgStyle() {
      return {
        width: `${this.naturalWidth * this.scale}px`,
        height: `${this.naturalHeight * this.scale}px`,
        transform: `translate(-50%, -50%) translate(${this.offsetX}px, ${this.offsetY}px)`,
      };
    },
  },
  beforeUnmount() {
    this.stopDrag();
  },
  methods: {
    onImageLoad(e) {
      this.naturalWidth = e.target.naturalWidth || 1;
      this.naturalHeight = e.target.naturalHeight || 1;
      this.minScale = Math.max(VIEWPORT / this.naturalWidth, VIEWPORT / this.naturalHeight);
      this.scale = this.minScale;
      this.offsetX = 0;
      this.offsetY = 0;
    },
    clampOffset() {
      const w = this.naturalWidth * this.scale;
      const h = this.naturalHeight * this.scale;
      const maxX = Math.max(0, (w - VIEWPORT) / 2);
      const maxY = Math.max(0, (h - VIEWPORT) / 2);
      this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));
      this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));
    },
    startDrag(e) {
      this.dragging = true;
      this.dragStart = { x: e.clientX - this.offsetX, y: e.clientY - this.offsetY };
      window.addEventListener('pointermove', this.onDrag);
      window.addEventListener('pointerup', this.stopDrag);
    },
    onDrag(e) {
      if (!this.dragging) return;
      this.offsetX = e.clientX - this.dragStart.x;
      this.offsetY = e.clientY - this.dragStart.y;
      this.clampOffset();
    },
    stopDrag() {
      this.dragging = false;
      window.removeEventListener('pointermove', this.onDrag);
      window.removeEventListener('pointerup', this.stopDrag);
    },
    onWheel(e) {
      const next = this.scale - e.deltaY * 0.001 * this.scale;
      this.scale = Math.min(this.minScale * 3, Math.max(this.minScale, next));
      this.clampOffset();
    },
    confirm() {
      const ratio = OUTPUT_SIZE / VIEWPORT;
      const drawW = this.naturalWidth * this.scale * ratio;
      const drawH = this.naturalHeight * this.scale * ratio;
      const drawX = OUTPUT_SIZE / 2 + this.offsetX * ratio - drawW / 2;
      const drawY = OUTPUT_SIZE / 2 + this.offsetY * ratio - drawH / 2;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      canvas.getContext('2d').drawImage(this.$refs.img, drawX, drawY, drawW, drawH);
      this.$emit('confirm', canvas.toDataURL('image/jpeg', 0.9));
    },
  },
};
</script>

<style scoped>
.cropper-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
}

.cropper-panel {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 280px;
}

.cropper-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1c1c1e;
}

.cropper-viewport {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  background: #eef0f0;
  cursor: grab;
  touch-action: none;
}

.cropper-viewport:active {
  cursor: grabbing;
}

.cropper-img {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  max-width: none;
  pointer-events: none;
  user-select: none;
}

.cropper-zoom {
  width: 100%;
}

.cropper-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.cropper-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 10px 0;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}

.cropper-btn.ghost {
  background: #eef0f0;
  color: #1c1c1e;
}

.cropper-btn.primary {
  background: #2196f3;
  color: #ffffff;
}
</style>
