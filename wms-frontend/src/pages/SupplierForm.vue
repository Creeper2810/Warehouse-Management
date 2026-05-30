<template>
  <div class="supplier-form-page q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" @click="$router.back()" />
      <div class="text-h5 q-ml-md">
        {{ isEditMode ? 'Edit Supplier' : 'Add Supplier' }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center q-py-xl">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md text-grey-6">Loading data...</div>
    </div>

    <q-card v-else>
      <q-card-section>
        <q-form @submit="handleSubmit" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-input
                v-model="form.name"
                label="Supplier Name *"
                outlined
                dense
                :rules="[val => !!val || 'Supplier name is required']"
                :error="!!errors.name"
                :error-message="errors.name"
                @update:model-value="errors.name = ''"
              >
                <template #prepend>
                  <q-icon name="business" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.contact_name"
                label="Contact Person"
                outlined
                dense
                :error="!!errors.contact_name"
                :error-message="errors.contact_name"
                @update:model-value="errors.contact_name = ''"
              >
                <template #prepend>
                  <q-icon name="person" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.phone"
                label="Phone Number"
                outlined
                dense
                :error="!!errors.phone"
                :error-message="errors.phone"
                @update:model-value="errors.phone = ''"
              >
                <template #prepend>
                  <q-icon name="phone" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="Email"
                outlined
                dense
                :error="!!errors.email"
                :error-message="errors.email"
                @update:model-value="errors.email = ''"
              >
                <template #prepend>
                  <q-icon name="mail" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.address"
                label="Address"
                outlined
                dense
                :error="!!errors.address"
                :error-message="errors.address"
                @update:model-value="errors.address = ''"
              >
                <template #prepend>
                  <q-icon name="location_on" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.status"
                :options="statusOptions"
                emit-value
                map-options
                label="Status"
                outlined
                dense
                :error="!!errors.status"
                :error-message="errors.status"
                @update:model-value="errors.status = ''"
              >
                <template #prepend>
                  <q-icon name="toggle_on" />
                </template>
              </q-select>
            </div>
          </div>

          <div class="row q-gutter-sm justify-end q-mt-md">
            <q-btn flat label="Cancel" color="grey" @click="$router.back()" />
            <q-btn
              type="submit"
              :label="isEditMode ? 'Update' : 'Create'"
              color="primary"
              :loading="isSaving"
              :disable="isSaving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { supplierApi } from '@/services/api'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const canManageSuppliers = computed(() => {
  const role = auth.user?.role || auth.user?.type || ''
  return role === 'admin'
})

const isEditMode = computed(() => !!route.params.id)
const supplierId = computed(() => route.params.id)

const isLoading = ref(false)
const isSaving = ref(false)
const errors = ref({})

const form = ref({
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  status: 'active'
})

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const loadSupplier = async () => {
  if (!isEditMode.value) return

  isLoading.value = true
  try {
    const response = await supplierApi.getById(supplierId.value)
    const supplier = response.data

    form.value = {
      name: supplier.name || '',
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      status: supplier.status || 'active'
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Unable to load supplier details'
    })
    router.push('/suppliers')
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  errors.value = {}
  isSaving.value = true

  try {
    if (isEditMode.value) {
      await supplierApi.update(supplierId.value, form.value)
      $q.notify({ type: 'positive', message: 'Supplier updated successfully' })
    } else {
      await supplierApi.create(form.value)
      $q.notify({ type: 'positive', message: 'Supplier created successfully' })
    }

    router.push('/suppliers')
  } catch (error) {
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors
    }

    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'An error occurred'
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  if (!canManageSuppliers.value) {
    $q.notify({ type: 'negative', message: 'You do not have permission to access this feature' })
    router.push('/')
    return
  }

  loadSupplier()
})
</script>
