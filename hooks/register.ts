import type { Register } from 'claude-code'

type Esfuerzo = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

type Tarea = {
  nombre: string
  descripcion: string
  modelo: string
  esfuerzo?: Esfuerzo
  palabras: RegExp
}

const FABLE = 'claude-fable-5-2'
const OPUS = 'claude-opus-5-5'
const SONNET = 'claude-sonnet-5-5'
const HAIKU = 'claude-haiku-5-5'

const NOMBRE_MODELO: Record<string, string> = {
  [FABLE]: 'Fable 5.2',
  [OPUS]: 'Opus 5.5',
  [SONNET]: 'Sonnet 5.5',
  [HAIKU]: 'Haiku 5.5',
}

// En orden de prioridad: la primera que calza gana.
const TAREAS: Tarea[] = [
  {
    nombre: 'bug',
    descripcion: 'bug difícil',
    modelo: OPUS,
    esfuerzo: 'max',
    palabras:
      /\b(bug|falla|fallo|error|no funciona|se cae|se rompe|roto|crash|excepci[oó]n|depura|debug|diagn[oó]stic)/i,
  },
  {
    nombre: 'seguridad',
    descripcion: 'auditoría de seguridad',
    modelo: FABLE,
    esfuerzo: 'high',
    palabras: /\b(seguridad|auditor[ií]a|vulnerab|security|audit|pentest|rls|inyecci[oó]n|xss|csrf)/i,
  },
  {
    nombre: 'revision',
    descripcion: 'revisión de código (otro modelo)',
    modelo: OPUS,
    palabras: /\b(revisa el (c[oó]digo|pr|diff|cambio)|revisi[oó]n de c[oó]digo|code review|review)\b/i,
  },
  {
    nombre: 'auth-pagos',
    descripcion: 'autenticación y pagos',
    modelo: OPUS,
    palabras:
      /\b(auth|login|inicio de sesi[oó]n|contrase[nñ]a|password|oauth|jwt|permiso|rol(es)?\b|pago|pagos|cobro|factura|stripe|webpay|transferencia)/i,
  },
  {
    nombre: 'tests',
    descripcion: 'escribir tests',
    modelo: OPUS,
    palabras: /\b(tests?|pruebas? (unitaria|automatizada)|vitest|escribe (un |los )?test|cobertura)/i,
  },
  {
    nombre: 'renombrar',
    descripcion: 'renombrar',
    modelo: HAIKU,
    palabras: /\b(renombr|rename|cambia el nombre)/i,
  },
  {
    nombre: 'buscar',
    descripcion: 'buscar en el código',
    modelo: HAIKU,
    palabras: /\b(busca|buscar|d[oó]nde (est[aá]|se)|encuentra|search|find|grep|qu[eé] archivo)/i,
  },
  {
    nombre: 'plan',
    descripcion: 'planear una funcionalidad',
    modelo: FABLE,
    esfuerzo: 'high',
    palabras: /\b(planea|planifica|plan\b|dise[nñ]a|diseño|arquitectura|propuesta|c[oó]mo deber[ií]amos)/i,
  },
  {
    nombre: 'frontend',
    descripcion: 'interfaz (front end)',
    modelo: OPUS,
    palabras:
      /\b(ui|interfaz|front ?end|pantalla|bot[oó]n|dise[nñ]o visual|estilo|css|tailwind|componente|vista|formulario|layout|responsive)/i,
  },
  {
    nombre: 'construir',
    descripcion: 'construir la funcionalidad',
    modelo: SONNET,
    palabras: /\b(construye|implementa|hazlo|haz\b|agrega|crea|programa|desarrolla|build|implement)/i,
  },
]

const POR_NOMBRE = new Map(TAREAS.map(t => [t.nombre, t]))

const CLAVE_FIJADA = 'fijada'
const CLAVE_APAGADO = 'apagado'

// Estado del módulo: se reinicia al recargar; lo fijado vive en $.store.
let actual: Tarea | undefined
let ultimoModeloConstruir = SONNET

function detectar(texto: string): Tarea | undefined {
  return TAREAS.find(t => t.palabras.test(texto))
}

function modeloDe(t: Tarea): string {
  // La revisión usa un modelo distinto al que construyó.
  if (t.nombre === 'revision') return ultimoModeloConstruir === SONNET ? OPUS : SONNET
  return t.modelo
}

function etiqueta(t: Tarea, fijada: boolean): string {
  const m = NOMBRE_MODELO[modeloDe(t)] ?? modeloDe(t)
  const e = t.esfuerzo ? ` (${t.esfuerzo})` : ''
  return `Tarea: ${t.nombre}${fijada ? ' [fija]' : ''} · ${m}${e}`
}

function lista(): string {
  return TAREAS.map(t => {
    const m = NOMBRE_MODELO[modeloDe(t)] ?? modeloDe(t)
    return `  ${t.nombre.padEnd(11)} ${m}${t.esfuerzo ? ` · esfuerzo ${t.esfuerzo}` : ''} — ${t.descripcion}`
  }).join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tarea',
      description: 'Fija la tarea (y su modelo): /tarea <tipo>, /tarea auto, /tarea apagar',
    })
    const fijada = POR_NOMBRE.get(String((await $.store.get(CLAVE_FIJADA)) ?? ''))
    if (fijada) {
      actual = fijada
      $.ui.status(etiqueta(fijada, true))
    }
    return next(e)
  })

  on('command.run', { command: 'tarea' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '') {
      const fijada = String((await $.store.get(CLAVE_FIJADA)) ?? '')
      const apagado = (await $.store.get(CLAVE_APAGADO)) === true
      const modo = apagado ? 'apagado' : fijada ? `fija en «${fijada}»` : 'automático'
      return {
        text: `Modo: ${modo}.\nTareas:\n${lista()}\n\nUso: /tarea <tipo> fija una tarea · /tarea auto vuelve a detectar sola · /tarea apagar deja el modelo de la sesión.`,
      }
    }
    if (arg === 'auto') {
      await $.store.delete(CLAVE_FIJADA)
      await $.store.delete(CLAVE_APAGADO)
      $.ui.status('Tarea: automática')
      return { text: 'Detección automática activada: el modelo cambia según lo que pidas.' }
    }
    if (arg === 'apagar' || arg === 'off') {
      await $.store.set(CLAVE_APAGADO, true)
      await $.store.delete(CLAVE_FIJADA)
      actual = undefined
      $.ui.status(undefined)
      return { text: 'Cambio de modelo apagado: se usa el modelo de la sesión. /tarea auto lo vuelve a encender.' }
    }
    const t = POR_NOMBRE.get(arg)
    if (!t) return { text: `No conozco la tarea «${arg}». Tareas:\n${lista()}` }
    await $.store.set(CLAVE_FIJADA, t.nombre)
    await $.store.delete(CLAVE_APAGADO)
    actual = t
    $.ui.status(etiqueta(t, true))
    return { text: `Tarea fijada: ${etiqueta(t, true)}. /tarea auto vuelve a la detección automática.` }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta) return next(e)
    if ((await $.store.get(CLAVE_APAGADO)) === true) return next(e)
    const fijada = POR_NOMBRE.get(String((await $.store.get(CLAVE_FIJADA)) ?? ''))
    if (fijada) {
      actual = fijada
    } else {
      // Sin palabra clave se mantiene la tarea anterior (p. ej. «sí, sigue»).
      actual = detectar(e.text) ?? actual
    }
    if (actual) $.ui.status(etiqueta(actual, !!fijada))
    return next(e)
  }).catch(($, e, next) => next(e)) // si la detección falla, el prompt sigue igual

  on('turn.step', async function* ($, e, next) {
    // Solo el hilo principal; los subagentes conservan su propio modelo.
    if (e.agentId !== undefined || !actual) return yield* next(e)
    const modelo = modeloDe(actual)
    if (actual.nombre === 'construir') ultimoModeloConstruir = modelo
    return yield* next({
      ...e,
      model: modelo,
      effort: actual.esfuerzo ?? e.effort,
    })
  })
}
