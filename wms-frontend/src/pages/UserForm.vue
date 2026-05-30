<template>
  <div class="user-form-page q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        @click="$router.back()"
      />
      <div class="text-h5 q-ml-md">
        {{ isEditMode ? 'Edit User' : 'Add User' }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <!-- Form Card -->
    <q-card v-else>
      <q-card-section class="q-pa-lg">
        <div class="row q-col-gutter-lg">
          <!-- Basic Info -->
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.name"
              label="User Name *"
              outlined
              dense
              :error="!!errors.name"
              :error-message="errors.name"
              @blur="validateField('name')"
            />
          </div>

          <div class="col-12 col-md-6">
            <q-input
              v-model="form.email"
              label="Email *"
              type="email"
              outlined
              dense
              :error="!!errors.email"
              :error-message="errors.email"
              @blur="validateField('email')"
            />
          </div>

          <!-- Password -->
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.password"
              :label="isEditMode ? 'Password (leave blank to keep unchanged)' : 'Password *'"
              type="password"
              outlined
              dense
              :error="!!errors.password"
              :error-message="errors.password"
              @blur="validateField('password')"
            />
          </div>

          <!-- Confirm Password -->
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.password_confirmation"
              label="Confirm Password"
              type="password"
              outlined
              dense
              :error="!!errors.password_confirmation"
              :error-message="errors.password_confirmation"
              @blur="validateField('password_confirmation')"
            />
          </div>

          <!-- Role Selection -->
          <div class="col-12">
            <q-select
              v-model="form.role"
              :options="roleOptions"
              option-value="value"
              option-label="label"
              label="Role *"
              outlined
              dense
              emit-value
              map-options
              :error="!!errors.role"
              :error-message="errors.role"
              @blur="validateField('role')"
            />
            <div class="text-caption text-grey q-mt-sm">
              <div><strong>admin:</strong> Full system administrator</div>
              <div><strong>manager:</strong> Warehouse manager (reports, stock in/out)</div>
              <div><strong>warehouse_staff:</strong> Warehouse staff (stock in/out)</div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-section class="q-pa-lg bg-grey-1">
        <div class="row q-col-gutter-md justify-end">
          <div class="col-auto">
            <q-btn
              label="Cancel"
              flat
              color="grey"
              @click="$router.back()"
            />
          </div>
          <div class="col-auto">
            <q-btn
              :label="isEditMode ? 'Update' : 'Create'"
              color="primary"
              :loading="isSubmitting"
              @click="submitForm"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { userApi } from '@/services/api'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'warehouse_staff'
})
const errors = ref({})

const roleOptions = [
  { label: 'Administrator', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Warehouse Staff', value: 'warehouse_staff' }
]

const isEditMode = computed(() => {
  return !!route.params.id
})

// Methods
const loadUser = async () => {
  if (!isEditMode.value) return
  
  isLoading.value = true
  try {
    const response = await userApi.getById(route.params.id)
    const user = response.data
    form.value = {
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      role: user.role
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Unable to load user data'
    })
    router.push('/users')
  } finally {
    isLoading.value = false
  }
}

const validateField = (field) => {
  errors.value[field] = ''
  
  if (field === 'name') {
    if (!form.value.name.trim()) {
      errors.value.name = 'Please enter a name'
    }
  }
  
  if (field === 'email') {
    if (!form.value.email.trim()) {
      errors.value.email = 'Please enter an email'
    } else if (!isValidEmail(form.value.email)) {
      errors.value.email = 'Invalid email'
    }
  }
  
  if (field === 'password') {
    if (!isEditMode.value && !form.value.password) {
      errors.value.password = 'Please enter a password'
    } else if (form.value.password && form.value.password.length < 6) {
      errors.value.password = 'Password must be at least 6 characters'
    }
  }
  
  if (field === 'password_confirmation') {
    if (form.value.password && form.value.password !== form.value.password_confirmation) {
      errors.value.password_confirmation = 'Password confirmation does not match'
    }
  }
  
  if (field === 'role') {
    if (!form.value.role) {
      errors.value.role = 'Please select a role'
    }
  }
}

const validateAllFields = () => {
  errors.value = {}
  
  if (!form.value.name.trim()) {
    errors.value.name = 'Please enter a name'
  }
  
  if (!form.value.email.trim()) {
    errors.value.email = 'Please enter an email'
  } else if (!isValidEmail(form.value.email)) {
    errors.value.email = 'Invalid email'
  }
  
  if (!isEditMode.value && !form.value.password) {
    errors.value.password = 'Please enter a password'
  } else if (form.value.password && form.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
  }
  
  if (form.value.password && form.value.password !== form.value.password_confirmation) {
    errors.value.password_confirmation = 'Password confirmation does not match'
  }
  
  if (!form.value.role) {
    errors.value.role = 'Please select a role'
  }
  
  return Object.keys(errors.value).length === 0
}

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

const submitForm = async () => {
  if (!validateAllFields()) {
    $q.notify({
      type: 'warning',
      message: 'Please fix the errors before submitting'
    })
    return
  }
  
  isSubmitting.value = true
  try {
    const data = {
      name: form.value.name,
      email: form.value.email,
      role: form.value.role
    }
    
    // Only include password if it's set
    if (form.value.password) {
      data.password = form.value.password
      data.password_confirmation = form.value.password_confirmation
    }
    
    if (isEditMode.value) {
      await userApi.update(route.params.id, data)
      $q.notify({
        type: 'positive',
        message: 'User updated successfully'
      })
    } else {
      await userApi.create(data)
      $q.notify({
        type: 'positive',
        message: 'User created successfully'
      })
    }
    
    router.push('/users')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'An error occurred'
    })
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  if (isEditMode.value) {
    loadUser()
  }
})
</script>

<style scoped>
.user-form-page {
  max-width: 600px;
  margin: 0 auto;
}
</style>
