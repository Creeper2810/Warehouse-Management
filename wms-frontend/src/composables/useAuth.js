// useAuth.js
import { ref } from 'vue';

export function useAuth() {
  const isAuthenticated = ref(false);
  function login() {
    isAuthenticated.value = true;
  }
  function logout() {
    isAuthenticated.value = false;
  }
  return { isAuthenticated, login, logout };
}
