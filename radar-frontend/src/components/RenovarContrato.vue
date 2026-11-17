<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card style="width: 480px; max-width: 95vw">
      <q-form @submit="guardar">
        <q-card-section class="q-gutter-y-md">
          <div class="text-h6">Renovar contrato</div>
          <div>
            {{ equipo.nombre_cliente || 'Cliente sin nombre' }} ·
            {{ equipo.placa || equipo.imei || 'Sin placa' }}
          </div>
          <div>Vencimiento actual: {{ fecha(equipo.fecha_fin_contrato) || 'Sin fecha' }}</div>
          <q-banner v-if="error" class="bg-red-1 text-negative" role="alert">{{ error }}</q-banner>
          <q-input
            v-model="fin"
            outlined
            type="date"
            label="Nuevo vencimiento"
            stack-label
            :disable="guardando"
            :rules="[
              (v) => !!v || 'Indica la fecha',
              (v) =>
                (v > hoy && (!equipo.fecha_fin_contrato || v > equipo.fecha_fin_contrato)) ||
                'Debe ser posterior a hoy y al vencimiento actual',
            ]"
          />
          <q-select
            v-model="anio"
            outlined
            label="Año de renovación"
            :options="[2025, 2026, 2027, 2028]"
            :disable="guardando"
          />
          <q-input
            v-model="responsable"
            outlined
            label="Responsable"
            maxlength="100"
            :disable="guardando"
            hint="Nombre declarado manualmente; todavía no hay inicio de sesión."
            :rules="[(v) => v.trim().length >= 2 || 'Indica tu nombre']"
          />
          <q-input
            v-model="motivo"
            outlined
            type="textarea"
            label="Motivo / referencia"
            maxlength="1000"
            :disable="guardando"
            :rules="[(v) => v.trim().length >= 3 || 'Indica el motivo de la renovación']"
          />
          <div class="text-caption text-grey-8">
            Se cambiará el vencimiento y se marcará la renovación {{ anio }} como RENOVADO. El
            historial conservará los valores anteriores. Esta acción no registra un pago.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancelar"
            :disable="guardando"
            @click="emit('update:modelValue', false)"
          />
          <q-btn type="submit" color="primary" label="Confirmar renovación" :loading="guardando" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { post } from '@/utils/api'
import { fecha } from '@/utils/formato'

const props = defineProps({ modelValue: Boolean, equipo: { type: Object, required: true } })
const emit = defineEmits(['update:modelValue', 'renovado'])
const fin = ref('')
const anio = ref(2026)
const responsable = ref('')
const motivo = ref('')
const hoy = ref('')
const error = ref('')
const guardando = ref(false)

watch(
  () => props.modelValue,
  (abierta) => {
    if (!abierta) return
    hoy.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/La_Paz' }).format(new Date())
    anio.value = Math.min(2028, Math.max(2025, Number(hoy.value.slice(0, 4))))
    fin.value = ''
    motivo.value = ''
    error.value = ''
  },
  { immediate: true },
)

async function guardar() {
  if (guardando.value) return
  guardando.value = true
  error.value = ''
  const id = props.equipo.id
  try {
    await post(`/equipos/${id}/renovar`, {
      fecha_fin_nueva: fin.value,
      anio: anio.value,
      responsable: responsable.value,
      motivo: motivo.value,
      version: props.equipo.version,
    })
    emit('update:modelValue', false)
    emit('renovado', id)
  } catch (err) {
    error.value = err.message
  } finally {
    guardando.value = false
  }
}
</script>
