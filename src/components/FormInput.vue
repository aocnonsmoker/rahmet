<template>
  <div class="ff">
    <label v-if="label" class="ff-label">{{ label }}</label>
    <div class="ff-box">
      <input
        class="ff-input"
        :class="{ 'has-stepper': type === 'number' }"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :disabled="disabled"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <span v-if="suffix" class="ff-suffix" :class="{ 'with-stepper': type === 'number' }">{{ suffix }}</span>
      <div v-if="type === 'number'" class="ff-stepper">
        <button type="button" class="ff-step-btn" @click="stepBy(1)">▲</button>
        <button type="button" class="ff-step-btn" @click="stepBy(-1)">▼</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "FormInput",
  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "text",
    },
    placeholder: {
      type: String,
      default: "",
    },
    suffix: {
      type: String,
      default: "",
    },
    step: {
      type: Number,
      default: 1,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  methods: {
    stepBy(direction) {
      const current = Number(this.modelValue) || 0;
      this.$emit("update:modelValue", String(current + direction * this.step));
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

.ff-box {
  position: relative;
}

.ff-input {
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
}

.ff-input::placeholder {
  color: #9aa0a6;
  font-weight: 400;
}

.ff-input.has-stepper {
  padding-right: 40px;
}

.ff-input[type="number"]::-webkit-outer-spin-button,
.ff-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ff-input[type="number"] {
  -moz-appearance: textfield;
}

.ff-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ff-suffix {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #6a6f75;
  font-weight: 600;
  pointer-events: none;
}

.ff-suffix.with-stepper {
  right: 40px;
}

.ff-stepper {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
}

.ff-step-btn {
  border: none;
  background: transparent;
  color: #9aa0a6;
  font-size: 8px;
  line-height: 1;
  padding: 2px 2px;
  cursor: pointer;
}
</style>
