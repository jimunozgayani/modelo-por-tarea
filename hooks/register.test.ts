import { expect, mock, test } from 'claude-code/testing'

async function paso($: any, turnId = 't1') {
  const s = $.turn.step({ turnId, index: 0, model: 'claude-opus-5-5', effort: 'medium', messageCount: 1 })
  for await (const _ of s) {
  }
  return s.result
}

function base(on: any, vistos: { model: string; effort?: unknown }[]) {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'tarea' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => ({ text: e.text }))
  on('ui.status', () => ({ value: {} }))
  on('turn.step', async function* (_: any, e: any) {
    vistos.push({ model: e.model, effort: e.effort })
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
}

test('detecta la tarea en el prompt y cambia el modelo', async ($, on) => {
  const vistos: { model: string; effort?: unknown }[] = []
  base(on, vistos)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await ($ as any).prompt.submit({ text: 'planea la funcionalidad de cotizaciones' })
  await paso($)
  await ($ as any).prompt.submit({ text: 'hay un bug: el botón no funciona' })
  await paso($)
  await ($ as any).prompt.submit({ text: 'busca dónde se calcula el IVA' })
  await paso($)
  await ($ as any).prompt.submit({ text: 'ok, implementa' })
  await paso($)
  await ($ as any).prompt.submit({ text: 'sí, sigue' })
  await paso($)

  expect(vistos.map(v => v.model)).toEqual([
    'claude-fable-5-2',
    'claude-opus-5-5',
    'claude-haiku-5-5',
    'claude-sonnet-5-5',
    'claude-sonnet-5-5',
  ])
  expect(vistos[0]?.effort).toBe('high')
  expect(vistos[1]?.effort).toBe('max')
  expect(vistos[3]?.effort).toBe('medium')
})

test('/tarea fija una tarea y /tarea auto la suelta', async ($, on) => {
  const vistos: { model: string; effort?: unknown }[] = []
  base(on, vistos)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const r = await ($ as any).command.run({ command: 'tarea', args: 'seguridad' })
  expect(r.text).toContain('Tarea fijada')
  await ($ as any).prompt.submit({ text: 'implementa el botón' })
  await paso($)
  expect(vistos[0]?.model).toBe('claude-fable-5-2')

  await ($ as any).command.run({ command: 'tarea', args: 'auto' })
  await ($ as any).prompt.submit({ text: 'implementa el botón' })
  await paso($)
  expect(vistos[1]?.model).toBe('claude-opus-5-5')
})

test('los subagentes conservan su modelo y /tarea apagar lo deja todo igual', async ($, on) => {
  const vistos: { model: string; effort?: unknown }[] = []
  base(on, vistos)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await ($ as any).prompt.submit({ text: 'renombra la función' })
  const s = $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 1, agentId: 'a1' })
  for await (const _ of s) {
  }
  expect(vistos[0]?.model).toBe('claude-opus-5-5')

  await ($ as any).command.run({ command: 'tarea', args: 'apagar' })
  await ($ as any).prompt.submit({ text: 'renombra la función' })
  await paso($)
  expect(vistos[1]?.model).toBe('claude-opus-5-5')
})
