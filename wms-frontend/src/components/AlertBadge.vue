<template>
  <span class="alert-badge">
    <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a1 1 0 0 1 .894.553l7 14A1 1 0 0 1 17 18H3a1 1 0 0 1-.894-1.447l7-14A1 1 0 0 1 10 2zm0 3.618L4.618 16h10.764L10 5.618zM9 8h2v4H9V8zm0 6h2v2H9v-2z"/>
    </svg>
    <slot />
  </span>
</template>

<script>
export default {
  name: 'AlertBadge',
}
</script>

<style scoped>
.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  background: linear-gradient(90deg, #ff5252 0%, #ff9800 100%);
  color: #fff;
  border-radius: 16px;
  padding: 0.25em 0.9em 0.25em 0.6em;
  font-size: 1em;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255,82,82,0.18);
  animation: pulse-badge 1.2s infinite alternate;
  transition: box-shadow 0.2s;
}
.icon {
  width: 1.1em;
  height: 1.1em;
  margin-right: 0.2em;
  color: #fffde7;
  filter: drop-shadow(0 0 2px #ff9800);
}
@keyframes pulse-badge {
  0% { box-shadow: 0 0 0 0 #ff525280; }
  100% { box-shadow: 0 0 12px 4px #ff980080; }
}
</style>
