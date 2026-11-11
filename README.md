# modelo-por-tarea

Mod de Claude Code que cambia el modelo y el esfuerzo según la tarea que pides. Detecta la tarea sola a partir de palabras clave del mensaje (en español e inglés) o la fijas con `/tarea`. La línea de estado muestra la tarea y el modelo en uso.

| Tarea | Modelo | Esfuerzo |
|---|---|---|
| plan | Fable 5.2 | high |
| construir | Sonnet 5.5 | el de la sesión |
| frontend | Opus 5.5 | el de la sesión |
| auth-pagos | Opus 5.5 | el de la sesión |
| buscar | Haiku 5.5 | el de la sesión |
| renombrar | Haiku 5.5 | el de la sesión |
| tests | Opus 5.5 | el de la sesión |
| bug | Opus 5.5 | max |
| seguridad | Fable 5.2 | high |
| revision | otro modelo que el que construyó (Opus 5.5 o Sonnet 5.5) | el de la sesión |

Un mensaje sin palabra clave mantiene la tarea anterior. Solo cambia el hilo principal; los subagentes conservan su modelo.

## Comandos

- `/tarea`: lista las tareas y el modo actual.
- `/tarea <tipo>`: fija una tarea.
- `/tarea auto`: vuelve a la detección automática.
- `/tarea apagar`: usa siempre el modelo de la sesión.

Cambiar de modelo a mitad de conversación invalida la caché del prompt: el primer mensaje con el modelo nuevo cuesta más.

## Instalación

En la consola de una sesión de Claude Code:

```
/plugin install modelo-por-tarea --marketplace jimunozgayani/modelo-por-tarea
```

Responde `y` para agregar el marketplace y elige el alcance (usuario).

Desde una terminal:

```
claude plugin install modelo-por-tarea --marketplace jimunozgayani/modelo-por-tarea
```

En la app de escritorio, donde `/plugin` no corre: haz clic en + junto al cuadro del mensaje, luego Plugins, Add marketplace con `jimunozgayani/modelo-por-tarea`, y después Add plugin.
