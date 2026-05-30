<template>
  <div class="user-list-page q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">User Management</div>
      <q-btn
        color="primary"
        icon="add"
        label="Add User"
        @click="$router.push('/users/create')"
      />
    </div>

    <!-- Search -->
    <q-card class="q-mb-md">
      <q-card-section>
        <q-input
          v-model="searchQuery"
          placeholder="Search by name or email..."
          outlined
          dense
          clearable
          @update:model-value="handleSearch"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- Users Table -->
    <q-card v-else-if="users.length > 0">
      <q-table
        :rows="users"
        :columns="columns"
        row-key="id"
        :rows-per-page-options="[10, 25, 50]"
        flat
        class="users-table"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <strong>{{ props.row.name }}</strong>
          </q-td>
        </template>

        <template #body-cell-email="props">
          <q-td :props="props">
            <a :href="`mailto:${props.row.email}`" class="email-link">{{ props.row.email }}</a>
          </q-td>
        </template>

        <template #body-cell-role="props">
          <q-td :props="props">
            <q-badge
              :color="getRoleColor(props.row.role)"
              :label="getRoleLabel(props.row.role)"
              text-color="white"
            />
          </q-td>
        </template>

        <template #body-cell-created_at="props">
          <q-td :props="props">
            {{ formatDate(props.row.created_at) }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row q-gutter-sm no-wrap">
              <q-btn
                flat
                dense
                round
                color="primary"
                icon="visibility"
                size="sm"
                @click="viewUser(props.row.id)"
              >
                <q-tooltip>View details</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                color="orange"
                icon="edit"
                size="sm"
                @click="editUser(props.row.id)"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                color="negative"
                icon="delete"
                size="sm"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Empty State -->
    <q-card v-else class="text-center q-py-xl">
      <q-icon name="person_outline" size="80px" color="grey-4" />
      <div class="text-h6 text-grey-6 q-mt-md">No users yet</div>
      <div class="text-grey-5 q-mb-md">Add the first user to get started</div>
      <q-btn
        color="primary"
        label="Add User"
        @click="$router.push('/users/create')"
      />
    </q-card>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Confirm Delete</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          Are you sure you want to delete user <strong>{{ (userToDelete && userToDelete.name) ? userToDelete.name : '' }}</strong>?
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { userApi } from '@/services/api'

const $q = useQuasar()
const router = useRouter()

// State
const users = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const deleteDialog = ref(false)
const userToDelete = ref(null)
const isDeleting = ref(false)

// Table columns
const columns = [
  {
    name: 'name',
    label: 'Name',
    field: 'name',
    align: 'left',
    sortable: true
  },
  {
    name: 'email',
    label: 'Email',
    field: 'email',
    align: 'left',
    sortable: true
  },
  {
    name: 'role',
    label: 'Role',
    field: 'role',
    align: 'center',
    sortable: true
  },
  {
    name: 'created_at',
    label: 'Created At',
    field: 'created_at',
    align: 'center',
    sortable: true
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'center'
  }
]

// Methods
const loadUsers = async () => {
  isLoading.value = true
  try {
    const params = {}
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const response = await userApi.getAll(params)
    users.value = response.data || []
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load users'
    })
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  clearTimeout(window.searchTimeout)
  window.searchTimeout = setTimeout(() => {
    loadUsers()
  }, 500)
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
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const viewUser = (id) => {
  router.push(`/users/${id}`)
}

const editUser = (id) => {
  router.push(`/users/${id}/edit`)
}

const confirmDelete = (user) => {
  userToDelete.value = user
  deleteDialog.value = true
}

const deleteUser = async () => {
  if (!userToDelete.value) return
  
  isDeleting.value = true
  try {
    await userApi.delete(userToDelete.value.id)
    
    $q.notify({
      type: 'positive',
      message: 'User deleted successfully'
    })
    
    deleteDialog.value = false
    userToDelete.value = null
    loadUsers()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to delete user'
    })
  } finally {
    isDeleting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.email-link {
  color: #1976d2;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
}

.users-table {
  font-size: 14px;
}
</style>
