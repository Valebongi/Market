# Dominios: investigación de proveedores, afiliación y reventa

**Fecha de consulta de todos los datos: 27 de agosto de 2026.**
Los precios y condiciones de estos programas cambian seguido. Cualquier dato de acá a más de 60 días debe re-verificarse antes de tomar una decisión de plata.

## Convención de confianza

Cada afirmación lleva una marca:

| Marca | Significado |
|---|---|
| **[V]** | Verificado hoy contra la fuente primaria (sitio oficial del proveedor, ICANN) o probado por mí contra la API real. |
| **[V2]** | Verificado sólo contra fuente secundaria (blogs, agregadores de programas de afiliados). Tratarlo como indicio, no como dato. |
| **[E]** | Estimación mía. No hay fuente; es un cálculo o un juicio. |
| **[NE]** | Lo busqué y **no lo encontré**. No está inventado ni aproximado. |

---

## 0. Resumen ejecutivo

1. **Hoy la plataforma no gana un peso con dominios, y no es por falta de deep link.** El módulo ya emite un link al **carrito de Namecheap con el dominio adentro**. Lo que le falta es el **ID de afiliado**: no hay ninguno, y `applyAffiliate()` devuelve la URL sin tocar cuando la variable de entorno está vacía. Cada click se regala. **[V]**
2. **La acción más rentable del proyecto, medida en plata por hora de trabajo, es dar de alta el programa y cargar una variable de entorno.** Todo lo demás ya está construido. Pero hay que corregir dos cosas primero: **el código apunta a la red de afiliados equivocada** (ShareASale, cuando Namecheap hoy documenta Impact y CJ) y **el programa de afiliados de Porkbun está discontinuado**. Detalle en §1.1.
3. **Vender dominios adentro de la plataforma es técnicamente posible y económicamente malo a esta escala.** El margen realista es de USD 4 a 6 por `.com` **[V2]**, contra una carga operativa perpetua: renovaciones, soporte, abuso, contracargos y obligaciones que bajan del contrato de ICANN al revendedor. Un operador chico sin volumen pierde plata neta contra el mismo click en modo afiliado, que rinde USD 2–3 sin ninguna obligación **[E]**.
4. **La API de Cloudflare Registrar no sirve para vender.** Registra únicamente en tu propia cuenta de Cloudflare y factura a tu método de pago; el titular del dominio serías vos, no el usuario **[V]**. Sirve para comprar barato para vos mismo, no para el módulo.
5. **La única fuente de precios gratis, pública y sin autenticación es el endpoint de Porkbun.** La probé: HTTP 200, sin API key **[V]**. Ya está integrada en `pricing.service.ts`, con caché, fecha de obtención y disclaimer de "precio de referencia", que es exactamente lo que corresponde hacer con precios de un registrador distinto al del link.
6. **Vender implica cobrar**, y eso choca con un límite declarado del MVP. El choque es más chico de lo que parece —`Product.md` prohíbe procesar pagos *entre las partes*, no vender un servicio propio— pero la consecuencia práctica (pasarela, factura electrónica, IVA, reembolsos, fraude con tarjeta) es real y está cuantificada en §7.

---

## 1. Punto de partida: qué hace hoy el sistema

> **El módulo cambió mientras se hacía esta investigación.** Al arrancar (27/08/2026, mañana) `domains-service` tenía sólo `domains.service.ts` con RDAP y un link plano a Namecheap. Al cerrar, ya existían `rdap.ts`, `pricing.service.ts`, `registrars.ts` y `suggestions.ts`, con timestamps de las 09:00–09:06 de hoy. Lo que sigue describe el estado **posterior** a ese cambio. **[V]**

Verificado leyendo el código **[V]**:

- La disponibilidad sigue saliendo de RDAP público, sin auth. Sólo un `available` comprobado genera link; `unknown` se reporta como no disponible, a propósito.
- **`.io` y `.co` no están en el bootstrap de RDAP de IANA**, así que caen en `unknown` y nunca generan link. Son 2 de las 6 extensiones por defecto, y las dos más deseables para el público de la plataforma. Es el hueco de ingresos más concreto que tiene el módulo hoy, y la razón principal para evaluar una fuente de disponibilidad paga (§5).
- **Los precios ya están conectados**: `pricing.service.ts` consume el endpoint público de Porkbun, con TTL de 12 h, tolerancia a caídas de hasta 7 días, campo `asOf` que viaja a la UI y un disclaimer explícito de "precio de referencia". Es exactamente lo que recomienda §4, ya hecho.
- **Los deep links ya son de carrito, no de página de resultados**: `registrars.ts` emite `https://www.namecheap.com/cart/?domains=<dominio>` y `https://porkbun.com/checkout/search?q=<dominio>`.
- **Sigue sin haber ningún ID de afiliado.** `applyAffiliate()` está preparado y vacío: sin `NAMECHEAP_AFFILIATE_URL_TEMPLATE` ni `PORKBUN_AFFILIATE_REF`, el link sale limpio. **El tráfico se sigue monetizando a cero.**

Consecuencia: el supuesto original de que "el usuario tiene que volver a tipear el dominio" era incorrecto **[V]**, y hoy además ya se resolvió el paso del carrito. Lo único que falta para que el módulo genere ingresos es el alta en la red de afiliados y el ID.

### 1.1 Dos correcciones al código que salieron de esta investigación

**a) La red de afiliados de Namecheap está mal identificada.** El comentario de `registrars.ts` dice que "Namecheap afilia por ShareASale (merchant 46875)" y arma el template alrededor de esa forma. La base de conocimiento oficial de Namecheap, consultada hoy, **sólo menciona Impact Radius y Commission Junction**, y tiene una guía titulada *"Transition to Impact Radius"*. **ShareASale no aparece en ninguna parte de la documentación vigente de afiliados de Namecheap** **[V]**. El template de ShareASale probablemente sea de una etapa anterior del programa.

La buena noticia es que la forma elegida —template con `{url}` y destino URL-encodeado— **también sirve para Impact**, que usa exactamente ese patrón. El valor correcto para la variable de entorno sería:

```
NAMECHEAP_AFFILIATE_URL_TEMPLATE=https://namecheap.pxf.io/c/{TU_IMPACT_ID}/386170/5618?u={url}
```

Con CJ, en cambio, el destino va **concatenado sin encodear**, así que ese formato no entra en el template actual **[V]**. Si se elige CJ hay que tocar `applyAffiliate()`.

**b) `PORKBUN_AFFILIATE_REF` no va a servir nunca.** Verificado hoy en `porkbun.com/affiliate`: **"The affiliate program has been discontinued"** **[V]**. Esto agrava, y de paso resuelve, la tensión que el propio `compareEnabled()` deja anotada: Porkbun no es un registrador que "todavía no nos paga", es uno que **no nos puede pagar**. La comparación sigue siendo valor honesto para el usuario y por eso vale dejarla, pero conviene saber que el 100 % de los clicks que se vayan a Porkbun son ingreso cedido de forma permanente, y que la variable de entorno se puede sacar.

---

## 2. Programas de afiliación (camino de menor fricción)

### 2.1 Tabla comparativa

| Programa | Comisión en dominios | Cookie | Red | Entrada | Deep link con dominio | Confianza |
|---|---|---|---|---|---|---|
| **Namecheap** | **20 %** registro y transferencia; 35 % hosting y SSL; 20 % Private Email y PremiumDNS | **30 días** | Impact Radius o CJ | Aprobación manual, 3–7 días hábiles; exige sitio propio con tráfico o reputación; W-8BEN para no-residentes en EE.UU. | **Sí, formato oficial publicado** | [V] comisiones, cookie, redes, criterios; [V2] plazo de aprobación |
| **GoDaddy** | "hasta 30 %"; en dominios se citan USD 5–10 por venta | 45 días | CJ | Alta en CJ y luego postulación al programa; umbral de pago USD 25 | Sí, vía deep links de CJ; formato exacto [NE] | [V2] todo |
| **Porkbun** | — | — | — | — | — | **[V] Programa discontinuado.** `porkbun.com/affiliate` dice literalmente "The affiliate program has been discontinued". El acuerdo legal sigue online, lo cual confunde a los agregadores que todavía lo listan como activo. |
| **Dynadot** | **Ambassador (propio): 30 %** registro y transferencia, 15 % subastas, 10 % builder y email. **CJ: 25 %** en los mismos rubros | [NE] en la página oficial; terceros dicen 30 días [V2] | Propia o CJ, **excluyentes**: no se puede estar en las dos ni cambiar después | Formulario de aplicación | [NE] no lo documentan | [V] comisiones y exclusividad |
| **Hostinger** | Desde 40 %, hasta 60 % según fuente; aplica a la primera compra y 12 meses | 30 días | Propia | Gratis, alcance mundial | [NE] | [V2] todo |

Notas que cambian el cálculo:

- Namecheap paga **sólo la primera orden de un cliente nuevo**. Renovaciones y clientes existentes no comisionan **[V]**. Esto degrada mucho el valor de un marketplace cuyos usuarios probablemente ya tengan cuenta en Namecheap.
- Namecheap **no comisiona dominios de marketplace ni premium** **[V]**. Justo los casos donde el ticket es alto.
- GoDaddy paga renovaciones **sólo si el cliente vuelve a hacer click en el link de afiliado antes de que el ítem entre al carrito** **[V2]**, o sea, en la práctica, casi nunca.
- Hostinger vende dominios como gancho de hosting: el dominio suele ir gratis con el plan. Una comisión de 40 % sobre un dominio regalado es 40 % de nada. Sirve si algún día se promociona hosting, no para este módulo **[E]**.

### 2.2 Deep link con el dominio precargado — el punto de corto plazo

Namecheap publica los formatos exactos en su base de conocimiento **[V]**:

**Impact Radius**

```
https://namecheap.pxf.io/c/{TU_IMPACT_ID}/386170/5618?u=https%3A%2F%2Fwww.namecheap.com%2Fdomains%2Fregistration%2Fresults.aspx%3Fdomain%3Dejemplo.com
```

**Commission Junction**

```
http://www.anrdoezrs.net/links/{TU_CJ_ID}/type/dlg/https://www.namecheap.com/domains/registration/results.aspx?domain=ejemplo.com
```

Se reemplaza el ID y el dominio. El parámetro `u` va URL-encodeado (Impact) o el destino va concatenado en crudo (CJ).

**Sobre el carrito precargado, que es el pedido de fondo:** en la documentación pública de Namecheap **no existe ningún parámetro de "agregar al carrito"** **[NE]**; lo único documentado es el deep link a la página de resultados, que deja un click más.

Pero la implementación que entró hoy en `registrars.ts` fue más lejos y lo resolvió **empíricamente**, probando URLs con User-Agent de navegador y siguiendo redirects. El resultado, tal como quedó anotado en el código:

- `/cart/addtocart.aspx?ProductType=DOMAIN&Domains=x.com&Years=1` → redirige a un error. **Formato muerto**, y es el que circula en los blogs viejos.
- `/domains/registration/results/?domain=x.com` → la página de resultados, un click extra. Es lo documentado.
- **`/cart/?domains=x.com` → 200 y redirige a `/cart/customize/addons.aspx?domains=x.com`: el dominio ya está adentro del carrito y lo que se ofrece son los addons.** Funciona con varios dominios separados por coma.

O sea que **el carrito precargado sí se puede, sólo que no está documentado** y por lo tanto Namecheap no lo garantiza: es un formato no contractual que pueden romper sin aviso. Vale la pena tener un fallback a la página de resultados si algún día deja de responder **[E]**.

Advertencia que ya está en el código y conviene repetir: `/cart/?domains=` **no valida disponibilidad**. Con un dominio con dueño también devuelve 200 y entra a addons. Por eso el link tiene que emitirse únicamente cuando RDAP confirmó `available`.

Fricción real que se elimina: **todos los clicks intermedios**. Lo único que falta para cobrar por ellos: **el ID de afiliado**.

### 2.3 Cuánto rinde, en números

**[E]** — estimación mía, sin fuente, basada en las comisiones verificadas:

- `.com` en Namecheap primer año: rango USD 11–16 según promo.
- 20 % ⇒ **USD 2,20–3,20 por conversión**, sólo si el comprador es cliente nuevo de Namecheap.
- Con 1.000 búsquedas de dominio por mes, 10 % de CTR y 5 % de conversión ⇒ 5 ventas ⇒ **USD 11–16 por mes**.

Ese número es el que hay que tener en la cabeza cuando se evalúa montar reventa. La reventa, en el mejor caso, lo triplica y a cambio pide una empresa, una pasarela y soporte perpetuo.

---

## 3. Reventa de dominios: opciones reales

### 3.1 Tabla comparativa

| Proveedor | Marca propia vía API | Costo de entrada | Cuota fija | Requisitos / país | Margen | Renovaciones, soporte, abuso | API y sandbox | Viable para operador chico sin volumen |
|---|---|---|---|---|---|---|---|---|
| **Namecheap (API; no hay programa reseller)** | Parcial. **No tienen programa de reseller**; se revende usando la API y tu propio billing (WHMCS, Ubersmith) **[V]** | Ninguno formal. La API se habilita con **20 dominios**, o **USD 50 de saldo**, o **USD 50 gastados en 2 años** **[V]** | No **[V]** | No publican restricción de país **[NE]**; es registrador de EE.UU. | **Prácticamente nulo: el precio por API es el mismo que el retail público.** Recién con 50+ dominios pueden asignar precio especial negociado **[V]** | Tuyas la facturación y el soporte de primer nivel; el registrador es Namecheap | Sí, con **sandbox** en `sandbox.namecheap.com`, cuenta separada. Whitelist de IP obligatoria, sólo IPv4. Límites 50/min, 700/hora, 8.000/día por key **[V]**. XML, no JSON | **No.** Sin margen no hay negocio: el usuario compara contra namecheap.com y ve el mismo precio o peor |
| **ResellerClub** | Sí | **Sin fee de alta.** Depósito inicial usable de **USD 25** (Base Slab); el mejor slab arranca en **USD 2.999** **[V]** | No **[V]** | [NE] | Por *slabs*: el precio mayorista baja solo cuando sube tu facturación acumulada **[V]** | Del revendedor | [NE] verificado hoy | **Marginal.** La entrada es baratísima, pero en el slab base el precio mayorista es el peor de su propia tabla |
| **Enom (Tucows)** | Sí | **USD 50 de alta, una vez.** Arrancás en plan Silver **[V]**. Recarga mínima de USD 100 si pagás con tarjeta **[V2]** | No | [NE] país; piden email válido y medio de pago **[V]** | 4 escalones por volumen anual; se recalcula cada 31 de diciembre **[V]** | Del revendedor | API sí; sandbox [NE] | Bajo. El escalonado anual castiga al que arranca |
| **OpenSRS (Tucows)** | Sí, todo white-label **[V]** | **USD 95 de activación, una vez**, no reembolsable pero **se convierte en crédito de cuenta** **[V]** | **No, y sin mínimo de compra** **[V]** | Pagos **sólo en USD**. Wire, cheque, money order, tarjeta y PayPal con **3 % de recargo**, ACH sólo Norteamérica **[V]**. Restricción de país no publicada **[NE]** | [NE] no publican tabla | Del revendedor. El abuso se gestiona a nivel registrador y te notifican para que actúes **[V2]** | API documentada; sandbox [NE] | **Es el más limpio de los clásicos**: sin cuota mensual, sin mínimo, y los USD 95 vuelven como crédito. Pero pagar en USD desde Argentina es el cuello de botella (§7) |
| **Dynadot** | Sí: white-label real, "los dominios registrados bajo tu cuenta de reseller no quedan registrados bajo Dynadot", control total de precios, API y WHMCS **[V]** | **Sin fees ocultos, sin depósitos mínimos, sin cuotas de venta** **[V]** | No **[V]** | **La cuenta no puede tener dominios ni órdenes activas**: hay que crear una cuenta nueva y limpia **[V]** | **No publican el descuento** **[NE]** | Del revendedor | API con 120+ acciones **[V]**; sandbox [NE] | **La entrada más barata de todas.** El riesgo es que el descuento es una incógnita: hay que preguntarlo antes de invertir tiempo |
| **GoDaddy (Basic/Pro, ex Wild West Domains)** | **No del todo.** El checkout lo corre Wild West Domains, una entidad de GoDaddy, con carrito "todavía white-label" pero contrato, experiencia y cobro fuera de tu plataforma **[V2]** | Basic ~USD 8,99/mes; **Pro USD 14,99/mes** **[V2]** | **Sí, mensual** | — | Hasta 20 % off retail en Basic, hasta 40 % en Pro **[V2]** | GoDaddy cobra; vos no necesitás merchant account **[V2]** | **La Domains API pública exige 50+ dominios activos o un gasto promedio de USD 20/mes desde mayo de 2024** **[V2]**. Sandbox OTE existe, con paridad imperfecta **[V2]** | **No.** Cuota fija mensual antes de la primera venta, y el usuario termina comprando en un carrito que no es tuyo |
| **Cloudflare Registrar** | **No. No es reventa.** La API beta (lanzada el **15 de abril de 2026**) registra **sólo en la cuenta autenticada** y factura al método de pago por defecto de esa cuenta **[V]** | Cuenta de Cloudflare con medio de pago | No | — | **Cero por diseño**: precio al costo, "cobramos exactamente lo que cobra el registro" (.com USD 8,57; .dev USD 10,11; .app USD 11,00) **[V]** | — | Endpoints de **search**, **check** (hasta 20 dominios por request, con precio) y **register**; token con permiso *Registrar write*. Sin renovaciones, transferencias ni cambio de contactos todavía. Sólo un subconjunto de TLDs en beta **[V]** | **Descartar como vía de venta.** Si registrás con esto, **el titular sos vos**, y venderle a alguien un dominio del que no es dueño es un problema legal, no una feature |
| **Openprovider** | Sí | **Membresía desde USD 49/año**, sin fee de alta **[V2]** | Sí, anual | Empresa/país [NE] | **Dominios a precio de costo de registro** sobre 1.900+ TLDs **[V2]** | Del revendedor. Tienen guía propia de gestión de abuso **[V2]** | API sí; sandbox [NE] | **La opción con mejor relación entrada/margen si algún día hay volumen.** Con USD 49/año fijos, necesitás ~10–12 dominios/año sólo para empatar la cuota **[E]** |
| **APIs "buy-a-domain" (capa nueva: Domainee, Entri Sell)** | Sí, y el proveedor no aparece en el WHOIS **[V2]** | Domainee: **USD 0, wholesale + USD 1 fijo por registro**, sin suscripción. Entri Sell: **suscripción desde USD 249/mes**, hasta USD 749/mes con SSL, tope 600 dominios/año **[V2]** | Domainee no; Entri sí | [NE] | Domainee deja ~USD 4–5 por `.com`; Entri no publica su comisión **[V2]** | El proveedor mantiene la relación con el registrador; vos ponés el precio | API única | **Domainee es la única forma de "vender adentro" sin contrato de reseller.** Pero: **toda la información viene del blog del propio vendedor**, es un proveedor chico y nuevo, y le estarías delegando la continuidad de los dominios de tus usuarios a una startup. Riesgo de contraparte alto **[E]** |

### 3.2 El margen, sin adornos

Fuente secundaria y de un vendedor interesado, así que tomarla como orden de magnitud **[V2]**: una plataforma de reseller deja **USD 4–6 por `.com`**; la ruta de API buy-a-domain deja **USD 4–5**. La conclusión que saca esa misma fuente es la correcta: *los dos números son casi iguales, la diferencia es lo que tuviste que construir y cargar para ganarlo*.

Contra eso, el afiliado deja USD 2–3 **[E]** con cero infraestructura, cero obligaciones y cero riesgo de contracargo.

**La reventa duplica el ingreso por venta y multiplica por diez el costo fijo y el riesgo.** A 5 ventas por mes esa cuenta no cierra. **[E]**

### 3.3 Quién queda a cargo de qué

- **Renovaciones**: del revendedor, y son un compromiso perpetuo. El registrador no le va a cobrar al usuario final: te cobra a vos, y vos tenés que haberle cobrado a él, todos los años, para siempre.
- **Soporte de primer nivel**: del revendedor. El usuario que no puede apuntar su DNS te escribe a vos.
- **Abuso**: se resuelve a nivel registrador, pero al revendedor lo notifican y tiene que actuar rápido; se espera que tenga políticas, monitoreo y respuesta **[V2]**.
- **Contracargos**: del revendedor, y con consecuencias: se retienen comisiones ante exceso de contracargos o reembolsos **[V2]**.

---

## 4. Fuentes de datos de precios

| Fuente | Qué devuelve | Costo | Límites | ¿Se pueden mostrar a terceros? | Confianza |
|---|---|---|---|---|---|
| **Porkbun `POST https://api.porkbun.com/api/json/v3/pricing/get`** | Precio de **registro, renovación y transferencia por TLD**, más cupones | **Gratis, sin API key** | No documentados en la respuesta; hay headers `X-RateLimit-*` en los endpoints limitados **[V]** | Sin cláusula explícita **[NE]** | **[V] Probado por mí hoy: HTTP 200 sin autenticación.** Muestra real: `.com` 11,08 / `.io` 28,12 reg. y **51,80 renov.** / `.co` 15,76 reg. y 31,20 renov. / `.app` 8,75 / `.dev` 8,75 / `.tech` **6,99 reg. y 50,98 renov.** / `.xyz` 2,04 reg. y 14,21 renov. USD |
| **Namecheap `namecheap.users.getPricing`** | Precios propios de registro, renovación y transferencia por TLD, con promociones vigentes | Gratis, pero **requiere API key**, o sea USD 50 de saldo o 20 dominios | 50/min, 700/hora, 8.000/día por key; whitelist de IPv4 **[V]** | [NE] | [V] |
| **Cloudflare Registrar API `check`** | Disponibilidad **y precio at-cost**, hasta 20 dominios por request | Gratis con cuenta y token | Beta; sólo un subconjunto de TLDs | Son precios al costo de Cloudflare: **mostrarlos junto a un link a otro registrador sería engañoso** **[E]** | [V] |
| **Fastly Domain Research API (ex Domainr)** | **Disponibilidad y sugerencias. NO devuelve precios** | 10.000 requests/mes gratis, después **USD 0,001/request** hasta 1M, y baja por volumen **[V2]** | Por request | — | [V] que no devuelve precios; [V2] la escala de precios |
| **TLD-List API / tldes.com / TLDSpy** | Comparación de precios entre registradores | TLD-List: no pude leer la doc, el sitio devolvió **403** al fetch **[NE]**. TLDSpy: USD 39–89/mes **[V2]** | [NE] | [NE] | [V2] |

Nota: las docs originales de la API de Domainr están **deprecadas**; el servicio pasó a Fastly en 2023 y hoy es la Domain Research API **[V]**.

### Lo que esto implica en la práctica

**Hay una trampa de coherencia.** Si mostrás el precio de Porkbun (gratis y sin fricción) y el botón lleva a Namecheap, el usuario ve un número y paga otro, y la culpa se la lleva la plataforma. Dos salidas honestas:

1. **Precio de referencia explícito**: "desde USD 11,08 · precio de referencia en Porkbun al 27/08/2026". Cachear con timestamp y mostrar la fecha. Costo: cero. **[E] — es el camino que ya tomó `pricing.service.ts`.**
2. **Coherencia total**: depositar los USD 50 en Namecheap, sacar la API key, usar `users.getPricing` y mostrar el precio del mismo registrador al que se linkea. Los USD 50 no se pierden, quedan como saldo gastable. **[E] recomendado apenas el afiliado empiece a convertir.**

Advertencia sobre qué precio mostrar: fijarse en la brecha entre registro y renovación. `.tech` sale 6,99 el primer año y **50,98** el segundo; `.io` pasa de 28,12 a 51,80 **[V]**. Mostrar sólo el precio de registro es la práctica de la industria y es medio trampa. Mostrar los dos es un diferencial de confianza barato y encaja con el perfil del usuario de esta plataforma. **[E]**

---

## 5. Sugerencia de alternativas cuando el dominio está tomado

| Opción | Qué da | Costo | Confianza |
|---|---|---|---|
| **Fastly Domain Research `search`** | Sugerencias contextuales, con stemming, normalización Unicode e IDN; filtra por extensión, registrador, ubicación o idioma. Acceso privilegiado a datos de registro, sin falsos positivos, y marca si el dominio es premium o está en aftermarket | 10.000 requests/mes gratis, después USD 0,001 c/u | [V] las capacidades; [V2] los precios |
| **Cloudflare Registrar `search`** | Genera candidatos a partir de keywords; resultados cacheados y rápidos | Gratis con cuenta | [V] |
| **Namecheap API** | `domains.check` en lote. **No encontré un endpoint de sugerencias creativas** | Gratis con key | [V] el check; [NE] las sugerencias |
| **GoDaddy suggestions** | — | Bloqueado por el requisito de 50+ dominios | [V2] |
| **DomScan, VebAPI y similares** | Se promocionan con free tier y 1.100+ TLDs | Desde USD 10, tier gratis de 10.000 créditos/mes | [V2] — material de marketing, no verificado contra la API |
| **Generación local + el RDAP que ya existe** | Variantes por prefijo y sufijo (`get-`, `-app`, `hq`, `my-`, guiones), y el mismo nombre en otros TLDs, validadas con el chequeo que la plataforma ya tiene | **Cero** | **[E]** — cubre la mayor parte del valor percibido sin agregar ningún proveedor. Es lo que yo haría primero |

**Recomendación [E]**: la generación local es el 80 % del beneficio a costo cero. El caso fuerte para pagar Fastly no son las sugerencias: es que **resuelve el bug de `.io` y `.co`**, que hoy nunca generan link porque no están en el bootstrap de RDAP de IANA. Eso sí es plata que se está perdiendo hoy, y el free tier de 10.000 consultas mensuales probablemente alcance de sobra al volumen actual.

---

## 6. Lo legal y lo operativo, sin adornos

### 6.1 Frente a ICANN, si revende

Todo esto sale del RAA 2013, sección 3.12 **[V]**:

- **El registrador acreditado responde por todo**, lo haga él o un revendedor. Vos no sos la parte acreditada; sos un tercero contratado.
- Tu acuerdo de registro con el usuario **debe incluir todas las cláusulas y avisos exigidos por el RAA y por las políticas de consenso de ICANN**. No es un ToS que se escribe a ojo.
- **Debe identificar al registrador patrocinante**, o dar un medio para identificarlo.
- **No podés usar el logo de ICANN ni decir que estás acreditado.** Requiere permiso escrito de ICANN, que no vas a tener.
- Tenés que darle al usuario acceso a los materiales educativos de ICANN y a la *Registrants' Benefits and Responsibilities Specification*.
- Si el registrador detecta que incumplís, está obligado a tomar medidas contra vos.

**Acreditarse uno mismo como registrador está fuera de discusión a esta escala**: USD 3.500 de solicitud no reembolsable, USD 4.000 por año, y USD 0,20 por transacción de alta, renovación o transferencia desde el 1 de julio de 2025 **[V]**.

### 6.2 Si el negocio cierra

Este es el punto que más hay que mirar antes de vender el primer dominio.

- Los dominios los patrocina **el registrador**, no vos. Si la plataforma cierra, los dominios no se evaporan: siguen en el registrador **[E, deducido del marco de responsabilidad verificado en 6.1]**.
- **Pero el usuario sólo es dueño si sus propios datos figuran como registrante.** Si registrás todo bajo tu cuenta —que es exactamente lo que haría la API de Cloudflare— el titular sos vos y el usuario no tiene nada. **Regla dura: el registrante siempre debe ser el usuario.**
- Los registradores acreditados hacen **escrow de datos**, incluidos los de servicios de privacidad/proxy, y ICANN puede acceder si el registrador cesa operaciones **[V]**. Ese escrow protege contra la caída *del registrador*, no contra la tuya.
- Las **renovaciones son un compromiso perpetuo**. Si dejás de operar y no migrás las cuentas a tiempo, los dominios de tus usuarios vencen. Un plan de salida escrito —cómo se entregan los auth codes y se transfieren las cuentas— es requisito, no adorno **[E]**.

### 6.3 Datos personales del titular

- **ICANN dio de baja WHOIS para gTLDs el 28 de enero de 2025**; RDAP es el reemplazo obligatorio, con JSON estructurado, HTTPS y acceso por niveles **[V2]**.
- RDAP **redacta por defecto**: nombre, mail, teléfono y dirección del registrante no salen en la consulta pública; el acceso completo va por partes verificadas vía RDRS **[V2]**.
- Como revendedor recolectás nombre, dirección, mail y teléfono del titular. Sos responsable de esos datos frente al usuario y encargado frente al registrador. Los datos se conservan **por la vida del dominio más 2 años** **[V2]**.
- **Situación argentina (Ley 25.326 y su eventual reforma): no la verifiqué en esta investigación. [NE]** No tomes ninguna decisión de cumplimiento local con este documento; eso es consulta de abogado.

---

## 7. La restricción de producto: pagos

### 7.1 El texto real, y el matiz

`Product.md`, sección 7 "Qué NO Hace el Producto", línea 104, dice que el producto **no** "Procesa pagos **entre las partes**" **[V]**.

El matiz importa y hay que decirlo con honestidad en las dos direcciones:

- **A favor de vender dominios**: vender un dominio no es un pago entre partes. Es una venta propia de la plataforma a un usuario. La letra del límite no lo prohíbe.
- **En contra**: el límite existe porque el MVP eligió no ser un intermediario financiero, con todo lo que eso arrastra. Meter un checkout propio levanta ese muro igual, aunque sea por otra puerta. **A partir del primer cobro, la plataforma es comercio electrónico**, con las obligaciones que eso trae, y el argumento de "nosotros no manejamos plata" deja de estar disponible también para el resto del producto.

**Esto es una decisión del dueño, tomada a conciencia, no un detalle de implementación.**

### 7.2 Qué implicaría, cuantificado

| Frente | Qué hay que resolver | Costo o riesgo | Confianza |
|---|---|---|---|
| **Pasarela** | Mercado Pago es lo natural para AR y LATAM; reporta movimientos a ARCA. **Stripe no tiene setup local limpio en Argentina**: el camino habitual es una entidad en EE.UU. (Stripe Atlas, ~USD 500) | Comisión de pasarela: **[NE] no verifiqué la tarifa vigente 2026.** No la aproximo | [V2] |
| **Descalce de moneda** | Al registrador le pagás en **USD** (OpenSRS acepta sólo USD **[V]**); al usuario le cobrás en **ARS**. Mercado Pago acredita en pesos al cambio del día aunque la tarjeta sea internacional **[V2]** | **Riesgo cambiario en cada venta.** Un margen de USD 4–6 lo borra un salto de tipo de cambio entre el cobro y la acreditación **[E]** | [V2] + [E] |
| **Facturación** | Factura electrónica obligatoria vía AFIP/ARCA para venta online regular | Contador y alta fiscal | [V2] |
| **Impuestos** | **IVA 21 % sobre servicios digitales** a consumidores argentinos. Monotributo hasta el tope de categoría; arriba, responsable inscripto | El 21 % se come el margen entero si no se traslada al precio, y trasladado te deja arriba del precio de Namecheap **[E]** | [V2] |
| **Reembolsos** | **Un dominio registrado no se puede devolver.** Cloudflare lo dice explícito: "los dominios no son reembolsables una vez registrados" **[V]**, y es la regla general del registro | Todo reembolso que otorgues sale de tu bolsillo, sin recuperar el costo | [V] + [E] |
| **Contracargos y fraude** | Los dominios son mercadería digital, instantánea e irreversible: blanco clásico de tarjetas robadas. El costo del contracargo lo come el revendedor **[V2]** | **[E] Este es el riesgo que funde a los revendedores chicos**, no la operación. Sin sistema antifraude, un puñado de contracargos borra meses de margen | [V2] + [E] |
| **Cumplimiento** | El acuerdo de registro con las cláusulas del RAA (§6.1) | Redacción legal | [V] |

**Estimación honesta [E]**: entre pasarela, contador, alta fiscal, antifraude y el trabajo de integración, el piso para operar esto en regla no baja de varios cientos de dólares de setup más un costo mensual recurrente. Contra un ingreso proyectado de **USD 11–16 por mes** en modo afiliado (§2.3), o quizá el doble en modo reventa, **el negocio no cierra hoy, y no cierra por un margen amplio, no por poco.**

---

## 8. Recomendación priorizada

Los puntos 3 y 4 de esta lista **ya se implementaron hoy** mientras corría la investigación (precios de Porkbun con disclaimer, sugerencias generadas localmente, deep link al carrito). Quedan anotados igual porque confirman la dirección; lo pendiente son 1, 2 y 5.

### Hoy — 0 a 2 semanas, costo USD 0

1. **Dar de alta el programa de afiliados de Namecheap en Impact y cargar `NAMECHEAP_AFFILIATE_URL_TEMPLATE`.** Es la única acción de este documento con retorno inmediato y costo cero. Ojo con los criterios de aceptación: exigen sitio propio con presencia establecida y contenido alineado, con aprobación manual **[V]** — `vinciinventa.com` en producción califica, pero hay que presentarlo bien. Contar 3 a 7 días hábiles de revisión **[V2]**.
2. **Aplicar las dos correcciones de §1.1**: apuntar el template a Impact (no ShareASale) y sacar `PORKBUN_AFFILIATE_REF`, que corresponde a un programa discontinuado.
3. ~~Mostrar precios de referencia con la API pública de Porkbun~~ → **hecho**, y bien: con `asOf`, caché de 12 h, ventana de tolerancia de 7 días y disclaimer explícito. Mantener la decisión de mostrar **renovación además de alta**: es donde está el engaño de la industria y es un diferencial de confianza gratis.
4. ~~Sugerir alternativas generadas localmente~~ → **hecho**, con presupuesto acotado de consultas RDAP y ranking por plausibilidad de marca.
5. **Instrumentar**: contar búsquedas, clicks salientes por registrador y conversiones reportadas por Impact. **Sin ese número, ninguna decisión de la etapa siguiente se puede tomar.** Hoy ni siquiera se sabe si el módulo tiene tráfico suficiente para que algo de esto importe.
6. **Decidir explícitamente qué pasa con el comparativo de Porkbun.** `compareEnabled()` deja la tensión anotada pero sin resolver, y ahora hay un dato nuevo: Porkbun **no puede** pagar comisión. Cada click que se le va es ingreso cedido para siempre. Es una decisión de dueño —honestidad de la comparación contra monetización—, no de código, y la variable de entorno ya permite tomarla sin deploy.

### A 3 meses — condicionado a los datos del punto 5

6. **Si el volumen no llega a 200–300 clicks salientes por mes** **[E, umbral mío]**: parar acá. El módulo de dominios es una feature de retención, no una línea de ingresos, y hay que tratarlo como tal.
7. **Si hay volumen**: depositar los USD 50 en Namecheap para sacar la API key y usar `users.getPricing`, así el precio mostrado y el precio cobrado son del mismo registrador. Los USD 50 quedan como saldo, no se pierden.
8. **Evaluar Fastly Domain Research** por el free tier de 10.000 consultas mensuales, no por las sugerencias sino **para arreglar `.io` y `.co`**, que hoy nunca generan link.
9. **Sólo si el dueño decide levantar conscientemente la restricción de pagos** (§7): el primer escalón razonable es **Dynadot** (entrada gratis, sin mínimos, white-label real — pero hay que preguntarles el descuento antes, porque no lo publican **[NE]**) o **OpenSRS** (USD 95 que vuelven como crédito, sin cuota mensual). **Openprovider** a USD 49/año pasa a ser la mejor si el volumen supera unos 12 dominios al año.

### Descartar de plano, y por qué

| Descartar | Motivo |
|---|---|
| **Cloudflare Registrar API como vía de venta** | Registra a nombre tuyo, no del usuario. Venderle a alguien un dominio del que no es titular no es un problema de UX, es un problema legal **[V]** |
| **Programa de afiliados de Porkbun** | Discontinuado. Varios agregadores todavía lo listan como activo: no hacerles caso **[V]** |
| **GoDaddy, tanto Domains API como reseller turnkey** | La API exige 50+ dominios o USD 20/mes de gasto promedio **[V2]**; el reseller cobra cuota mensual antes de la primera venta y el checkout ocurre fuera de la plataforma **[V2]** |
| **Namecheap API como vía de reventa con margen** | El precio por API es el mismo que el retail público; recién con 50+ dominios hay precio negociado **[V]**. Sin margen no hay negocio |
| **Acreditación ICANN propia** | USD 3.500 + USD 4.000/año + USD 0,20 por transacción **[V]**. Órdenes de magnitud fuera de escala |
| **Hostinger como programa de dominios** | Regalan el dominio con el hosting; la comisión alta es sobre hosting, no sobre dominios **[E]** |
| **Entri Sell** | USD 249–749 por mes antes del primer cliente **[V2]**, contra un ingreso proyectado de USD 11–16/mes |

---

## 9. Lo que busqué y no encontré

Explícito, para que nadie lo confunda con un dato:

- Parámetro de "agregar al carrito" en la **documentación** de Namecheap: no existe, sólo documentan el deep link a la página de resultados **[NE]**. El formato `/cart/?domains=` que hoy usa el código funciona, pero se descubrió probando, no leyendo: es un comportamiento no contractual y puede romperse sin aviso (§2.2).
- Cookie de Dynadot en fuente oficial. Los terceros dicen 30 días. **[NE]**
- Deep links con dominio precargado documentados para Dynadot y Hostinger. **[NE]**
- Formato exacto del deep link de GoDaddy vía CJ. **[NE]**
- Tabla de descuentos del programa reseller de Dynadot. **No la publican; hay que preguntarla.** **[NE]**
- Tabla de márgenes de OpenSRS. **[NE]**
- Restricciones de país de OpenSRS, Enom, ResellerClub y Dynadot para operadores en Argentina. **Ninguno publica una lista de países aceptados o vetados.** Hay que preguntarlo antes de invertir tiempo, porque una negativa invalida toda la rama de reventa. **[NE]**
- Términos de TLD-List API: el sitio devolvió **403**. **[NE]**
- Si Namecheap, Porkbun o Cloudflare permiten explícitamente republicar sus precios a terceros: no encontré cláusula en ningún sentido. **[NE]**
- Comisión de Mercado Pago vigente en 2026 y estado actual de la Ley 25.326. **[NE]** — fuera del alcance de esta investigación, y no los aproximo.
- Condiciones de reventa de `.com.ar`: NIC Argentina opera con "agentes registradores", pero **no encontré pricing ni requisitos publicados para revendedores** **[NE]**. Ninguno de los proveedores internacionales de esta investigación cubre `.ar`.

---

## 10. Fuentes

Todas consultadas el **27 de agosto de 2026**.

**Reventa**
- [Namecheap — Do you have a domain reseller program?](https://www.namecheap.com/support/knowledgebase/article.aspx/754/63/do-you-have-a-domain-reseller-program/)
- [Namecheap — API FAQ](https://www.namecheap.com/support/knowledgebase/article.aspx/9739/63/api-faq/)
- [ResellerClub — Domain Reseller Program](https://www.resellerclub.com/domain-reseller-program) · [Pricing](https://www.resellerclub.com/domain-reseller/pricing)
- [Enom — Becoming a reseller](https://support.enom.com/support/solutions/articles/201000065296) · [Reseller pricing structure](https://support.enom.com/support/solutions/articles/201000065332-enom-reseller-pricing-structure)
- [OpenSRS — Become a domain reseller](https://opensrs.com/become-a-domain-reseller/) · [Payment terms](https://opensrs.com/payment-terms/)
- [Dynadot — Domain Reseller Program](https://www.dynadot.com/domain/reseller-program) · [Domain API](https://www.dynadot.com/domain/api)
- [GoDaddy — Reseller Program](https://www.godaddy.com/reseller-program) · [Basic and Pro Reseller plans](https://www.godaddy.com/help/what-are-basic-and-pro-reseller-plans-5798) · [How do I access domain-related APIs?](https://www.godaddy.com/help/how-do-i-access-domain-related-apis-42424)
- [Cloudflare — Registrar API now in beta (15/04/2026)](https://blog.cloudflare.com/registrar-api-beta/) · [Registrar API docs](https://developers.cloudflare.com/registrar/registrar-api/)
- [Openprovider — Membership Pricing](https://www.openprovider.com/membership-pricing) · [Dealing with domain abuse](https://www.openprovider.com/blog/dealing-with-domain-abuse-a-guide-for-domain-resellers)
- [Domainee — Sell Domains in Your App: Routes, Margins, Setup (24/07/2026)](https://domainee.dev/blog/sell-domains-in-your-app) — *fuente de un vendedor interesado* · [Buy a Domain API](https://domainee.dev/buy-domain-api)
- [Entri Sell](https://www.entri.com/products/sell)

**Afiliación**
- [Namecheap — What are the Namecheap commission rates?](https://www.namecheap.com/support/knowledgebase/article.aspx/9933/55/what-are-the-namecheap-commission-rates/)
- [Namecheap — Affiliate Program Beginners Guide](https://www.namecheap.com/support/knowledgebase/article.aspx/10143/55/namecheap-affiliate-program-beginners-guide/)
- [Namecheap — Acceptance criteria for new affiliates](https://www.namecheap.com/support/knowledgebase/article.aspx/9965/55/acceptance-criteria-for-new-affiliates/)
- [Namecheap — How to link to a domain search result page](https://www.namecheap.com/support/knowledgebase/article.aspx/10127/55/how-to-link-to-a-domain-search-result-page-on-namecheapcom/) ← **formatos de deep link**
- [Porkbun — /affiliate (discontinuado)](https://porkbun.com/affiliate) · [Affiliate agreement](https://porkbun.com/legal/agreement/affiliate_agreement)
- [Dynadot — Affiliate Program](https://www.dynadot.com/affiliate)
- [GoDaddy — Affiliate Programs](https://www.godaddy.com/affiliate-programs)
- [CommissionDex — GoDaddy affiliate review 2026](https://commissiondex.com/programs/godaddy/) — *secundaria*
- [Referly — Hostinger affiliate](https://www.referly.so/affiliate-programs/hostinger) — *secundaria*

**Precios y sugerencias**
- [Porkbun API v3 — documentación](https://porkbun.com/api/json/v3/documentation) · endpoint `pricing/get` **probado directamente**
- [Namecheap — namecheap.users.getPricing](https://www.namecheap.com/support/api/methods/users/get-pricing/)
- [Fastly — Domain Research API](https://www.fastly.com/products/domain-research-api) · [Domainr API (deprecada)](https://domainr.com/docs/api)
- [TLD-List — API v1](https://tld-list.com/api-documentation/v1) *(403 al consultar)* · [tldes.com API](https://tldes.com/docs/api.html)

**Legal y operativo**
- [ICANN — 2013 Registrar Accreditation Agreement](https://www.icann.org/en/contracted-parties/accredited-registrars/registrar-accreditation-agreement/2013-registrar-accreditation-agreement-17-09-2013-en)
- [Com Laude — ICANN obligations relating to the provision of registrar services by third parties](https://comlaude.com/registry/icann-obligations-relating-to-the-provision-of-registrar-services-by-third-parties/)
- [ICANN — Registrar-Level Fees FY2026](https://www.icann.org/en/announcements/details/icann-accredited-registrars-approve-registrar-level-fees-for-fiscal-year-2026-21-07-2025-en) · [Registrar application](https://www.icann.org/en/contracted-parties/accredited-registrars/how-to-become-a-registrar/registrar-application)
- [Enom — GDPR guidelines for resellers](https://support.enom.com/support/solutions/articles/201000065391-gdpr-guidelines-for-resellers)
- [Openprovider — What is RDAP?](https://www.openprovider.com/blog/what-is-rdap)
- [NameSilo — Refunds, chargebacks and ownership](https://www.namesilo.com/blog/en/domain-names/refunds-chargebacks-and-ownership-what-payment-failures-really-mean)
- [Stripe — disponibilidad internacional](https://stripe.com/global) · [Cristian Tala — Pasarelas de pago LATAM 2026](https://cristiantala.com/pasarelas-de-pago-en-latam-2026-la-guia-que-necesitas-antes-de-cobrar-tu-primer-dolar/) — *secundaria*
- [Contablix — WooCommerce Argentina: impuestos y facturación ARCA 2026](https://contablix.ar/blog/woocommerce-argentina-impuestos-2026) — *secundaria*
- [NIC Argentina — Aranceles](https://nic.ar/es/dominios/aranceles)

**Interno** (estado al 27/08/2026, 09:06)
- `backend/domains-service/src/modules/domains/domains.service.ts`
- `backend/domains-service/src/modules/domains/registrars.ts` — deep links y hooks de afiliación
- `backend/domains-service/src/modules/domains/pricing.service.ts` — integración con Porkbun
- `backend/domains-service/src/modules/domains/suggestions.ts` — alternativas generadas localmente
- `backend/domains-service/src/modules/domains/rdap.ts`
- `Product.md`, sección 7, línea 104
