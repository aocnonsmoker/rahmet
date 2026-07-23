<template>
  <div v-if="modelValue" class="dm-scrim" @click.self="close">
    <div class="dm-card">
      <div class="dm-header">
        <div class="dm-title">{{ title }}</div>
        <button type="button" class="dm-close" @click="close">✕</button>
      </div>
      <div class="dm-body"><slot /></div>
      <div v-if="$slots.footer" class="dm-footer"><slot name="footer" /></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DesktopModal',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },
  },
};
</script>

<style scoped>
.dm-scrim {
  position: fixed;
  inset: 0;
  background: rgba(20, 22, 25, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.dm-card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #eceef0;
  flex-shrink: 0;
}

.dm-title {
  font-weight: 700;
  font-size: 1.02rem;
  color: #1c1c1e;
}

.dm-close {
  border: none;
  background: #f4f5f7;
  color: #6a6f75;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;
}

.dm-body {
  padding: 20px;
  overflow-y: auto;
}

.dm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eceef0;
  flex-shrink: 0;
}
</style>
