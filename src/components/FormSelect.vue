<template>
  <div class="ff">
    <label v-if="label" class="ff-label">{{ label }}</label>
    <div class="ff-wrap" :class="{ open: isOpen, 'open-up': openUpward }">
      <button ref="trigger" type="button" class="ff-trigger" @click="toggle">
        <span :class="{ 'ff-placeholder': !selectedLabel }">{{ selectedLabel || placeholder }}</span>
        <span class="ff-arrow">▾</span>
      </button>
      <Teleport to="body">
        <div v-if="isOpen" class="ff-dropdown" :style="dropdownStyle">
          <div
            v-for="opt in options"
            :key="opt.value"
            class="ff-option"
            :class="{ 'is-selected': isSelected(opt.value), multiple }"
            @click="select(opt.value)"
          ><span v-if="multiple" class="ff-checkbox">{{ isSelected(opt.value) ? '✓' : '' }}</span>{{ opt.label }}</div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script>
export default {
  name: "FormSelect",
  props: {
    modelValue: {
      type: [String, Number, Array],
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
    multiple: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  data() {
    return {
      isOpen: false,
      openUpward: false,
      dropdownStyle: {},
    };
  },
  computed: {
    selectedLabel() {
      if (this.multiple) {
        const values = this.modelValue || [];
        return this.options
          .filter((o) => values.some((v) => v == o.value))
          .map((o) => o.label)
          .join(', ');
      }
      const found = this.options.find((o) => o.value == this.modelValue);
      return found ? found.label : "";
    },
  },
  mounted() {
    document.addEventListener("click", this.onDocumentClick);
    // capture:true so this also fires for scroll on any nested scrollable
    // ancestor (e.g. a modal body) — scroll doesn't bubble, only capture.
    window.addEventListener("scroll", this.onWindowScroll, true);
    window.addEventListener("resize", this.close);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.onDocumentClick);
    window.removeEventListener("scroll", this.onWindowScroll, true);
    window.removeEventListener("resize", this.close);
  },
  methods: {
    toggle() {
      if (!this.isOpen) {
        this.openUpward = this.shouldOpenUpward();
        this.updateDropdownPosition();
      }
      this.isOpen = !this.isOpen;
    },
    close() {
      this.isOpen = false;
    },
    onWindowScroll(e) {
      // The dropdown's own option list scrolling also fires a (captured)
      // scroll event — only close for an ancestor container scrolling,
      // not for the user scrolling through the options themselves.
      if (e.target && e.target.closest && e.target.closest(".ff-dropdown")) return;
      this.close();
    },
    // Positioned relative to the viewport (not the trigger's offset parent)
    // and teleported to <body> so a scrollable ancestor (e.g. a modal body)
    // can't clip it — position:absolute inside an overflow:auto container
    // gets cut off there regardless of z-index.
    updateDropdownPosition() {
      const trigger = this.$refs.trigger;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const style = { position: "fixed", left: `${rect.left}px`, width: `${rect.width}px` };
      if (this.openUpward) {
        style.bottom = `${window.innerHeight - rect.top}px`;
      } else {
        style.top = `${rect.bottom}px`;
      }
      this.dropdownStyle = style;
    },
    shouldOpenUpward() {
      const trigger = this.$refs.trigger;
      if (!trigger) return false;
      const rect = trigger.getBoundingClientRect();
      const estimatedHeight = Math.min(260, this.options.length * 44 + 8);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      return spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    },
    isSelected(value) {
      if (this.multiple) {
        return (this.modelValue || []).some((v) => v == value);
      }
      return value == this.modelValue;
    },
    select(value) {
      if (this.multiple) {
        const values = this.modelValue || [];
        const next = values.some((v) => v == value) ? values.filter((v) => v != value) : [...values, value];
        this.$emit("update:modelValue", next);
        return;
      }
      this.$emit("update:modelValue", value);
      this.isOpen = false;
    },
    onDocumentClick(e) {
      if (!this.$el.contains(e.target) && !e.target.closest(".ff-dropdown")) {
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
  /* position/left/top or bottom/width come from the dropdownStyle inline
     style (computed from the trigger's bounding rect) — teleported to
     <body> and position:fixed so a scrollable ancestor (e.g. a modal body)
     can't clip it. */
  background: #fff;
  border-radius: 0 0 14px 14px;
  box-shadow: 0 0 0 2px #2196f3 inset, 0 12px 24px rgba(0, 0, 0, 0.12);
  max-height: 260px;
  overflow-y: auto;
  z-index: 99999;
}

/* When there isn't enough room below the trigger (e.g. near the bottom of a
   long scrollable page), open upward instead of getting clipped off-screen. */
.ff-wrap.open-up .ff-trigger {
  border-radius: 0 0 14px 14px;
}

.ff-wrap.open-up .ff-dropdown {
  border-radius: 14px 14px 0 0;
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

.ff-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 10px;
  border-radius: 5px;
  border: 2px solid #c4c8cc;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

.ff-option.multiple.is-selected .ff-checkbox {
  background: #2196f3;
  border-color: #2196f3;
}
</style>
