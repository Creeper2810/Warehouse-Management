<template>
  <div class="auth-layout">
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AuthLayout',
}
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
 background: linear-gradient(120deg, #e3f2fd 60%, #f5f6fa 100%);

}
</style>
