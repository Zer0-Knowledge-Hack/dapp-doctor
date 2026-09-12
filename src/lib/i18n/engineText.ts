import type { CheckOutcome, OverallStatus } from '../diagnostics/types';
import type { Lang } from './lang';

/**
 * Spanish for the text the engine writes: check titles, findings, actions,
 * headlines and the API's error messages.
 *
 * The engine stays English on purpose. It is the source of truth that the
 * API, the MCP server and the stored history all share, and its tests read
 * those exact sentences. This module only changes how a report reads on a
 * Spanish page, after the verdict is made, so it can never change a verdict.
 *
 * Every sentence the engine can produce is listed here, either exactly or as
 * a pattern whose variable parts (URLs, addresses, chain names, numbers) are
 * carried over untouched. A sentence not listed stays in English rather than
 * being guessed: `scripts/i18n.mts` checks that none is missing.
 */

export const STATUS_LABELS: Record<Lang, Record<OverallStatus, string>> = {
  en: { READY: 'READY', AT_RISK: 'AT RISK', BLOCKED: 'BLOCKED', NOT_TESTED: 'NOT TESTED' },
  es: { READY: 'LISTO', AT_RISK: 'EN RIESGO', BLOCKED: 'BLOQUEADO', NOT_TESTED: 'SIN PROBAR' },
};

export const OUTCOME_LABELS: Record<Lang, Record<CheckOutcome, string>> = {
  en: { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', NOT_TESTED: 'NOT TESTED' },
  es: { PASS: 'PASA', WARN: 'AVISO', FAIL: 'FALLA', NOT_TESTED: 'SIN PROBAR' },
};

const EXACT: Record<string, string> = {
  // Check titles
  'RPC access': 'Acceso al RPC',
  'Network identity': 'Identidad de red',
  'Node freshness': 'Frescura del nodo',
  'Contract bytecode': 'Bytecode del contrato',
  'Critical read': 'Lectura crítica',
  'Fallback RPC': 'RPC de respaldo',

  // Launch rule titles
  'HTTPS on every RPC': 'HTTPS en cada RPC',
  'Launching on a mainnet': 'Lanzamiento en una mainnet',
  'Working fallback RPC': 'RPC de respaldo que funciona',
  'Fallback from another provider': 'Respaldo de otro proveedor',
  'Dedicated primary RPC': 'RPC principal propio',
  'Critical path declared': 'Camino crítico declarado',

  // Checks that did not run
  'Did not run: the primary RPC does not answer.': 'No se ejecutó: el RPC principal no responde.',
  'Did not run: no contract address was provided.': 'No se ejecutó: no se indicó una dirección de contrato.',
  'Did not run: no critical read was provided.': 'No se ejecutó: no se indicó una lectura crítica.',
  'Did not run: there is no contract at that address.': 'No se ejecutó: no hay contrato en esa dirección.',
  'Did not run: no fallback RPC was configured.': 'No se ejecutó: no se configuró un RPC de respaldo.',
  'Did not run: no fallback RPC is configured.': 'No se ejecutó: no hay un RPC de respaldo configurado.',
  'Did not run: the fallback check did not execute.': 'No se ejecutó: el chequeo del respaldo no corrió.',
  'Did not run in the previous pass.': 'No se ejecutó en la pasada anterior.',

  // Headlines
  'All six checks passed. The configuration points at the right network and the contract answers.':
    'Pasaron los seis chequeos. La configuración apunta a la red correcta y el contrato responde.',
  'A critical check is failing.': 'Un chequeo crítico está fallando.',
  'No check was executed.': 'No se ejecutó ningún chequeo.',
  'A launch rule is failing.': 'Una regla de lanzamiento está fallando.',
  'No launch rule could be evaluated.': 'No se pudo evaluar ninguna regla de lanzamiento.',
  'Nothing changed between the two runs.': 'Nada cambió entre las dos corridas.',

  // Actions for a failed request
  'This service only contacts publicly routable hosts. Private, loopback and link-local addresses are refused, so point it at the RPC endpoint as it is reachable from the internet.':
    'Este servicio solo contacta hosts públicos. Las direcciones privadas, loopback y link-local se rechazan: usa el endpoint del RPC tal como se alcanza desde internet.',
  'Check that the RPC URL is correct and that the host resolves from this environment.':
    'Revisa que la URL del RPC sea correcta y que el host resuelva desde este entorno.',
  'The provider did not answer in time. Try a secondary RPC and check the provider status page.':
    'El proveedor no respondió a tiempo. Prueba un RPC secundario y revisa la página de estado del proveedor.',
  'The API key is missing, expired, or not allowed to call this method. Review the provider credentials.':
    'Falta la API key, venció o no tiene permiso para este método. Revisa las credenciales del proveedor.',
  'You exceeded the provider rate limit. Lower the call frequency or upgrade the plan.':
    'Superaste el límite de pedidos del proveedor. Baja la frecuencia de llamadas o mejora el plan.',
  'The endpoint path does not exist. Check that the URL includes the provider full path.':
    'La ruta del endpoint no existe. Revisa que la URL incluya la ruta completa del proveedor.',
  'Review the endpoint configuration in the provider dashboard.': 'Revisa la configuración del endpoint en el panel del proveedor.',
  'The provider does not support this method on your plan. Use a provider that exposes it.':
    'El proveedor no ofrece este método en tu plan. Usa un proveedor que lo exponga.',
  'The node rejected the call. Review the parameters being sent.': 'El nodo rechazó la llamada. Revisa los parámetros que se envían.',
  'The response is not valid JSON-RPC. The URL most likely points at something that is not a node.':
    'La respuesta no es JSON-RPC válido. Lo más probable es que la URL apunte a algo que no es un nodo.',

  // Actions written by individual checks
  'The URL responds to JSON-RPC but does not behave like an EVM node. Check it is the right endpoint.':
    'La URL responde JSON-RPC pero no se comporta como un nodo EVM. Revisa que sea el endpoint correcto.',
  'Check that the URL points at an EVM node and not at another service.': 'Revisa que la URL apunte a un nodo EVM y no a otro servicio.',
  'The node did not return a readable block for "latest".': 'El nodo no devolvió un bloque legible para "latest".',
  'Check that the endpoint is fully synced.': 'Revisa que el endpoint esté completamente sincronizado.',
  'There is clock skew between this environment and the node. Verify the system time.':
    'Hay una diferencia de reloj entre este entorno y el nodo. Verifica la hora del sistema.',
  'The node is lagging and may serve stale state. Use a secondary RPC, or wait for the provider to catch up before trusting these reads.':
    'El nodo está atrasado y puede servir un estado viejo. Usa un RPC secundario, o espera a que el proveedor se ponga al día antes de confiar en estas lecturas.',
  'The address has no code on this network. Verify the contract is deployed here and that the address does not come from a different network.':
    'La dirección no tiene código en esta red. Verifica que el contrato esté desplegado aquí y que la dirección no venga de otra red.',
  'Fix the signature. Expected format: functionName() returns (type).': 'Corrige la firma. Formato esperado: nombreDeFuncion() returns (tipo).',
  'The contract exists but rejected the read. Check the function exists with that exact signature.':
    'El contrato existe pero rechazó la lectura. Revisa que la función exista con esa firma exacta.',
  'There is code at the address, but it does not expose this function. The address most likely belongs to a different contract or a different ABI version.':
    'Hay código en la dirección, pero no expone esta función. Lo más probable es que la dirección sea de otro contrato o de otra versión del ABI.',
  'The ABI the application uses does not match the deployed contract. Regenerate the ABI from the contract that is actually on this network.':
    'El ABI que usa la aplicación no coincide con el contrato desplegado. Regenera el ABI a partir del contrato que realmente está en esta red.',
  'Fix the fallback URL. As it stands, if the primary goes down the application will read from the wrong network without raising any error.':
    'Corrige la URL del respaldo. Tal como está, si el principal se cae la aplicación leerá de la red equivocada sin mostrar ningún error.',

  // Launch rules
  'Serve every RPC over HTTPS. Over plain HTTP, anyone on the network path can read or alter the responses your app trusts.':
    'Sirve cada RPC por HTTPS. Con HTTP sin cifrar, cualquiera en el camino de red puede leer o alterar las respuestas en las que confía tu app.',
  'Both RPCs use HTTPS.': 'Los dos RPC usan HTTPS.',
  'The primary RPC uses HTTPS.': 'El RPC principal usa HTTPS.',
  'The primary RPC uses plain HTTP.': 'El RPC principal usa HTTP sin cifrar.',
  'The fallback RPC uses plain HTTP.': 'El RPC de respaldo usa HTTP sin cifrar.',
  'The primary and fallback RPC use plain HTTP.': 'El RPC principal y el de respaldo usan HTTP sin cifrar.',
  'Set the expected chain ID to the mainnet you are launching on, and point both RPCs at it.':
    'Pon como chain ID esperado la mainnet donde lanzas, y apunta los dos RPC a ella.',
  'No fallback RPC is configured.': 'No hay un RPC de respaldo configurado.',
  'Add a second RPC your app switches to when the primary fails. At launch, one provider outage is otherwise a full outage.':
    'Agrega un segundo RPC al que tu app cambie cuando el principal falle. En un lanzamiento, si no, la caída de un proveedor es una caída total.',
  'The fallback answers a different network than the app expects.': 'El respaldo responde una red distinta de la que espera la app.',
  'Point the fallback at the same network as the primary. See the Fallback RPC check below.':
    'Apunta el respaldo a la misma red que el principal. Mira el chequeo del RPC de respaldo más abajo.',
  'The fallback RPC did not answer, so it would not take over if the primary failed.':
    'El RPC de respaldo no respondió, así que no tomaría el control si el principal fallara.',
  'Fix or replace the fallback. See the Fallback RPC check below for what it returned.':
    'Arregla o reemplaza el respaldo. Mira el chequeo del RPC de respaldo más abajo para ver qué devolvió.',
  'Use a fallback from a different provider than the primary.': 'Usa un respaldo de un proveedor distinto del principal.',
  'The primary RPC is not one of the shared public endpoints DApp Doctor knows.':
    'El RPC principal no es uno de los endpoints públicos compartidos que DApp Doctor conoce.',
  'Declare the contract your app depends on and the zero-argument read it cannot work without, for example: symbol() returns (string).':
    'Declara el contrato del que depende tu app y la lectura sin argumentos sin la que no funciona, por ejemplo: symbol() returns (string).',
  'A contract and the read your app depends on are declared, so the live checks exercise them.':
    'Hay un contrato y una lectura declarados, así que los chequeos en vivo los ponen a prueba.',

  // Messages from the request layer, usually embedded after a colon
  'The URL is not valid.': 'La URL no es válida.',
  'The response was too large to be a JSON-RPC envelope': 'La respuesta era demasiado grande para ser un sobre JSON-RPC',
  'The provider answered 2xx but the body is not JSON': 'El proveedor respondió 2xx pero el cuerpo no es JSON',
  'The JSON-RPC response is not an object': 'La respuesta JSON-RPC no es un objeto',
  'The JSON-RPC response carries neither result nor error': 'La respuesta JSON-RPC no trae ni result ni error',
  'Unknown network failure': 'Falla de red desconocida',
  'the hostname does not resolve': 'el nombre del host no resuelve',

  // Refusal reasons from the SSRF guard
  loopback: 'loopback',
  'link-local': 'link-local',
  'link-local / cloud metadata': 'link-local / metadatos de la nube',
  multicast: 'multicast',
  'unique local': 'local única',
  'unspecified address': 'dirección no especificada',
  'not an IP address': 'no es una dirección IP',
  'unparseable IPv4 address': 'dirección IPv4 ilegible',
  'unparseable IPv6 address': 'dirección IPv6 ilegible',
  'private 10/8': 'privada 10/8',
  'private 172.16/12': 'privada 172.16/12',
  'private 192.168/16': 'privada 192.168/16',
  'carrier-grade NAT': 'NAT de operador',
  reserved: 'reservada',
  'this-network': 'esta red',
  benchmarking: 'pruebas de rendimiento',
  'IETF protocol assignments': 'asignaciones de protocolo del IETF',
  'TEST-NET-1': 'TEST-NET-1',
  'TEST-NET-2': 'TEST-NET-2',
  'TEST-NET-3': 'TEST-NET-3',
  '6to4': '6to4',

  // API errors a page can show
  'The request body must be valid JSON.': 'El cuerpo del pedido tiene que ser JSON válido.',
  'Unexpected engine failure.': 'Falla inesperada del motor.',
  'userId is missing or malformed.': 'Falta el identificador de usuario o no es válido.',
  'Could not read the diagnosis history.': 'No se pudo leer el historial de diagnósticos.',
  'Pro access is required for diagnosis history.': 'El historial de diagnósticos requiere Pro.',
  'Pro access is required for Launch Check.': 'Launch Check requiere Pro.',
  'Could not confirm your Pro access right now. Your history is safe; try again shortly.':
    'No se pudo confirmar tu acceso Pro ahora. Tu historial está a salvo; prueba de nuevo en un momento.',
  'Could not confirm your Pro access right now. Try again shortly.': 'No se pudo confirmar tu acceso Pro ahora. Prueba de nuevo en un momento.',
  'Your Pro access has expired. Renew it to run Launch Check again.': 'Tu acceso Pro venció. Renuévalo para volver a usar Launch Check.',
  'Launch Check is part of DApp Doctor Pro. Diagnosis stays free.': 'Launch Check es parte de DApp Doctor Pro. El diagnóstico sigue siendo gratis.',

  // Purchase outcomes and the Pro page (src/lib/billing/client.ts, src/app/history)
  'Pro unlocked.': 'Pro activado.',
  'Pro unlocked. This was a Test Store transaction: no card was charged.':
    'Pro activado. Fue una transacción de Test Store: no se cobró ninguna tarjeta.',
  'The purchase went through, but the server has not confirmed access yet. Reload in a moment.':
    'La compra se hizo, pero el servidor todavía no confirmó el acceso. Recarga en un momento.',
  'The purchase went through, but the server has not confirmed access yet. Reload in a moment. This was a Test Store transaction: no card was charged.':
    'La compra se hizo, pero el servidor todavía no confirmó el acceso. Recarga en un momento. Fue una transacción de Test Store: no se cobró ninguna tarjeta.',
  'Purchase cancelled. Nothing was charged and your access is unchanged.': 'Compra cancelada. No se cobró nada y tu acceso sigue igual.',
  'Test Store simulated a failed purchase. No charge was made and your access is unchanged.':
    'Test Store simuló una compra fallida. No se cobró nada y tu acceso sigue igual.',
  'You already own this plan.': 'Ya tienes este plan.',
  'The payment is still pending. Access unlocks as soon as it completes.': 'El pago sigue pendiente. El acceso se abre apenas se complete.',
  'Could not reach the payment service. Nothing was charged; try again.': 'No se pudo llegar al servicio de pagos. No se cobró nada; prueba de nuevo.',
  'The purchase could not be completed.': 'No se pudo completar la compra.',
  'The designed paywall is not available right now. Choose a plan from the list below instead.':
    'El paywall diseñado no está disponible ahora. Elige un plan de la lista de abajo.',
  'Could not load your history.': 'No se pudo cargar tu historial.',
  'Could not reach DApp Doctor. Check your connection and reload.': 'No se pudo llegar a DApp Doctor. Revisa tu conexión y recarga.',
  'Billing is not enabled on this deployment.': 'Los pagos no están habilitados en este despliegue.',

  // Heartbeat, read in the browser
  'The RPC answered with an error.': 'El RPC respondió con un error.',
  'The RPC sent a response far too large to be a block.': 'El RPC mandó una respuesta demasiado grande para ser un bloque.',
  'The RPC answered with something that is not JSON.': 'El RPC respondió con algo que no es JSON.',
  'No answer: the address is unreachable, or it refuses requests from a browser.':
    'Sin respuesta: la dirección no se alcanza, o rechaza pedidos desde un navegador.',
  'The RPC answered, but not with a block.': 'El RPC respondió, pero no con un bloque.',
};

/** Names from the list of shared public endpoints. */
const ENDPOINT_LABELS: Record<string, string> = {
  "Base's public endpoint": 'el endpoint público de Base',
  'Ankr without a key': 'Ankr sin clave',
  'dRPC without a key': 'dRPC sin clave',
};

const statusEs = (code: string) => STATUS_LABELS.es[code as OverallStatus] ?? code;

/** Sentences with variable parts: the captured parts are carried over, translated when they are text. */
const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  // access
  [/^The RPC (\S+) did not answer: ([\s\S]+)$/, (m) => `El RPC ${m[1]} no respondió: ${toSpanish(m[2])}`],
  [/^The RPC (\S+) answered, but not with a block number\.$/, (m) => `El RPC ${m[1]} respondió, pero no con un número de bloque.`],
  [/^The RPC (\S+) answers correctly\.$/, (m) => `El RPC ${m[1]} responde correctamente.`],
  // network identity
  [/^Could not read the node chain ID: ([\s\S]+)$/, (m) => `No se pudo leer el chain ID del nodo: ${toSpanish(m[1])}`],
  [/^The node returned an unreadable chain ID: ([\s\S]*)$/, (m) => `El nodo devolvió un chain ID ilegible: ${m[1]}`],
  [/^The application expects (.+) but the RPC answers (.+)\.$/, (m) => `La aplicación espera ${m[1]} pero el RPC responde ${m[2]}.`],
  [/^Point the RPC at (.+) \(chain ID (\d+)\), or fix the expected chain ID in the configuration\.$/,
    (m) => `Apunta el RPC a ${m[1]} (chain ID ${m[2]}), o corrige el chain ID esperado en la configuración.`],
  [/^The RPC answers (.+), which is the expected network\.$/, (m) => `El RPC responde ${m[1]}, que es la red esperada.`],
  // freshness
  [/^Could not read the latest block: ([\s\S]+)$/, (m) => `No se pudo leer el último bloque: ${toSpanish(m[1])}`],
  [/^The latest block is dated (\d+) s in the future\.$/, (m) => `El último bloque tiene fecha ${m[1]} s en el futuro.`],
  [/^The latest block is (\d+) s old \(limit: (\d+) s\)\.$/, (m) => `El último bloque tiene ${m[1]} s de antigüedad (límite: ${m[2]} s).`],
  [/^The latest block is (\d+) s old\. The node is up to date\.$/, (m) => `El último bloque tiene ${m[1]} s. El nodo está al día.`],
  // bytecode
  [/^Could not read the code at (\S+): ([\s\S]+)$/, (m) => `No se pudo leer el código en ${m[1]}: ${toSpanish(m[2])}`],
  [/^No contract deployed at (\S+) on the network this RPC answers\.$/, (m) => `No hay contrato desplegado en ${m[1]} en la red que responde este RPC.`],
  [/^No contract deployed at (\S+) on (.+)\.$/, (m) => `No hay contrato desplegado en ${m[1]} en ${m[2]}.`],
  [/^This was checked on (.+), the network the RPC answers, not on (.+)\. Fix the network identity first, then run the diagnosis again\.$/,
    (m) => `Se revisó en ${m[1]}, la red que responde el RPC, no en ${m[2]}. Corrige primero la identidad de red y vuelve a correr el diagnóstico.`],
  [/^A contract is deployed at (\S+) \((\d+) bytes of code\)\.$/, (m) => `Hay un contrato desplegado en ${m[1]} (${m[2]} bytes de código).`],
  // critical read
  [/^The signature "(.*)" is not valid: ([\s\S]*)$/, (m) => `La firma "${m[1]}" no es válida: ${m[2]}`],
  [/^The call to (.+)\(\) was rejected by the contract: ([\s\S]*)$/, (m) => `El contrato rechazó la llamada a ${m[1]}(): ${m[2]}`],
  [/^Could not execute (.+)\(\): ([\s\S]+)$/, (m) => `No se pudo ejecutar ${m[1]}(): ${toSpanish(m[2])}`],
  [/^(.+)\(\) returned empty\. The function does not exist on the deployed contract\.$/,
    (m) => `${m[1]}() devolvió vacío. La función no existe en el contrato desplegado.`],
  [/^(.+)\(\) answered correctly\.$/, (m) => `${m[1]}() respondió correctamente.`],
  [/^(.+)\(\) returned data that does not match the declared signature\.$/,
    (m) => `${m[1]}() devolvió datos que no coinciden con la firma declarada.`],
  // fallback
  [/^The fallback RPC (\S+) did not answer: ([\s\S]+)$/, (m) => `El RPC de respaldo ${m[1]} no respondió: ${toSpanish(m[2])}`],
  [/^Without a working backup there is no network if the primary goes down\. ([\s\S]+)$/,
    (m) => `Sin un respaldo que funcione, no hay red si el principal se cae. ${toSpanish(m[1])}`],
  [/^The fallback answers (.+), but the application expects (.+)\.$/, (m) => `El respaldo responde ${m[1]}, pero la aplicación espera ${m[2]}.`],
  [/^The fallback (\S+) answers and is on (.+)\.$/, (m) => `El respaldo ${m[1]} responde y está en ${m[2]}.`],
  // engine and comparison headlines
  [/^The critical path answers, but (\d+) check\(s\) could not be executed\.$/,
    (m) => `El camino crítico responde, pero ${m[1]} chequeo(s) no se pudieron ejecutar.`],
  [/^The fix resolved (\d+) check\(s\) but broke (\d+) that used to pass\.$/,
    (m) => `El arreglo resolvió ${m[1]} chequeo(s) pero rompió ${m[2]} que antes pasaban.`],
  [/^The status went from (\w+) to (\w+) without any individual check being resolved\.$/,
    (m) => `El estado pasó de ${statusEs(m[1])} a ${statusEs(m[2])} sin que se resolviera ningún chequeo.`],
  [/^The fix resolved (\d+) check\(s\)\. The target is now READY\.$/, (m) => `El arreglo resolvió ${m[1]} chequeo(s). Ahora está LISTO.`],
  [/^The fix resolved (\d+) check\(s\), but the target is still (\w+)\.$/,
    (m) => `El arreglo resolvió ${m[1]} chequeo(s), pero sigue ${statusEs(m[2])}.`],
  // launch rules
  [/^DApp Doctor does not know chain ID (\d+), so it cannot confirm it is a mainnet\.$/,
    (m) => `DApp Doctor no conoce el chain ID ${m[1]}, así que no puede confirmar que sea una mainnet.`],
  [/^Confirm in the chain's own documentation that (\d+) is its production network\.$/,
    (m) => `Confirma en la documentación de esa red que ${m[1]} es su red de producción.`],
  [/^The app expects (.+), which is a testnet\.$/, (m) => `La app espera ${m[1]}, que es una testnet.`],
  [/^The app expects (.+)\.$/, (m) => `La app espera ${m[1]}.`],
  [/^The fallback \((\S+)\) answers on the expected network\.$/, (m) => `El respaldo (${m[1]}) responde en la red esperada.`],
  [/^Both RPCs are served by (\S+)\. An outage at that provider takes down both\.$/,
    (m) => `Los dos RPC los sirve ${m[1]}. Una caída de ese proveedor tumba a los dos.`],
  [/^The primary and the fallback come from different providers \((.+)\)\.$/,
    (m) => `El principal y el respaldo son de proveedores distintos (${m[1]}).`],
  [/^The primary RPC is (.+) \((\S+)\), a free endpoint shared by everyone who uses it\.$/,
    (m) => `El RPC principal es ${ENDPOINT_LABELS[m[1]] ?? m[1]} (${m[2]}), un endpoint gratis compartido por todos los que lo usan.`],
  [/^Base's documentation states that its public endpoints are HTTP only, with no WebSocket connections \(so no eth_subscribe\), and points to the Base Services Hub for a WebSocket-capable provider\. Move the primary to a provider account you control; a public endpoint can still serve as the fallback\.$/,
    () => 'La documentación de Base dice que sus endpoints públicos son solo HTTP, sin conexiones WebSocket (sin eth_subscribe), y remite al Base Services Hub para un proveedor con WebSocket. Pasa el principal a una cuenta de proveedor que controles; un endpoint público puede seguir como respaldo.'],
  [/^You have no account with its operator, so its capacity and availability are outside your control\. Move the primary to a provider account you control; a public endpoint can still serve as the fallback\.$/,
    () => 'No tienes cuenta con quien lo opera, así que su capacidad y disponibilidad no dependen de ti. Pasa el principal a una cuenta de proveedor que controles; un endpoint público puede seguir como respaldo.'],
  [/^No (contract address|critical read|contract address or critical read) was declared, so nothing proves your app can read what it needs\.$/,
    (m) => {
      const what = { 'contract address': 'una dirección de contrato', 'critical read': 'una lectura crítica', 'contract address or critical read': 'ni una dirección de contrato ni una lectura crítica' }[m[1]];
      return `No se declaró ${what}, así que nada prueba que tu app pueda leer lo que necesita.`;
    }],
  [/^Ready to launch on (.+): every launch rule and all six checks passed\.$/,
    (m) => `Listo para lanzar en ${m[1]}: pasaron todas las reglas de lanzamiento y los seis chequeos.`],
  [/^Nothing failed, but (\d+) check\(s\) could not be executed\.$/,
    (m) => `Nada falló, pero ${m[1]} chequeo(s) no se pudieron ejecutar.`],
  // request layer
  [/^The scheme (\S+) is not allowed\. Use http or https\.$/, (m) => `El esquema ${m[1]} no está permitido. Usa http o https.`],
  [/^Refused to contact (\S+): (.+)\.$/, (m) => `Se rechazó contactar ${m[1]}: ${toSpanish(m[2])}.`],
  [/^No response within (\d+) ms$/, (m) => `Sin respuesta en ${m[1]} ms`],
  [/^The provider answered HTTP (\d+)([\s\S]*)$/, (m) => `El proveedor respondió HTTP ${m[1]}${m[2]}`],
  [/^the hostname did not resolve within (\d+) ms$/, (m) => `el nombre del host no resolvió en ${m[1]} ms`],
  [/^(\S+): (the hostname (?:does not resolve|did not resolve within \d+ ms))$/, (m) => `${m[1]}: ${toSpanish(m[2])}`],
  // input validation, optionally prefixed by "before: " or "after: " on the comparison
  [/^(before: |after: )?([\s\S]+)$/, (m) => {
    const inner = VALIDATION[m[2]];
    if (!inner) return m[0];
    const prefix = m[1] === 'before: ' ? 'antes: ' : m[1] === 'after: ' ? 'después: ' : '';
    return `${prefix}${inner}`;
  }],
  // purchases
  [/^The purchase failed: ([\s\S]+)$/, (m) => `La compra falló: ${toSpanish(m[1])}`],
  // heartbeat
  [/^The RPC answered HTTP (\d+)\.$/, (m) => `El RPC respondió HTTP ${m[1]}.`],
  [/^No answer within (\d+) seconds\.$/, (m) => `Sin respuesta en ${m[1]} segundos.`],
];

const VALIDATION: Record<string, string> = {
  'expected a configuration object.': 'se esperaba un objeto de configuración.',
  'rpcUrl is required and must be a valid http(s) URL.': 'la URL del RPC es obligatoria y tiene que ser una URL http(s) válida.',
  'expectedChainId is required and must be a positive integer.': 'el chain ID esperado es obligatorio y tiene que ser un entero positivo.',
  'contractAddress must be a 20-byte EVM address (0x + 40 hex).': 'la dirección del contrato tiene que ser una dirección EVM de 20 bytes (0x + 40 hex).',
  'fallbackRpcUrl must be a valid http(s) URL.': 'la URL del respaldo tiene que ser una URL http(s) válida.',
};

/** The Spanish for one engine sentence, or the sentence itself when it is not one the engine writes. */
export function toSpanish(text: string): string {
  const exact = EXACT[text];
  if (exact !== undefined) return exact;
  for (const [pattern, render] of PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const rendered = render(match);
    if (rendered !== text) return capitalizeValidation(rendered);
  }
  return text;
}

/** Validation messages start lower-case after a prefix; alone, they start a sentence. */
function capitalizeValidation(text: string): string {
  return /^[a-z]/.test(text) && Object.values(VALIDATION).includes(text) ? text[0].toUpperCase() + text.slice(1) : text;
}

/** Whether a sentence has a Spanish rendering. Used by the tests to find sentences that slipped through. */
export function hasSpanish(text: string): boolean {
  return toSpanish(text) !== text || EXACT[text] === text;
}
