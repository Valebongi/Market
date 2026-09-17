/**
 * Contenido de las guías de /recursos. En el texto, `[texto](/ruta)` se
 * renderiza como link interno.
 *
 * Al cambiar el contenido de una guía, actualizar su `dateModified`: alimenta
 * el schema `Article` y el `lastmod` del sitemap.
 */

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "table"; caption: string; head: string[]; rows: string[][] };

export interface Guide {
  slug: string;
  title: string;
  description: string;
  h1: string;
  datePublished: string;
  dateModified: string;
  intro: string[];
  sections: { heading: string; blocks: GuideBlock[] }[];
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
}

const COMO_FUNCIONA = { href: "/como-funciona", label: "Cómo licenciar propiedad intelectual en Da Vinci Inventa" };

export const GUIDES: Guide[] = [
  {
    slug: "como-licenciar-una-marca",
    title: "Cómo licenciar mi marca paso a paso",
    description:
      "Cómo licenciar mi marca en Argentina: qué necesitás, qué condiciones fijar y cómo licenciarla sin venderla. Guía paso a paso para titulares.",
    h1: "Cómo licenciar mi marca: guía paso a paso",
    datePublished: "2026-09-17",
    dateModified: "2026-09-17",
    intro: [
      "Para licenciar tu marca tenés que definir qué vas a permitir usar, a quién, en qué condiciones y a cambio de qué, y dejarlo por escrito en un contrato de licencia. La marca sigue siendo tuya: solo autorizás a otra persona o empresa a usarla.",
      "En esta guía te explicamos qué conviene tener resuelto antes de empezar, los pasos para licenciar tu marca y qué tiene que decir el contrato.",
    ],
    sections: [
      {
        heading: "Qué es licenciar una marca",
        blocks: [
          { type: "p", text: "Licenciar una marca es darle a otra persona o empresa permiso para usar tu nombre comercial, tu logo o tu identidad visual en productos o servicios. Quien recibe ese permiso se llama licenciatario." },
          { type: "p", text: "La licencia no es una venta. Vos seguís siendo el titular y fijás las reglas: qué se puede hacer con la marca, dónde, durante cuánto tiempo y bajo qué estándares de calidad. Cuando la licencia termina, el licenciatario deja de usarla." },
          { type: "p", text: "Es un esquema muy común. Las franquicias funcionan en buena parte con licencias de marca, y lo mismo pasa con los productos que llevan la marca de otra empresa, como indumentaria, accesorios o artículos de promoción." },
        ],
      },
      {
        heading: "Qué necesitás antes de licenciar tu marca",
        blocks: [
          { type: "p", text: "Antes de ofrecerla, conviene tener claros estos puntos:" },
          {
            type: "list",
            items: [
              "Que sos el titular. Si la marca la creó un socio, una agencia o una empresa anterior, confirmá a nombre de quién está.",
              "El registro. En Argentina las marcas se registran en el INPI (Instituto Nacional de la Propiedad Industrial). Sin registro es más difícil demostrar tus derechos frente a terceros. Un registro dura 10 años y se puede renovar.",
              "Las clases. El registro protege la marca para ciertos productos y servicios, agrupados en clases. Solo podés licenciarla con seguridad para lo que cubre tu registro.",
              "Tu identidad visual documentada. Un manual de marca con logos, colores y usos correctos evita que cada licenciatario la aplique a su manera.",
              "Qué valor aporta. Pensá qué gana quien la licencia: reconocimiento, clientes, una estética ya probada en tu rubro.",
            ],
          },
        ],
      },
      {
        heading: "Cómo licenciar mi marca paso a paso",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Revisá la titularidad y el registro.", text: "Confirmá que la marca está a tu nombre, que el registro está vigente y para qué clases vale." },
              { title: "Definí qué incluye la licencia.", text: "Solo el nombre, el logo, la identidad completa o también recetas, procesos o proveedores asociados a la marca." },
              { title: "Elegí el tipo de licencia.", text: "Exclusiva, no exclusiva o temporal. Si no tenés clara la diferencia, mirá [cómo funciona cada tipo de licencia](/como-funciona)." },
              { title: "Fijá las condiciones.", text: "Territorio, duración, productos o servicios autorizados y estándares de calidad que el licenciatario tiene que respetar." },
              { title: "Poné un precio.", text: "Pago único, pagos periódicos o un porcentaje de las ventas. Te lo explicamos en [cuánto cobrar por una licencia](/recursos/cuanto-cobrar-por-una-licencia)." },
              { title: "Publicá tu marca y recibí solicitudes.", text: "En Da Vinci Inventa podés [publicarla](/register) con sus condiciones. Los interesados te escriben desde la ficha y conversan por la plataforma." },
              { title: "Firmá un contrato.", text: "Cuando haya acuerdo, dejalo por escrito. Conviene que lo revise un agente de propiedad industrial o un abogado." },
            ],
          },
        ],
      },
      {
        heading: "Licenciar una marca sin venderla",
        blocks: [
          { type: "p", text: "Si te preguntás cómo licenciar una marca sin venderla, la respuesta es que licenciar ya implica no venderla. La diferencia con una venta (o cesión) es la titularidad:" },
          {
            type: "table",
            caption: "Diferencias entre licenciar y vender una marca",
            head: ["Aspecto", "Licenciar", "Vender"],
            rows: [
              ["Titularidad", "Sigue siendo tuya", "Pasa al comprador"],
              ["Ingresos", "Pagos mientras dure la licencia", "Un pago, en general único"],
              ["Control", "Fijás cómo se usa la marca", "Dejás de decidir sobre la marca"],
              ["Varios interesados", "Podés licenciar a más de uno si no es exclusiva", "Solo hay un comprador"],
              ["Al terminar", "La marca vuelve a estar solo en tus manos", "No vuelve"],
            ],
          },
          { type: "p", text: "Licenciar te permite probar a un socio comercial sin perder la marca. Si más adelante los dos quieren una venta, se puede negociar aparte." },
        ],
      },
      {
        heading: "Qué tiene que decir el contrato de licencia de marca",
        blocks: [
          {
            type: "list",
            items: [
              "Quiénes son las partes y cuál es la marca, con su número de registro.",
              "Los productos o servicios en los que se puede usar.",
              "El territorio y la duración, y cómo se renueva.",
              "Si la licencia es exclusiva o no exclusiva.",
              "El precio, la forma de pago y, si hay regalías, cómo se calculan y se controlan.",
              "Los estándares de calidad y las reglas de uso de la identidad visual.",
              "Qué pasa si una de las partes no cumple.",
              "Qué tiene que hacer el licenciatario cuando la licencia termina, como dejar de usar la marca y retirar productos.",
            ],
          },
        ],
      },
      {
        heading: "Errores comunes al licenciar una marca",
        blocks: [
          {
            type: "list",
            items: [
              "Licenciar sin controlar la calidad: un mal uso de la marca daña su reputación, también para vos.",
              "Dejar el territorio o el rubro sin definir.",
              "Dar exclusividad sin pedir un mínimo de ventas o de pagos a cambio.",
              "No fijar qué pasa con el stock y la cartelería cuando la licencia termina.",
              "Licenciar para productos que tu registro no cubre.",
            ],
          },
        ],
      },
    ],
    faqs: [
      { q: "¿Puedo licenciar mi marca sin venderla?", a: "Sí. Licenciar una marca es justamente autorizar su uso sin transferirla: seguís siendo el titular y, cuando la licencia termina, el licenciatario deja de usarla." },
      { q: "¿Necesito tener la marca registrada para licenciarla?", a: "No siempre es obligatorio, pero es muy recomendable. Con el registro en el INPI es más fácil demostrar que sos el titular y defender la marca frente a terceros." },
      { q: "¿Puedo licenciar mi marca a más de una persona?", a: "Sí, si las licencias son no exclusivas o si cada una cubre un territorio o un rubro distinto. Si das una licencia exclusiva, no podés dar otra que se superponga." },
      { q: "¿Cuánto puedo cobrar por licenciar mi marca?", a: "Depende de la exclusividad, la duración, el territorio, los usos y el reconocimiento de la marca. No hay un monto estándar: cada acuerdo se negocia." },
      { q: "¿Tengo que inscribir la licencia de marca en algún organismo?", a: "Depende del caso y de lo que quieras oponer frente a terceros. Consultalo con un agente de propiedad industrial antes de firmar." },
    ],
    related: [
      { href: "/assets/marcas", label: "Marcas disponibles para licenciar" },
      COMO_FUNCIONA,
      { href: "/recursos/cuanto-cobrar-por-una-licencia", label: "Cuánto cobrar por una licencia" },
    ],
  },
  {
    slug: "cuanto-cobrar-por-una-licencia",
    title: "Cuánto cobrar por una licencia: criterios",
    description:
      "Cuánto cobrar por una licencia de software, marca o diseño: los criterios que definen el precio (exclusividad, duración, territorio y uso) y cómo cobrarla.",
    h1: "Cuánto cobrar por una licencia: criterios para fijar el precio",
    datePublished: "2026-09-17",
    dateModified: "2026-09-17",
    intro: [
      "No hay un precio estándar para una licencia: depende de cuántos derechos das y por cuánto tiempo. Como regla general, cuanto más exclusiva, más larga y más amplia en territorio y en usos, más vale.",
      "En esta guía te mostramos los criterios que conviene tener en cuenta, las formas de cobrar y un paso a paso para llegar a tu precio. No damos montos de referencia porque cada activo y cada mercado son distintos.",
    ],
    sections: [
      {
        heading: "De qué depende el precio de una licencia",
        blocks: [
          { type: "p", text: "Estos son los criterios que más mueven el precio. Usalos como lista de preguntas antes de publicar:" },
          {
            type: "table",
            caption: "Criterios para fijar el precio de una licencia",
            head: ["Criterio", "Qué preguntarte", "Cómo influye en el precio"],
            rows: [
              ["Exclusividad", "¿Otras personas van a poder usar el mismo activo?", "Una licencia exclusiva vale más porque te impide licenciarlo a otros."],
              ["Duración", "¿Por cuánto tiempo se puede usar?", "A mayor plazo, mayor precio. Una licencia temporal corta suele costar menos."],
              ["Territorio", "¿En qué ciudades, países o regiones?", "Un territorio más amplio vale más."],
              ["Usos permitidos", "¿Uso interno, reventa, modificación, sublicencia?", "Cada derecho extra suma valor, sobre todo revender o sublicenciar."],
              ["Rubro", "¿En qué industria se va a usar?", "El mismo activo puede valer distinto según el negocio que lo aprovecha."],
              ["Valor demostrable", "¿Tenés datos reales de uso, ventas o reconocimiento?", "La evidencia concreta justifica un precio más alto."],
              ["Soporte", "¿Incluye actualizaciones, capacitación o ayuda?", "El trabajo que sumás también se cobra."],
            ],
          },
        ],
      },
      {
        heading: "Formas de cobrar una licencia",
        blocks: [
          { type: "p", text: "Además de cuánto, hay que decidir cómo cobrar. Las formas más usadas son:" },
          {
            type: "list",
            items: [
              "Pago único: un monto al firmar. Es simple, pero no crece si al licenciatario le va bien.",
              "Pagos periódicos: una cuota mensual o anual mientras dure la licencia.",
              "Regalías: un porcentaje de las ventas o ingresos que genera el activo. Necesitás una forma de controlar esas ventas.",
              "Mixto: un pago inicial más regalías o cuotas. Reparte el riesgo entre las dos partes.",
              "Mínimo garantizado: un piso de pagos, útil sobre todo en licencias exclusivas.",
              "Gratis con condiciones: sin pago, a cambio de mención, visibilidad u otro beneficio que acuerden.",
            ],
          },
        ],
      },
      {
        heading: "Cómo calcular cuánto cobrar por una licencia paso a paso",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Definí qué incluye la licencia.", text: "Exclusividad, duración, territorio y usos. Sin esto, cualquier precio es arbitrario." },
              { title: "Pensá en el valor para quien licencia.", text: "Cuánto tiempo y dinero se ahorra frente a desarrollar algo propio o empezar de cero." },
              { title: "Calculá lo que dejás de ganar.", text: "Una licencia exclusiva te impide licenciar a otros en ese territorio o rubro: ese costo va en el precio." },
              { title: "Buscá referencias.", text: "Mirá activos parecidos en tu rubro y preguntá a colegas. Tomalas como orientación, no como regla." },
              { title: "Elegí la forma de cobro.", text: "Pago único, cuotas, regalías o una combinación, según tu necesidad de liquidez y el riesgo que quieras asumir." },
              { title: "Decidí si publicás un precio o lo dejás a negociar.", text: "Si tus condiciones cambian mucho según el caso, la negociación te da más margen." },
              { title: "Revisalo con el tiempo.", text: "Con cada acuerdo vas a tener más información para ajustar el precio de las próximas licencias." },
            ],
          },
        ],
      },
      {
        heading: "Licencia exclusiva o no exclusiva: cómo cambia el precio",
        blocks: [
          { type: "p", text: "Con una licencia no exclusiva podés tener varios licenciatarios a la vez, así que cada uno puede pagar menos y el ingreso total igual crece." },
          { type: "p", text: "Con una exclusiva, todo el ingreso depende de una sola parte. Por eso conviene cobrar más, pedir un mínimo garantizado y limitar la exclusividad a un territorio, un rubro o un plazo." },
        ],
      },
      {
        heading: "Precio fijo o a negociar",
        blocks: [
          { type: "p", text: "Cuando [publicás un activo](/register) en Da Vinci Inventa podés elegir un precio fijo, dejarlo a negociar u ofrecerlo gratis." },
          {
            type: "list",
            items: [
              "Precio fijo: sirve cuando las condiciones son siempre las mismas, por ejemplo una licencia no exclusiva de uso interno.",
              "A negociar: conviene cuando el precio depende mucho del territorio, la exclusividad o el tamaño de quien licencia.",
              "Gratis: puede servir para ganar visibilidad o validar el interés en tu activo.",
            ],
          },
          { type: "p", text: "En todos los casos, el pago se acuerda y se hace entre las partes, fuera de la plataforma. Más detalles en [cómo funciona Da Vinci Inventa](/como-funciona)." },
        ],
      },
      {
        heading: "Errores comunes al ponerle precio a una licencia",
        blocks: [
          {
            type: "list",
            items: [
              "Cobrar lo mismo por una licencia exclusiva que por una no exclusiva.",
              "Dar derechos de reventa o sublicencia sin cobrarlos.",
              "Acordar regalías sin una forma de verificar las ventas.",
              "Fijar el precio solo por lo que te costó crear el activo, sin mirar el valor que genera.",
              "No dejar por escrito cuándo y cómo se paga.",
            ],
          },
        ],
      },
    ],
    faqs: [
      { q: "¿Hay un precio estándar para una licencia?", a: "No. El precio depende de la exclusividad, la duración, el territorio, los usos permitidos y el valor que el activo genera para quien lo licencia." },
      { q: "¿Conviene cobrar regalías o un pago único?", a: "El pago único es más simple y te da el dinero al principio. Las regalías pueden generar más si al licenciatario le va bien, pero necesitás controlar sus ventas. Muchos acuerdos combinan las dos." },
      { q: "¿Cuánto más se cobra por una licencia exclusiva?", a: "No hay un porcentaje fijo. Tené en cuenta que, mientras dure, no vas a poder licenciar el activo a otros en ese territorio o rubro, y reflejalo en el precio." },
      { q: "¿Puedo ofrecer una licencia gratis?", a: "Sí. En Da Vinci Inventa podés publicar un activo con licencia gratuita. Igual conviene dejar por escrito los usos permitidos." },
      { q: "¿Cómo se cobra una licencia acordada en Da Vinci Inventa?", a: "El pago se acuerda y se hace entre las partes, fuera de la plataforma. Da Vinci Inventa no procesa pagos." },
    ],
    related: [
      { href: "/assets", label: "Catálogo de activos intelectuales" },
      COMO_FUNCIONA,
      { href: "/recursos/como-licenciar-una-marca", label: "Cómo licenciar mi marca" },
    ],
  },
  {
    slug: "como-monetizar-un-software",
    title: "Cómo monetizar un software con licencias",
    description:
      "Cómo monetizar un software que ya desarrollaste: modelos de negocio, cómo proteger tu código en Argentina y cómo licenciarlo paso a paso.",
    h1: "Cómo monetizar un software: licencias y otros modelos",
    datePublished: "2026-09-17",
    dateModified: "2026-09-17",
    intro: [
      "Para monetizar un software podés ofrecerlo como servicio, cobrar por su uso o licenciarlo a empresas y emprendedores que lo necesitan. Licenciarlo te permite generar ingresos con algo que ya desarrollaste sin dejar de ser su titular.",
      "En esta guía repasamos los modelos más usados, cómo proteger tu software en Argentina antes de licenciarlo y los pasos para hacerlo.",
    ],
    sections: [
      {
        heading: "Formas de monetizar un software",
        blocks: [
          {
            type: "table",
            caption: "Modelos para monetizar un software",
            head: ["Modelo", "Cómo funciona", "Qué implica para vos"],
            rows: [
              ["Software como servicio (SaaS)", "Los clientes pagan una suscripción para usarlo online.", "Tenés que operar la infraestructura, el soporte y la venta."],
              ["Licencia de uso", "El cliente instala y usa el software en sus equipos.", "Menos operación, pero hay que controlar instalaciones y versiones."],
              ["Licencia de código fuente", "El cliente recibe el código y puede adaptarlo.", "Suele valer más, pero perdés control sobre lo que hace con él."],
              ["Marca blanca (white label)", "Otra empresa lo vende con su propia marca.", "Ella se ocupa de vender; vos, del producto."],
              ["Licencia para comercializar", "Un tercero obtiene el derecho de revender o sublicenciar tu software.", "Llegás a mercados que no atendés sin armar un equipo comercial."],
              ["Servicios asociados", "Cobrás implementación, personalización o capacitación.", "Ingresos extra, pero dependen de tu tiempo."],
            ],
          },
          { type: "p", text: "No son excluyentes: podés ofrecer tu software como servicio y, a la vez, licenciarlo a una empresa de otro rubro." },
        ],
      },
      {
        heading: "Cuándo conviene licenciar tu software",
        blocks: [
          {
            type: "list",
            items: [
              "Desarrollaste un sistema que sirve a más de un tipo de negocio.",
              "Tenés un proyecto terminado o frenado que no vas a comercializar por tu cuenta.",
              "No tenés estructura para vender, dar soporte o sostener una suscripción.",
              "Hay una industria o una región que no atendés y otra empresa sí.",
            ],
          },
        ],
      },
      {
        heading: "Cómo proteger tu software antes de licenciarlo",
        blocks: [
          { type: "p", text: "En Argentina, los programas de computación están protegidos por el derecho de autor (Ley 11.723). La protección existe desde que creás el programa, sin trámite obligatorio." },
          {
            type: "list",
            items: [
              "Registro en la Dirección Nacional del Derecho de Autor: no es obligatorio, pero sirve como prueba de autoría y de fecha.",
              "Patentes: en Argentina los programas de computación, en sí mismos, no se patentan.",
              "Titularidad: si lo desarrollaste para un empleador o para un cliente, revisá tu contrato. Puede que el software no sea tuyo.",
              "Componentes de código abierto: revisá sus licencias. Algunas obligan a compartir el código de lo que se construye con ellas.",
              "Confidencialidad: antes de mostrar el código a un interesado, firmá un acuerdo de confidencialidad.",
            ],
          },
        ],
      },
      {
        heading: "Cómo monetizar un software con licencias paso a paso",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Confirmá que sos el titular.", text: "Revisá contratos con clientes, socios y empleadores, y las licencias de las librerías que usaste." },
              { title: "Definí qué licenciás.", text: "El programa listo para usar, el código fuente, el acceso a un servicio o también tu marca." },
              { title: "Elegí el tipo de licencia.", text: "Exclusiva, no exclusiva o temporal. Te lo explicamos en [cómo funciona cada tipo de licencia](/como-funciona)." },
              { title: "Definí los usos permitidos.", text: "Uso interno, cantidad de usuarios o instalaciones, modificaciones, reventa y sublicencia." },
              { title: "Poné un precio.", text: "Suscripción, pago único o regalías. Tenés los criterios en [cuánto cobrar por una licencia](/recursos/cuanto-cobrar-por-una-licencia)." },
              { title: "Prepará la documentación.", text: "Qué hace, requisitos técnicos, capturas o demo y qué soporte incluís." },
              { title: "Publicalo.", text: "En Da Vinci Inventa podés [publicar tu software](/register) con sus condiciones y recibir solicitudes de interesados." },
              { title: "Negociá y firmá.", text: "Cuando haya acuerdo, dejá todo por escrito en un contrato de licencia." },
            ],
          },
        ],
      },
      {
        heading: "Dónde encontrar a quién licenciarle tu software",
        blocks: [
          { type: "p", text: "Los mejores candidatos suelen ser quienes ya tienen el problema que tu software resuelve, pero no quieren desarrollarlo:" },
          {
            type: "list",
            items: [
              "Empresas del mismo rubro para el que lo creaste, en otras ciudades o países.",
              "Consultoras e integradoras que implementan sistemas para sus clientes.",
              "Emprendedores que necesitan una base técnica para lanzar su producto más rápido.",
              "Empresas de software que quieren sumar una función sin construirla.",
            ],
          },
          { type: "p", text: "Publicar tu software en un catálogo como el de [licencias de software](/assets/software) te permite recibir solicitudes de interesados que no conocés." },
        ],
      },
      {
        heading: "Qué incluir en una licencia de software",
        blocks: [
          {
            type: "list",
            items: [
              "El alcance: qué versión, qué módulos y para qué usos.",
              "La cantidad de usuarios, equipos o instalaciones.",
              "Si se entrega el código fuente y si se puede modificar.",
              "Si se puede revender o sublicenciar.",
              "El soporte y las actualizaciones incluidas, y por cuánto tiempo.",
              "Los límites de responsabilidad y las garantías.",
              "La confidencialidad del código y de la información del cliente.",
              "La duración, la renovación y qué pasa al terminar.",
            ],
          },
        ],
      },
    ],
    faqs: [
      { q: "¿Puedo licenciar un software que desarrollé para un cliente?", a: "Depende de tu contrato con ese cliente. Si le cediste los derechos, el software ya no es tuyo. Si no, puede que puedas licenciarlo. Revisalo antes de publicarlo." },
      { q: "¿Tengo que registrar mi software para licenciarlo?", a: "No es obligatorio. En Argentina el derecho de autor protege el software desde su creación. El registro en la Dirección Nacional del Derecho de Autor sirve como prueba." },
      { q: "¿Se puede patentar un software en Argentina?", a: "Los programas de computación, en sí mismos, no son patentables en Argentina. Se protegen por derecho de autor." },
      { q: "¿Qué conviene más: licencia de uso o de código fuente?", a: "Una licencia de uso te da más control. Una de código fuente suele valer más, pero el licenciatario puede adaptarlo y tenés menos control sobre lo que hace con él." },
      { q: "¿Puedo licenciar un software que usa componentes de código abierto?", a: "En muchos casos sí, pero depende de las licencias de esos componentes. Algunas obligan a publicar el código del software que las incluye." },
    ],
    related: [
      { href: "/assets/software", label: "Licencias de software disponibles" },
      COMO_FUNCIONA,
      { href: "/recursos/cuanto-cobrar-por-una-licencia", label: "Cuánto cobrar por una licencia" },
    ],
  },
  {
    slug: "como-vender-o-licenciar-una-patente",
    title: "Licenciar una patente o venderla: guía",
    description:
      "Cómo licenciar una patente en Argentina, en qué se diferencia de venderla y qué conviene definir en el contrato. Guía para inventores y empresas.",
    h1: "Cómo licenciar una patente (o venderla)",
    datePublished: "2026-09-17",
    dateModified: "2026-09-17",
    intro: [
      "Licenciar una patente es autorizar a otra persona o empresa a fabricar, usar o vender tu invención a cambio de un pago, sin dejar de ser su titular. Venderla, en cambio, es transferir la patente de forma definitiva.",
      "En esta guía te explicamos las diferencias, qué necesitás para licenciar una patente en Argentina, los pasos para hacerlo y qué tiene que decir el contrato.",
      "Aclaración: hoy el catálogo de Da Vinci Inventa no tiene una categoría específica para patentes.",
    ],
    sections: [
      {
        heading: "¿Vender o licenciar una patente?",
        blocks: [
          { type: "p", text: "Las dos opciones generan ingresos con tu invención, pero de formas muy distintas:" },
          {
            type: "table",
            caption: "Diferencias entre licenciar y vender una patente",
            head: ["Aspecto", "Licenciar", "Vender"],
            rows: [
              ["Titularidad", "Seguís siendo el titular", "Pasa al comprador"],
              ["Ingresos", "Pagos iniciales, cuotas o regalías", "Un pago, en general único"],
              ["Control", "Definís quién explota la invención y cómo", "Dejás de decidir"],
              ["Riesgo", "Tus ingresos dependen de cómo le vaya al licenciatario", "Cobrás y te desentendés"],
              ["Mantenimiento", "Seguís a cargo de mantener la patente vigente", "Lo asume el comprador"],
            ],
          },
          { type: "p", text: "Licenciar suele convenir si creés que la invención va a generar ingresos durante años. Vender puede tener sentido si necesitás el dinero ahora o si no querés ocuparte de mantener y defender la patente." },
        ],
      },
      {
        heading: "Qué necesitás para licenciar una patente",
        blocks: [
          {
            type: "list",
            items: [
              "Una patente concedida o una solicitud en trámite. En Argentina las otorga el INPI (Instituto Nacional de la Propiedad Industrial). Licenciar una solicitud en trámite es posible, pero más riesgoso para las dos partes.",
              "Vigencia. En Argentina una patente de invención dura 20 años desde la fecha de solicitud. Cuanto menos tiempo le quede, menos vale la licencia.",
              "Las tasas al día. Para mantener la patente hay que pagar anualidades. Si se dejan de pagar, se pierde.",
              "Claridad sobre el territorio. Una patente argentina protege la invención en Argentina. Para otros países hacen falta patentes en esos países.",
              "Quién puede aprovecharla. Identificá qué industrias o empresas podrían fabricar o usar tu invención.",
            ],
          },
        ],
      },
      {
        heading: "Cómo licenciar una patente paso a paso",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Verificá el estado de tu patente.", text: "Que esté vigente, que las anualidades estén pagas y a nombre de quién figura." },
              { title: "Identificá a los posibles licenciatarios.", text: "Empresas que fabrican productos parecidos, que tienen el problema que tu invención resuelve o que venden en el mercado al que apunta." },
              { title: "Definí el alcance.", text: "Si pueden fabricar, usar, vender o importar; en qué territorio, y para qué aplicaciones o campo de uso." },
              { title: "Elegí la exclusividad.", text: "Una licencia exclusiva vale más, pero te ata a un solo licenciatario. Mirá [las diferencias entre tipos de licencia](/como-funciona)." },
              { title: "Definí cómo vas a cobrar.", text: "Pago inicial, regalías sobre ventas, mínimos anuales o una combinación. Tenés los criterios en [cuánto cobrar por una licencia](/recursos/cuanto-cobrar-por-una-licencia)." },
              { title: "Cuidá la información.", text: "Firmá un acuerdo de confidencialidad antes de compartir detalles que no estén en la patente publicada." },
              { title: "Negociá y firmá el contrato.", text: "Hacelo con un agente de propiedad industrial o un abogado, y consultá si conviene inscribir la licencia ante el INPI." },
            ],
          },
        ],
      },
      {
        heading: "Venta de patentes: cuándo tiene sentido",
        blocks: [
          { type: "p", text: "La venta de patentes es habitual cuando el inventor no tiene cómo producir ni comercializar la invención, o cuando una empresa quiere asegurarse de que nadie más la use." },
          {
            type: "list",
            items: [
              "Necesitás el dinero ahora y no podés esperar regalías.",
              "No querés hacerte cargo de las anualidades ni de defender la patente.",
              "Un comprador ofrece un valor que ninguna licencia te daría.",
              "La invención solo le sirve a una o dos empresas del mercado.",
            ],
          },
          { type: "p", text: "Antes de vender, pedí una valuación y asesoramiento: una vez transferida, la patente no vuelve." },
        ],
      },
      {
        heading: "Qué tiene que decir un contrato de licencia de patente",
        blocks: [
          {
            type: "list",
            items: [
              "La patente o solicitud, con su número y su titular.",
              "Qué derechos se licencian: fabricar, usar, vender, importar.",
              "El territorio, el campo de uso y la duración.",
              "Si es exclusiva, y si el licenciatario puede sublicenciar.",
              "El precio, las regalías, los mínimos y cómo se controlan las ventas.",
              "Quién paga las anualidades y quién defiende la patente ante copias.",
              "Qué pasa con las mejoras que desarrolle el licenciatario.",
              "Las causas de terminación y qué pasa al terminar.",
            ],
          },
        ],
      },
    ],
    faqs: [
      { q: "¿Puedo licenciar una patente que todavía está en trámite?", a: "Sí, es posible, pero es más riesgoso: si la patente no se concede, la licencia pierde su base. Conviene dejar previsto en el contrato qué pasa en ese caso." },
      { q: "¿Cuánto dura una patente en Argentina?", a: "Una patente de invención dura 20 años desde la fecha de solicitud, siempre que se paguen las anualidades." },
      { q: "¿Una patente argentina me protege en otros países?", a: "No. Una patente protege la invención solo en el país que la otorga. Para otros mercados hay que solicitar patentes en cada uno." },
      { q: "¿Qué conviene más, vender o licenciar una patente?", a: "Licenciar te da ingresos a lo largo del tiempo y seguís siendo el titular. Vender te da un pago inmediato, pero perdés la patente. Depende de tus necesidades y del potencial de la invención." },
      { q: "¿Qué pasa con las mejoras que haga el licenciatario sobre mi invención?", a: "Depende de lo que diga el contrato. Conviene definir desde el principio si esas mejoras quedan para quien las desarrolla, si se comparten o si el titular tiene derecho a usarlas." },
      { q: "¿Cómo encuentro empresas interesadas en licenciar mi patente?", a: "Empezá por las que fabrican o venden productos parecidos, las que tienen el problema que tu invención resuelve y las cámaras empresarias de ese sector. Un agente de propiedad industrial también puede orientarte." },
      { q: "¿Puedo publicar una patente en Da Vinci Inventa?", a: "Hoy el catálogo de Da Vinci Inventa no tiene una categoría específica para patentes." },
    ],
    related: [
      COMO_FUNCIONA,
      { href: "/recursos/cuanto-cobrar-por-una-licencia", label: "Cuánto cobrar por una licencia" },
      { href: "/assets", label: "Catálogo de activos intelectuales" },
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
