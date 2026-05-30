<template>
  <div class="user-detail-page q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        @click="$router.back()"
      />
      <div class="text-h5 q-ml-md">User Details</div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- User Details -->
    <div v-else-if="user">
      <q-card class="q-mb-md">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center">
            <div class="col">
              <div class="text-h6">{{ user.name }}</div>
              <div class="text-caption">{{ user.email }}</div>
            </div>
            <div class="col-auto">
              <q-badge
                :color="getRoleColor(user.role)"
                :label="getRoleLabel(user.role)"
                text-color="white"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <div class="row q-col-gutter-md">
            <!-- Basic Info -->
            <div class="col-12 col-md-6">
              <q-list>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="person" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Name</q-item-label>
                    <q-item-label>{{ user.name }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="email" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Email</q-item-label>
                    <q-item-label>
                      <a :href="`mailto:${user.email}`" class="email-link">{{ user.email }}</a>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="security" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Role</q-item-label>
                    <q-item-label>{{ getRoleLabel(user.role) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Timestamps -->
            <div class="col-12 col-md-6">
              <q-list>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="schedule" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Created At</q-item-label>
                    <q-item-label>{{ formatDate(user.created_at) }}</q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="update" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>Last Updated</q-item-label>
                    <q-item-label>{{ formatDate(user.updated_at) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-card-section>

        <!-- Actions -->
        <q-card-section class="bg-grey-1">
          <div class="row q-col-gutter-md">
            <div class="col-auto">
              <q-btn
                label="Edit"
                color="orange"
                icon="edit"
                @click="$router.push(`/users/${user.id}/edit`)"
              />
            </div>
            <div class="col-auto">
              <q-btn
                label="Delete"
                color="negative"
                icon="delete"
                @click="confirmDelete"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Error State -->
    <q-banner v-if="error" class="bg-negative text-white">
      <q-icon name="error" size="md" class="q-mr-sm" />
      {{ error }}
    </q-banner>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Confirm Delete</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          Are you sure you want to delete user <strong>{{ user ? user.name : '' }}</strong>?
          <div class="text-caption text-orange q-mt-sm">
            This action cannot be undone.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            :loading="isDeleting"
            @click="deleteUser"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { userApi } from '@/services/api'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()

// State
const user = ref(null)
const isLoading = ref(false)
const error = ref('')
const deleteDialog = ref(false)
const isDeleting = ref(false)

// Methods
const loadUser = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const response = await userApi.getById(route.params.id)
    user.value = response.data
  } catch (err) {
    error.value = 'Unable to load user data'
    $q.notify({
      type: 'negative',
      message: error.value
    })
  } finally {
    isLoading.value = false
  }
}

const getRoleColor = (role) => {
  const colors = {
    'admin': 'red',
    'manager': 'orange',
    'warehouse_staff': 'blue',
    'staff': 'blue'
  }
  return colors[role] || 'grey'
}

const getRoleLabel = (role) => {
  const labels = {
    'admin': 'Administrator',
    'manager': 'Manager',
    'warehouse_staff': 'Warehouse Staff',
    'staff': 'Staff'
  }
  return labels[role] || role
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const confirmDelete = () => {
  deleteDialog.value = true
}

const deleteUser = async () => {
  if (!user.value) return
  
  isDeleting.value = true
  try {
    await userApi.delete(user.value.id)
    
    $q.notify({
      type: 'positive',
      message: 'User deleted successfully'
    })
    
    router.push('/users')
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Unable to delete user'
    })
  } finally {
    isDeleting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadUser()
})
</script>

<style scoped>
.user-detail-page {
  max-width: 800px;
  margin: 0 auto;
}

.email-link {
  color: #1976d2;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
}
</style>
