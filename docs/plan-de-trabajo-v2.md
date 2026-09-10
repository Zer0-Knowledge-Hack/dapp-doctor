# DAPP DOCTOR
## PLAN DE TRABAJO v2 — EJECUCIÓN SOLO DEVELOPER
*Burning Token · NERDCONF — ajustado a las reglas oficiales del evento*

Versión 2.0 | 8 de septiembre de 2026 | Equipo: 1 persona (abierto a sumar colaboradores)

> **CONTEXTO** Hoy es martes 8 de septiembre. Deadline oficial: domingo 13 de septiembre 23:59 ART. Deadline interno de seguridad: sábado 12 de septiembre. Este plan cubre 5 días de trabajo en solitario, dejando el domingo como colchón real.

---

## 1. Qué cambia respecto al plan original

El plan original (Plan de trabajo v1) fue escrito sin confirmar tamaño de equipo ni reglas oficiales de evaluación. Con equipo de 1 persona y las reglas de elegibilidad de Burning Token · NERDCONF ya confirmadas, se recorta el alcance para que sea ejecutable, sin sacrificar elegibilidad en los tracks objetivo.

| Elemento del plan v1 | Decisión en v2 | Motivo |
|---|---|---|
| Investigación Linkup abierta a múltiples fuentes | Acotada a un solo caso: interpretar códigos de error de proveedor RPC contra documentación oficial | El track exige que la investigación complete la tarea, no que sea extensa. Un dev solo no sostiene investigación abierta en el tiempo disponible. |
| 15–20 casos de evaluación Nebius | 8 casos de prueba | El track exige casos y métricas, no un número mínimo. 8 alcanza para clasificación, acción y no-invención. |
| CLI, GitHub Action, redes adicionales, RevenueCat, Convex, Fun Build | Eliminado completamente del alcance | Cada track de sponsor es elegibilidad binaria: sin la integración completa, el proyecto queda fuera de ese track. Mejor 3 tracks completos que 6 a medias. |
| Reporte compartible por URL | Se mantiene, versión mínima (página estática con el resultado) | Es la evidencia verificable que exige el criterio de Shipping (35/100 puntos, el más pesado). |
| Video de demo ≤2 min con timestamps | Se mantiene sin cambios | Requisito obligatorio de entrega en las reglas oficiales. |

---

## 2. Alcance técnico mínimo (confirmado, sin cambios de fondo)

- Red: Base Sepolia (chainId 84532) como red correcta; demo con app apuntando a Base Mainnet (8453) por error.
- Stack: Next.js + TypeScript + viem, un RPC principal y uno secundario opcional.
- Cinco comprobaciones deterministas: URL/acceso, identidad de red, frescura de nodo, bytecode del contrato, lectura crítica, fallback.
- Solo lectura. Sin claves privadas, sin frases semilla, sin movimientos de fondos.

---

## 3. Cronograma día por día

Cada día cierra con un entregable verificable — no una tarea "en progreso". Si un entregable no está listo al final del día, se degrada el alcance del día siguiente antes que acumular deuda.

### Día 1 — Martes 8 de septiembre (hoy)
- Setup del repo: Next.js + TypeScript + viem.
- Deploy inicial vacío a producción (no dejar el primer deploy para el final).
- Contrato de demostración simple (función de lectura tipo getMessage) desplegado en Base Sepolia.
- App demo con el bug preparado: frontend apuntando a Base Mainnet en vez de Sepolia.
- Motor: implementar 3 de las 5 comprobaciones (URL/acceso, chainId, bytecode).

**Entregable:** app demo rota funcionando en producción + 3 comprobaciones detectando el problema en local.

### Día 2 — Miércoles 9 de septiembre
- Completar las 2 comprobaciones restantes: frescura de nodo y lectura crítica (eth_call).
- Implementar comprobación de fallback contra un segundo RPC.
- Estados READY / AT RISK / BLOCKED / NOT TESTED implementados sobre los 5 resultados.
- Reporte antes/después visual mínimo — funcional antes que bonito.
- Deploy de la aplicación principal DApp Doctor en modo demo público.

**Entregable:** motor completo, 5/5 comprobaciones funcionando de punta a punta, reporte visible en la URL pública.

### Día 3 — Jueves 10 de septiembre
- Integrar Nebius Token Factory. Probar la salida estructurada primero: los modelos de razonamiento devuelven el texto en `reasoning_content` con `content` vacío y fallan en tool calls — usar un modelo no-razonador o parsear `reasoning_content` antes de construir el resto encima.
- Definir los 8 casos de prueba con causa conocida (red, acceso, disponibilidad, límite, contrato, lectura, fallback).
- Ejecutar la evaluación y medir clasificación, acción y no-invención.
- Publicar una página de resultados de evaluación, visible sin login, como evidencia para el jurado.

**Entregable:** diagnóstico de Nebius integrado de punta a punta + tabla de resultados de evaluación pública.

### Día 4 — Viernes 11 de septiembre
- Integrar Linkup acotado a 1–2 categorías de error de proveedor (por ejemplo HTTP 429 / método no soportado) contra documentación oficial, y convertir el hallazgo en una acción concreta dentro del reporte.
- Integrar Render Workflows: pipeline de 5–6 tareas con un fallo controlado, reintento y recuperación demostrable sin duplicar hallazgos.
- Sanitización: verificar que no se envían tokens ni credenciales completas a Linkup o Nebius.
- QA de punta a punta: correr el flujo problema → corrección → verificación al menos tres veces.

**Entregable:** pipeline completo en Render con recuperación demostrable + acción de Linkup respaldada por fuente oficial.

### Día 5 — Sábado 12 de septiembre (deadline interno)
- Grabar el video (máximo 2 minutos) siguiendo el guion de la sección 4, con timestamp por integración.
- Completar la entrega en app.burningtoken.dev: nombre, equipo, usuarios objetivo, descripción, URL pública, tracks, evidencia por track, IA utilizada, componentes preexistentes.
- Publicar el post en X etiquetando @nerdconf_ar.
- Verificar el checklist oficial completo (sección 6).
- Presionar Submit (no dejar como borrador) con margen antes del cierre real del domingo 23:59 ART.

**Entregable:** submission enviada y confirmada, con el domingo completo como colchón real.

---

## 4. Elegibilidad por track — requisito duro, cobertura y evidencia

| Track | Requisito duro (binario) | Cómo lo cubre DApp Doctor | Evidencia en video |
|---|---|---|---|
| **Applied AI — Nebius** | Tarea concreta + casos de prueba + métricas definidas + resultados medidos + límites mostrados. | Diagnóstico de fallos RPC como tarea específica; 8 casos con causa conocida; métricas de clasificación, acción y no-invención. | Timestamp mostrando la función de IA en vivo y la tabla de resultados de evaluación. |
| **Deep Research — Linkup** | Investigar + comprobar fuentes + usar los hallazgos para completar la tarea (no alcanza con listar enlaces). | Búsqueda de documentación oficial de un error de proveedor RPC + acción derivada aplicada directamente al reporte. | Timestamp mostrando la búsqueda, la fuente encontrada y la acción resultante. |
| **Workflows — Render** | Proceso de varios pasos + estado + manejo de fallos + reintento o recuperación demostrable. | Pipeline de 5–6 tareas con un fallo inyectado, reintento automático y continuación sin duplicar hallazgos. | Timestamp mostrando el fallo, el reintento y la recuperación del proceso. |

---

## 5. Riesgos específicos de trabajar en solitario

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cualquier bloqueo técnico consume medio día sin colchón, porque no hay nadie más para paralelizar. | Se atrasa toda la cadena de días siguientes. | La integración más riesgosa (Nebius, por el comportamiento de los modelos de razonamiento) se prueba el día 3, no el día 4, dejando 2 días reales de margen antes del deadline interno. |
| Se suma un colaborador a mitad de camino. | Reasignar tareas sobre la marcha puede generar fricción o duplicar trabajo. | El backlog P1 (RPC secundario validado a fondo, reporte compartible avanzado) se mantiene fuera de las tareas críticas de los días 1–4, listo para delegar sin tocar el camino crítico. |
| Llegar al día 5 sin material para el video. | Video apurado o incompleto, riesgo de perder evidencia de un track. | Grabar clips cortos cada vez que algo funcione por primera vez, en lugar de dejar todo el guion para el último día. |
| El día 3 o 4 se atrasa de forma real. | No alcanza el tiempo para cerrar los tres tracks con calidad. | Plan B: sacrificar Linkup primero — es el track más forzado de los tres — y quedarse solo con Nebius y Render, que tienen mejor encaje natural con el producto. |

---

## 6. Checklist final antes de enviar

- [ ] El proyecto está disponible mediante una URL pública, sin login privado inaccesible para el jurado.
- [ ] El flujo principal (revisar → diagnosticar → corregir → verificar) funciona de punta a punta.
- [ ] Cada integración de sponsor (Nebius, Linkup, Render) funciona realmente, no solo aparece mencionada.
- [ ] Cada track tiene evidencia verificable con timestamp exacto en el video.
- [ ] El video dura máximo 2 minutos y muestra el producto funcionando, no solo la idea.
- [ ] El post en X etiqueta a @nerdconf_ar.
- [ ] No hay credenciales, tokens ni secretos expuestos en el reporte, capturas o repositorio.
- [ ] Se identifican honestamente los datos simulados o pasos preparados para la demo.
- [ ] Se declaró qué IA se usó para construir el proyecto y qué existía antes del 5 de septiembre.
- [ ] Se presionó Submit (no Save draft) con margen antes del domingo 13 a las 23:59 ART.

> **REGLA DE ORO** Shipping vale 35 de 100 puntos por track — más que cualquier otro criterio individual. Ante cualquier disyuntiva de tiempo, priorizar que la app pública funcione sin fricción por sobre pulir una integración.
