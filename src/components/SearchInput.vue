<template>
  <div class="search-box">
    <span class="search-icon">🔍</span>
    <input
      class="search-input"
      type="search"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button v-if="modelValue" class="search-clear" type="button" aria-label="Очистить" @click="$emit('update:modelValue', '')">✕</button>
  </div>
</template>

<script>
export default {
  name: 'SearchInput',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Поиск по ФИО или телефону' },
  },
  emits: ['update:modelValue'],
};
</script>

<style scoped>
.search-box {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  opacity: 0.55;
  pointer-events: none;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: #eef0f0;
  border-radius: 14px;
  padding: 12px 40px 12px 40px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1c1c1e;
  font-family: inherit;
}

.search-input::placeholder {
  color: #9aa0a6;
  font-weight: 400;
}

/* Native clear "x" duplicates ours. */
.search-input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-size: 0.9rem;
  padding: 6px 8px;
  cursor: pointer;
}
</style>
