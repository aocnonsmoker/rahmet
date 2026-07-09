<template>
  <div class="ff">
    <label v-if="label" class="ff-label">{{ label }}</label>
    <div class="ff-wrap" :class="{ open: isOpen }">
      <button type="button" class="ff-trigger" @click="toggle">
        <span :class="{ 'ff-placeholder': !selectedLabel }">{{ selectedLabel || placeholder }}</span>
        <span class="ff-arrow">▾</span>
      </button>
      <div v-if="isOpen" class="ff-dropdown">
        <div
          v-for="opt in options"
          :key="opt.value"
          class="ff-option"
          :class="{ 'is-selected': opt.value == modelValue }"
          @click="select(opt.value)"
        >{{ opt.label }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "FormSelect",
  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
    options: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      isOpen: false,
    };
  },
  computed: {
    selectedLabel() {
      const found = this.options.find((o) => o.value == this.modelValue);
      return found ? found.label : "";
    },
  },
  mounted() {
    document.addEventListener("click", this.onDocumentClick);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.onDocumentClick);
  },
  methods: {
    toggle() {
      this.isOpen = !this.isOpen;
    },
    select(value) {
      this.$emit("update:modelValue", value);
      this.isOpen = false;
    },
    onDocumentClick(e) {
      if (!this.$el.contains(e.target)) {
        this.isOpen = false;
      }
    },
  },
};
</script>

<style scoped>
.ff {
  margin-bottom: 14px;
}

.ff-label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: #1c1c1e;
  margin-bottom: 6px;
}

.ff-wrap {
  position: relative;
}

.ff-trigger {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: #eef0f0;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #1c1c1e;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

.ff-placeholder {
  color: #9aa0a6;
  font-weight: 400;
}

.ff-arrow {
  color: #6a6f75;
  font-size: 0.8rem;
  transition: transform 0.15s ease;
}

.ff-wrap.open .ff-trigger {
  background: #fff;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 0 0 2px #2196f3 inset;
}

.ff-wrap.open .ff-arrow {
  transform: rotate(180deg);
  color: #2196f3;
}

.ff-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 0 0 14px 14px;
  box-shadow: 0 0 0 2px #2196f3 inset, 0 12px 24px rgba(0, 0, 0, 0.12);
  max-height: 260px;
  overflow-y: auto;
  z-index: 30;
}

.ff-option {
  padding: 12px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1c1c1e;
  cursor: pointer;
}

.ff-option:hover {
  background: rgba(33, 150, 243, 0.08);
}

.ff-option.is-selected {
  background: rgba(33, 150, 243, 0.15);
  font-weight: 700;
}
</style>
