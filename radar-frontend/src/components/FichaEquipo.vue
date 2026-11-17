<template>
  <q-dialog v-model="abierta" position="right" full-height>
    <q-card class="column no-wrap" style="width: 520px; max-width: 100vw">
      <q-card-section v-if="ficha" class="row items-start no-wrap">
        <div class="col">
          <div class="text-h6">{{ ficha.ficha.nombre_cliente || 'Cliente sin nombre' }}</div>
          <div class="text-caption text-grey-7">{{ subtitulo }}</div>
        </div>
        <q-badge
          class="q-mr-sm q-mt-xs"
          :color="COLOR_ESTADO[ficha.ficha.estado] || 'grey'"
          :label="ficha.ficha.estado"
        />
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>
      <q-card-section v-else class="row justify-end q-pb-none">
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="cargando" class="text-center q-pa-xl">
        <q-spinner color="primary" size="32px" />
      </q-card-section>
      <q-banner v-else-if="error" class="bg-negative text-white">{{ error }}</q-banner>

      <q-scroll-area v-else-if="ficha" class="col">
        <div class="q-pa-md q-gutter-y-lg">
          <q-banner v-if="exito" class="bg-green-1 text-positive" role="status"
            >Renovación guardada correctamente.</q-banner
          >
          <q-btn
            color="primary"
            icon="event_repeat"
            label="Renovar contrato"
            no-caps
            @click="renovacionAbierta = true"
          />
          <div>
            <div class="text-overline text-grey-7">Historial de renovaciones</div>
            <div v-if="!ficha.renovaciones?.length" class="text-caption text-grey-7">
              Sin renovaciones registradas en el sistema.
            </div>
            <q-list v-else bordered separator>
              <q-item v-for="r in ficha.renovaciones" :key="r.id">
                <q-item-section>
                  <q-item-label
                    >{{ fecha(r.fecha_fin_anterior) || 'Sin fecha' }} →
                    {{ fecha(r.fecha_fin_nueva) }}</q-item-label
                  >
                  <q-item-label
                    >Renovación {{ r.anio }}: {{ r.estado_anterior || 'Sin estado' }} →
                    {{ r.estado_nuevo }}</q-item-label
                  >
                  <q-item-label caption
                    >{{ momento(r.creado_en) }} · {{ r.responsable }} ({{
                      r.identidad_verificada ? 'identidad verificada' : 'nombre declarado'
                    }})</q-item-label
                  >
                  <q-item-label
                    class="q-mt-xs"
                    style="white-space: pre-wrap; overflow-wrap: anywhere"
                    >{{ r.motivo }}</q-item-label
                  >
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-for="s in secciones" :key="s.titulo">
            <div class="text-overline text-grey-7">{{ s.titulo }}</div>
            <div v-for="it in s.items" :key="it.label" class="row items-baseline q-py-xs">
              <div class="col-5 text-grey-7">{{ it.label }}</div>
              <div class="col-7 row items-center no-wrap">
                <span class="col" style="overflow-wrap: anywhere">{{ it.value }}</span>
                <q-btn
                  v-if="it.wa"
                  flat
                  dense
                  round
                  size="sm"
                  icon="chat"
                  color="positive"
                  :href="it.wa"
                  target="_blank"
                  rel="noopener"
                >
                  <q-tooltip>Abrir WhatsApp</q-tooltip>
                </q-btn>
                <q-icon v-else-if="it.dudoso" name="warning" color="warning" size="18px">
                  <q-tooltip>Número que parece de relleno</q-tooltip>
                </q-icon>
              </div>
            </div>
          </div>

          <div v-if="ficha.historial.length">
            <div class="text-overline text-grey-7">Estado por mes</div>
            <div class="row q-gutter-xs q-mb-sm">
              <q-badge
                v-for="r in resumenHistorial"
                :key="r.valor"
                :color="colorMes(r.valor)"
                :label="`${r.valor} · ${r.n}`"
              />
            </div>
            <div class="grilla-meses">
              <div v-for="(h, i) in ficha.historial" :key="i" class="mes">
                <div class="text-caption text-grey-7">{{ etiquetaMes(h.mes) }}</div>
                <q-badge :color="colorMes(h.valor)" :label="h.valor || '—'" />
              </div>
            </div>
          </div>

          <div v-if="ficha.otros.length">
            <div class="text-overline text-grey-7">
              Otros equipos del mismo cliente ({{ ficha.otros.length }})
            </div>
            <q-list dense separator bordered class="rounded-borders">
              <q-item v-for="o in ficha.otros" :key="o.id" clickable @click="abrir(o.id)">
                <q-item-section>
                  <q-item-label>{{ o.placa || 'Sin placa' }}</q-item-label>
                  <q-item-label caption>
                    {{ o.imei || 'Sin IMEI' }} · vence {{ fecha(o.fin) || 'sin fecha' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="COLOR_ESTADO[o.estado] || 'grey'" :label="o.estado" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div class="text-caption text-grey-6">
            Origen: {{ ficha.ficha.archivo }}, fila {{ ficha.ficha.fila_excel }}
          </div>
        </div>
      </q-scroll-area>
    </q-card>
  </q-dialog>
  <RenovarContrato
    v-if="ficha"
    v-model="renovacionAbierta"
    :equipo="ficha.ficha"
    @renovado="alRenovar"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { get } from '@/utils/api'
import RenovarContrato from '@/components/RenovarContrato.vue'
import { bs, fecha, limpio } from '@/utils/formato'
import { telDudoso, whatsapp } from '@/utils/contacto'
import { COLOR_ESTADO, CREDITO } from '@/utils/estados'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  equipoId: { type: [Number, String], default: null },
  renovarAlAbrir: Boolean,
})
const emit = defineEmits(['update:modelValue', 'renovado'])

const abierta = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const cargando = ref(false)
const error = ref('')
const ficha = ref(null)
const renovacionAbierta = ref(false)
const exito = ref(false)
const momento = (valor) => new Date(valor).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })
async function alRenovar(id) {
  emit('renovado', id)
  await abrir(id)
  exito.value = true
}

let token = 0
async function abrir(id, renovar = false) {
  exito.value = false
  renovacionAbierta.value = false
  const mio = ++token
  cargando.value = true
  error.value = ''
  ficha.value = null
  try {
    const d = await get(`/equipos/${id}`, {})
    if (mio === token) {
      ficha.value = d
      renovacionAbierta.value = renovar
    }
  } catch (err) {
    if (mio === token) error.value = `No se pudo abrir la ficha. ${err.message}`
  } finally {
    if (mio === token) cargando.value = false
  }
}

watch(
  () => [props.modelValue, props.equipoId],
  ([abre, id]) => {
    if (abre && id) abrir(id, props.renovarAlAbrir)
  },
  { immediate: true },
)

const subtitulo = computed(() => {
  const f = ficha.value?.ficha
  if (!f) return ''
  const suc = f.sucursal && f.sucursal !== 'Sin sucursal' ? ` · ${f.sucursal}` : ''
  return `${f.org}${suc}`
})

const secciones = computed(() => {
  const f = ficha.value?.ficha
  if (!f) return []
  const it = (label, value, tel) => ({
    label,
    value: limpio(value),
    wa: tel ? whatsapp(value) : '',
    dudoso: tel ? telDudoso(value) : false,
  })
  const def = [
    [
      'Contacto',
      [
        it('Documento', f.documento_cliente),
        it('Teléfono 1', f.telefono_1, true),
        it('Teléfono 2', f.telefono_2, true),
      ],
    ],
    [
      'Equipo GPS',
      [
        it('IMEI', f.imei),
        it('SIM', f.sim),
        it('Operador', f.operador === 'Sin operador' ? '' : f.operador),
        it('Modelo GPS', f.modelo_gps),
        it('Estado GPS', f.estado_gps),
      ],
    ],
    [
      'Vehículo',
      [
        it('Tipo', f.tipo_vehiculo),
        it('Modelo', f.modelo_vehiculo),
        it('Placa', f.placa),
        it('Chasis', f.chasis),
        it('Motor', f.motor),
      ],
    ],
    [
      'Contrato',
      [
        it('Estado del crédito', CREDITO[f.estado_credito]?.[0] ?? f.estado_credito),
        it('Inicio', fecha(f.fecha_inicio_contrato)),
        it('Fin', fecha(f.fecha_fin_contrato)),
        it('Importe', bs(f.importe_contrato)),
        it('Facturado', f.facturado),
        it('Mes de registro', f.mes_registro),
        it('Activación', fecha(f.fecha_activacion)),
        it('Entrega', fecha(f.fecha_entrega)),
        it('Comercial', f.comercial),
        it('Renovación 2025', f.estado_renovacion_2025),
        it('Renovación 2026', f.estado_renovacion_2026),
        it('Renovación 2027', f.estado_renovacion_2027),
        it('Renovación 2028', f.estado_renovacion_2028),
        it('Notas', f.notas),
      ],
    ],
  ]
  return def
    .map(([titulo, items]) => ({ titulo, items: items.filter((x) => x.value) }))
    .filter((s) => s.items.length)
})

const COLOR_MES = {
  CANCELADO: 'positive',
  'FALTA PAGAR': 'warning',
  'FALTA PAGAR 2': 'negative',
  ACTIVADO: 'primary',
  INACTIVOS: 'grey',
}
const colorMes = (v) =>
  COLOR_MES[
    String(v || '')
      .trim()
      .toUpperCase()
  ] || 'grey-5'
// "ene-252" en el Excel es el segundo "ene-25"
const etiquetaMes = (m) => String(m).replace(/^([a-z]{3}-\d{2})(\d)$/i, '$1 (2)')

const resumenHistorial = computed(() => {
  const cuenta = new Map()
  for (const h of ficha.value?.historial ?? []) {
    const v =
      String(h.valor || '')
        .trim()
        .toUpperCase() || '—'
    cuenta.set(v, (cuenta.get(v) ?? 0) + 1)
  }
  return [...cuenta.entries()].map(([valor, n]) => ({ valor, n })).sort((a, b) => b.n - a.n)
})
</script>

<style scoped>
.grilla-meses {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px 8px;
}
.mes {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
</style>
