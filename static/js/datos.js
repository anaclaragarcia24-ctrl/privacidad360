/* PRIVACIDAD 360 — Contenido educativo.
   Todo el contenido es original del proyecto y está basado en recomendaciones generales de
   CISA, NIST SP 800-63B-4, OWASP, INCIBE y UNICEF (ver sección Recursos).
   Las situaciones del simulador y el perfil de demostración son FICTICIOS. */
(function (raiz) {
  'use strict';

  const CATEGORIAS = [
    { id: 'acceso', nombre: 'Contraseñas y acceso', icono: '🔑', descripcion: 'Qué tan difícil es que alguien entre a tus cuentas.' },
    { id: 'configuracion', nombre: 'Configuración de privacidad', icono: '⚙️', descripcion: 'Quién puede ver lo que publicas y encontrarte.' },
    { id: 'compartir', nombre: 'Información que comparto', icono: '📍', descripcion: 'Datos personales que dejas ver sin darte cuenta.' },
    { id: 'mensajes', nombre: 'Mensajes y enlaces', icono: '✉️', descripcion: 'Cómo reaccionas ante mensajes sospechosos o engaños.' },
    { id: 'imagenes', nombre: 'Fotos y consentimiento', icono: '📷', descripcion: 'Cómo cuidas tus imágenes y las de otras personas.' },
    { id: 'respuesta', nombre: 'Respuesta ante incidentes', icono: '🆘', descripcion: 'Qué tan preparado estás si algo sale mal.' }
  ];

  /* Cada opción vale de 0 (hábito de riesgo) a 3 (hábito seguro).
     "rec" es la recomendación que se muestra si la respuesta no obtuvo el puntaje máximo.
     "peso" indica qué tan grave es el riesgo (3 = alto). */
  const PREGUNTAS = [
    // Contraseñas y acceso
    { id: 'p1', cat: 'acceso', peso: 3, texto: '¿Usas la misma contraseña en varias cuentas (redes, correo, juegos)?',
      opciones: [['Sí, casi siempre la misma', 0], ['En algunas cuentas', 1], ['Casi nunca', 2], ['No, cada cuenta tiene una distinta', 3]],
      rec: 'Usa una contraseña diferente en cada cuenta importante. Si una se filtra, las demás siguen protegidas. Empieza por tu correo, porque con él se recuperan las otras cuentas.' },
    { id: 'p2', cat: 'acceso', peso: 3, texto: '¿Cómo suelen ser tus contraseñas?',
      opciones: [['Cortas o con mi nombre, fecha o equipo favorito', 0], ['Una palabra con números al final', 1], ['Más de 12 caracteres combinados', 2], ['Frases largas (15 caracteres o más) difíciles de adivinar', 3]],
      rec: 'Crea frases de contraseña largas (15 caracteres o más) que no incluyan tu nombre, fechas ni datos que otras personas conozcan. La longitud protege más que los símbolos raros.' },
    { id: 'p3', cat: 'acceso', peso: 3, texto: '¿Tienes activada la verificación en dos pasos en tu correo y redes sociales?',
      opciones: [['No sé qué es', 0], ['No la tengo', 0], ['Solo en algunas cuentas', 2], ['Sí, en mis cuentas principales', 3]],
      rec: 'Activa la verificación en dos pasos (2FA) en tu correo, WhatsApp y redes. Aunque alguien sepa tu contraseña, necesitará un segundo código para entrar.' },
    { id: 'p4', cat: 'acceso', peso: 2, texto: '¿Has compartido alguna contraseña con amigos o pareja?',
      opciones: [['Sí, y no la he cambiado', 0], ['Sí, pero después la cambié', 2], ['Solo con mi madre, padre o tutor', 2], ['No, nunca', 3]],
      rec: 'Las contraseñas son personales. Si alguna vez compartiste una, cámbiala hoy. Una relación de confianza no requiere tener acceso a tus cuentas.' },

    // Configuración de privacidad
    { id: 'p5', cat: 'configuracion', peso: 2, texto: '¿Tus redes sociales son públicas o privadas?',
      opciones: [['Todas públicas', 0], ['Algunas públicas', 1], ['Privadas, pero acepto a cualquiera', 1], ['Privadas y solo acepto a quien conozco', 3]],
      rec: 'Pon tus cuentas en modo privado y acepta solo a personas que conoces en la vida real. Revisa tu lista de seguidores de vez en cuando.' },
    { id: 'p6', cat: 'configuracion', peso: 2, texto: '¿Has revisado alguna vez la configuración de privacidad de tus aplicaciones?',
      opciones: [['Nunca', 0], ['Una vez, hace mucho', 1], ['Sí, en el último año', 2], ['Sí, la reviso cada pocos meses', 3]],
      rec: 'Haz la Auditoría manual de PRIVACIDAD 360: revisa quién puede ver tus publicaciones, quién puede escribirte y quién puede encontrarte por tu número.' },
    { id: 'p7', cat: 'configuracion', peso: 2, texto: '¿Qué permisos das a las aplicaciones (ubicación, contactos, micrófono, cámara)?',
      opciones: [['Acepto todo sin leer', 0], ['Acepto casi todo', 1], ['Reviso algunos permisos', 2], ['Solo doy los permisos necesarios', 3]],
      rec: 'Revisa los permisos en los ajustes de tu teléfono. Un juego o una linterna no necesitan tu ubicación, tus contactos ni tu micrófono.' },
    { id: 'p8', cat: 'configuracion', peso: 1, texto: '¿Mantienes actualizado tu teléfono y tus aplicaciones?',
      opciones: [['Nunca actualizo', 0], ['Cuando me obliga', 1], ['Casi siempre', 2], ['Sí, tengo las actualizaciones automáticas', 3]],
      rec: 'Activa las actualizaciones automáticas. Muchas actualizaciones corrigen fallas de seguridad que los atacantes ya conocen.' },

    // Información que comparto
    { id: 'p9', cat: 'compartir', peso: 3, texto: '¿Publicas tu ubicación en tiempo real o dónde estás en ese momento?',
      opciones: [['Sí, frecuentemente', 0], ['A veces', 1], ['Solo después de irme del lugar', 2], ['No, nunca', 3]],
      rec: 'Evita compartir tu ubicación en tiempo real. Si quieres publicar una foto de un lugar, hazlo después de haberte ido. Desactiva la ubicación en las publicaciones.' },
    { id: 'p10', cat: 'compartir', peso: 2, texto: '¿Tu perfil muestra tu escuela, grupo, colonia o número de teléfono?',
      opciones: [['Sí, varios de esos datos', 0], ['Uno o dos', 1], ['Solo mi nombre', 2], ['Ninguno, uso un perfil discreto', 3]],
      rec: 'Quita de tu perfil el nombre de tu escuela, tu grupo, tu colonia y tu número. Juntos permiten saber dónde encontrarte.' },
    { id: 'p11', cat: 'compartir', peso: 2, texto: '¿Respondes encuestas, retos o juegos que piden datos personales (fecha de nacimiento, nombre de tu mascota, etc.)?',
      opciones: [['Sí, me parecen divertidos', 0], ['A veces', 1], ['Rara vez', 2], ['No', 3]],
      rec: 'Muchos "retos" piden las mismas respuestas que se usan para recuperar cuentas (mascota, calle, fecha). Evita responderlos en público.' },
    { id: 'p12', cat: 'compartir', peso: 2, texto: '¿Aceptas solicitudes de amistad o seguimiento de personas que no conoces?',
      opciones: [['Sí, de cualquiera', 0], ['Si tenemos amigos en común', 1], ['Rara vez', 2], ['No, solo personas que conozco', 3]],
      rec: 'Tener amigos en común no significa que una persona sea quien dice ser. Acepta solo a quienes conoces en persona.' },

    // Mensajes y enlaces
    { id: 'p13', cat: 'mensajes', peso: 3, texto: 'Te llega un mensaje: "Ganaste un celular, entra a este enlace y escribe tus datos". ¿Qué haces?',
      opciones: [['Entro al enlace para ver', 0], ['Pregunto a la persona que lo envió', 2], ['Lo ignoro', 2], ['No abro el enlace, lo reporto y lo borro', 3]],
      rec: 'Los premios que no pediste y los mensajes urgentes suelen ser engaños (phishing). No abras el enlace; repórtalo y bórralo.' },
    { id: 'p14', cat: 'mensajes', peso: 3, texto: '¿Alguna vez has compartido un código de verificación que te llegó por SMS o WhatsApp?',
      opciones: [['Sí, me lo pidieron y lo di', 0], ['No estoy seguro', 1], ['Me lo han pedido pero no lo di', 3], ['Nunca me lo han pedido', 3]],
      rec: 'Nunca compartas un código de verificación, aunque lo pida un amigo. Con ese código pueden robar tu cuenta de WhatsApp o de redes.' },
    { id: 'p15', cat: 'mensajes', peso: 2, texto: '¿Revisas la dirección de una página antes de escribir tu usuario y contraseña?',
      opciones: [['Nunca', 0], ['A veces', 1], ['Casi siempre', 2], ['Siempre, y entro desde la app oficial', 3]],
      rec: 'Antes de iniciar sesión revisa que la dirección sea la oficial. Lo más seguro es entrar desde la aplicación oficial o escribiendo tú mismo la dirección.' },
    { id: 'p16', cat: 'mensajes', peso: 2, texto: '¿Descargas aplicaciones o archivos fuera de las tiendas oficiales (APK, "versiones gratis")?',
      opciones: [['Sí, seguido', 0], ['A veces', 1], ['Casi nunca', 2], ['Nunca', 3]],
      rec: 'Descarga aplicaciones solo de las tiendas oficiales. Las "versiones gratis" de apps de pago suelen traer programas que roban datos.' },

    // Fotos y consentimiento
    { id: 'p17', cat: 'imagenes', peso: 3, texto: '¿Has enviado fotos tuyas que no querrías que vieran otras personas?',
      opciones: [['Sí, varias veces', 0], ['Una vez', 1], ['Prefiero no responder', 2], ['No', 3]],
      rec: 'Una vez que envías una foto pierdes el control sobre ella. Si alguien te presiona para enviar fotos íntimas, es una señal de alerta: no estás obligado a hacerlo y puedes pedir ayuda.' },
    { id: 'p18', cat: 'imagenes', peso: 3, texto: '¿Pides permiso antes de publicar fotos o videos donde aparecen otras personas?',
      opciones: [['Nunca', 0], ['A veces', 1], ['Casi siempre', 2], ['Siempre', 3]],
      rec: 'Pide permiso antes de publicar fotos de otras personas. Publicar o reenviar imágenes sin consentimiento puede causar daño y, en algunos casos, es un delito.' },
    { id: 'p19', cat: 'imagenes', peso: 2, texto: 'Si recibes una foto comprometedora de un compañero o compañera, ¿qué haces?',
      opciones: [['La reenvío', 0], ['La guardo', 1], ['La borro', 2], ['No la reenvío, la borro y aviso a un adulto de confianza', 3]],
      rec: 'Si recibes una imagen íntima o humillante de alguien, no la reenvíes. Bórrala y avisa a un adulto de confianza. Reenviarla también causa daño.' },
    { id: 'p20', cat: 'imagenes', peso: 1, texto: '¿Revisas qué se ve en el fondo de tus fotos (uniforme, dirección, placas, documentos)?',
      opciones: [['Nunca', 0], ['A veces', 1], ['Casi siempre', 2], ['Siempre', 3]],
      rec: 'Antes de publicar, revisa el fondo de la foto: uniformes, números de casa, placas o documentos pueden revelar dónde vives o estudias.' },

    // Respuesta ante incidentes
    { id: 'p21', cat: 'respuesta', peso: 2, texto: '¿Sabes qué hacer si te roban una cuenta?',
      opciones: [['No tengo idea', 0], ['Más o menos', 1], ['Sí, sé recuperar algunas cuentas', 2], ['Sí, y tengo mis datos de recuperación actualizados', 3]],
      rec: 'Revisa la Guía de emergencia "Me robaron una cuenta" y actualiza hoy tu correo y teléfono de recuperación en tus cuentas principales.' },
    { id: 'p22', cat: 'respuesta', peso: 2, texto: 'Si alguien te acosa o amenaza en internet, ¿a quién se lo dirías?',
      opciones: [['A nadie', 0], ['Solo a mis amigos', 1], ['A un familiar', 2], ['A un adulto de confianza o a la escuela, y guardaría evidencias', 3]],
      rec: 'No enfrentes el acoso en solitario. Habla con un adulto de confianza, guarda capturas de pantalla como evidencia, bloquea y reporta a la persona.' },
    { id: 'p23', cat: 'respuesta', peso: 1, texto: '¿Sabes cómo reportar o bloquear una cuenta en tus redes sociales?',
      opciones: [['No', 0], ['Creo que sí', 1], ['Sí, en algunas', 2], ['Sí, en todas las que uso', 3]],
      rec: 'Aprende a reportar y bloquear en cada red que usas. Normalmente está en los tres puntos (⋯) del perfil o de la publicación.' },
    { id: 'p24', cat: 'respuesta', peso: 1, texto: '¿Cierras sesión cuando usas una computadora o celular que no es tuyo?',
      opciones: [['Nunca', 0], ['A veces', 1], ['Casi siempre', 2], ['Siempre', 3]],
      rec: 'Cierra sesión siempre en equipos prestados o de la escuela, y no aceptes "recordar contraseña" en ellos.' }
  ];

  /* Acciones del plan de 7 días por categoría (se eligen las categorías con menor puntaje). */
  const ACCIONES_PLAN = {
    acceso: ['Activa la verificación en dos pasos en tu correo electrónico.', 'Cambia la contraseña que más repites por una frase larga y única.', 'Activa la verificación en dos pasos en WhatsApp.'],
    configuracion: ['Pon tu red social principal en modo privado.', 'Revisa los permisos de ubicación y micrófono de tus apps.', 'Activa las actualizaciones automáticas del teléfono.'],
    compartir: ['Quita de tu perfil tu escuela, colonia o número de teléfono.', 'Desactiva la ubicación en tus publicaciones.', 'Revisa tu lista de seguidores y elimina a quien no conozcas.'],
    mensajes: ['Completa 5 situaciones del simulador sobre mensajes sospechosos.', 'Aprende a reportar un mensaje sospechoso en WhatsApp.', 'Repasa el módulo "Mensajes engañosos" de la Academia.'],
    imagenes: ['Revisa tus últimas 10 publicaciones: ¿aparecen datos en el fondo?', 'Repasa el módulo "Imágenes y consentimiento".', 'Platica con alguien de confianza sobre qué hacer si una foto se difunde sin permiso.'],
    respuesta: ['Actualiza tu correo y teléfono de recuperación.', 'Lee la Guía de emergencia "Me robaron una cuenta".', 'Anota a qué adulto de confianza acudirías ante un problema digital.']
  };

  /* Auditoría manual: el usuario revisa su propio teléfono; la plataforma NUNCA se conecta a sus cuentas. */
  const AUDITORIA = [
    { id: 'whatsapp', nombre: 'WhatsApp', items: [
      'Activé la verificación en dos pasos (PIN de 6 dígitos).',
      'Mi foto de perfil y "info" solo las ven mis contactos.',
      'Revisé quién puede agregarme a grupos.',
      'Desactivé la vista previa de mensajes en la pantalla bloqueada (opcional).',
      'Revisé los dispositivos vinculados y cerré los que no reconozco.'] },
    { id: 'instagram', nombre: 'Instagram', items: [
      'Mi cuenta es privada.',
      'Activé la autenticación en dos pasos.',
      'Revisé quién puede enviarme mensajes y mencionarme.',
      'Revisé la actividad de inicio de sesión y cerré sesiones desconocidas.',
      'Mi perfil no muestra escuela, teléfono ni ubicación.'] },
    { id: 'tiktok', nombre: 'TikTok', items: [
      'Mi cuenta es privada.',
      'Revisé quién puede comentar, hacer dúo o descargar mis videos.',
      'Desactivé la sugerencia de mi cuenta a mis contactos.',
      'Activé la verificación en dos pasos.'] },
    { id: 'facebook', nombre: 'Facebook', items: [
      'Revisé quién puede ver mis publicaciones futuras.',
      'Revisé quién puede buscarme con mi correo o número.',
      'Activé la autenticación en dos pasos.',
      'Revisé las aplicaciones conectadas a mi cuenta.'] },
    { id: 'google', nombre: 'Correo (Google u otro)', items: [
      'Mi correo tiene una contraseña única y larga.',
      'Activé la verificación en dos pasos.',
      'Mi teléfono y correo de recuperación están actualizados.',
      'Revisé los dispositivos con sesión abierta.'] },
    { id: 'telefono', nombre: 'Mi teléfono', items: [
      'Tengo bloqueo de pantalla (PIN, patrón o huella).',
      'Las actualizaciones automáticas están activadas.',
      'Revisé qué apps tienen permiso de ubicación.',
      'Solo instalo apps desde la tienda oficial.'] }
  ];

  /* Simulador: 12 situaciones FICTICIAS. "ok" marca la opción más segura. */
  const ESCENARIOS = [
    { id: 's1', tema: 'mensajes', titulo: 'El premio inesperado', canal: 'SMS', remitente: '+52 55 0000 0000 (número desconocido)',
      mensaje: '¡FELICIDADES! Tu número ganó un celular nuevo. Reclámalo en las próximas 2 horas: premio-celular-gratis.example',
      opciones: ['Entro rápido antes de que se acabe el tiempo', 'Respondo pidiendo más información', 'No abro el enlace, bloqueo el número y borro el mensaje'], ok: 2,
      explicacion: 'Premios que no pediste + urgencia + enlace raro = señales típicas de phishing. Responder también confirma que tu número está activo.' },
    { id: 's2', tema: 'mensajes', titulo: 'El "amigo" que pide un código', canal: 'WhatsApp', remitente: 'Contacto: "Primo Luis" (nombre ficticio)',
      mensaje: 'Oye, te llegó un código de 6 dígitos por error, era para mí. ¿Me lo pasas porfa? Es urgente 🙏',
      opciones: ['Se lo paso, es mi primo', 'No lo comparto y llamo a mi primo por otro medio para confirmar', 'Le reenvío una captura del mensaje'], ok: 1,
      explicacion: 'Ese código sirve para registrar TU WhatsApp en otro teléfono. Las cuentas robadas se usan para pedir códigos a sus contactos. Confirma por otro medio.' },
    { id: 's3', tema: 'compartir', titulo: 'Historia en vivo', canal: 'Instagram', remitente: 'Tú',
      mensaje: 'Estás por subir una historia: "Sola en casa toda la tarde 😎" con la ubicación de tu colonia activada.',
      opciones: ['La subo así', 'Quito la ubicación y no digo que estoy sola o solo', 'La subo solo a "mejores amigos" con ubicación'], ok: 1,
      explicacion: 'Decir que estás solo/a y dónde estás da información útil a personas con malas intenciones. Si quieres compartir algo, hazlo sin ubicación y después.' },
    { id: 's4', tema: 'imagenes', titulo: 'La foto que circula', canal: 'Grupo de WhatsApp del salón', remitente: 'Grupo "3°B" (ficticio)',
      mensaje: 'Alguien envió al grupo una foto vergonzosa de un compañero tomada sin que él se diera cuenta. Todos están reaccionando con risas.',
      opciones: ['La reenvío a otro grupo', 'No la reenvío, pido que la borren y aviso a un docente o tutor', 'Solo reacciono con un emoji'], ok: 1,
      explicacion: 'Reenviar o celebrar la foto aumenta el daño. Lo correcto es no participar, pedir que se borre y avisar a un adulto responsable.' },
    { id: 's5', tema: 'acceso', titulo: 'Contraseña para el nuevo juego', canal: 'Registro en un juego', remitente: 'Tú',
      mensaje: 'Te registras en un juego en línea y te pide crear una contraseña.',
      opciones: ['Uso la misma de mi correo para no olvidarla', 'Uso mi nombre y año de nacimiento', 'Creo una frase larga y distinta, y la guardo en un gestor de contraseñas'], ok: 2,
      explicacion: 'Si el juego sufre una filtración y tu contraseña es la misma que la del correo, pueden entrar a todas tus cuentas. Una frase larga y única es lo más seguro.' },
    { id: 's6', tema: 'mensajes', titulo: 'Correo de "soporte"', canal: 'Correo electrónico', remitente: 'soporte-seguridad@cuenta-verificacion.example',
      mensaje: 'Detectamos actividad inusual. Tu cuenta será eliminada en 24 horas si no confirmas tu contraseña aquí.',
      opciones: ['Escribo mi contraseña en el enlace', 'Ignoro el correo y reviso mi cuenta entrando desde la app oficial', 'Respondo el correo preguntando si es real'], ok: 1,
      explicacion: 'Las plataformas reales no piden tu contraseña por correo. Si te preocupa tu cuenta, entra tú mismo desde la app oficial y revisa la actividad.' },
    { id: 's7', tema: 'compartir', titulo: 'La solicitud desconocida', canal: 'Red social', remitente: 'Perfil nuevo con 3 fotos y 12 amigos en común (ficticio)',
      mensaje: 'Una persona que no conoces te escribe: "Te vi en la prepa, eres muy linda/o. ¿Me pasas tu número?"',
      opciones: ['Le paso mi número, tenemos amigos en común', 'No comparto mi número, no acepto la solicitud y si insiste lo bloqueo y reporto', 'Le pregunto en qué grupo está'], ok: 1,
      explicacion: 'Perfiles nuevos, pocos datos y halagos rápidos pueden ser suplantaciones o intentos de acercamiento con malas intenciones.' },
    { id: 's8', tema: 'imagenes', titulo: 'La presión por una foto', canal: 'Mensaje privado', remitente: 'Persona con la que platicas hace dos semanas (ficticia)',
      mensaje: 'Si de verdad confías en mí, mándame una foto íntima. Nadie más la verá, lo prometo.',
      opciones: ['La envío para no perder la relación', 'No la envío, corto la conversación y hablo con un adulto de confianza', 'Envío una foto de alguien más'], ok: 1,
      explicacion: 'La presión para enviar fotos íntimas es una señal de alerta (puede ser grooming o sextorsión). No estás obligado/a, y pedir ayuda no es tu culpa.' },
    { id: 's9', tema: 'respuesta', titulo: 'Cuenta suplantada', canal: 'Instagram', remitente: 'Un amigo te avisa',
      mensaje: 'Alguien creó una cuenta con tus fotos y tu nombre y está pidiendo dinero a tus seguidores.',
      opciones: ['Le escribo insultos a la cuenta falsa', 'Guardo capturas, reporto la cuenta por suplantación, aviso a mis contactos y a un adulto', 'No hago nada, se borrará sola'], ok: 1,
      explicacion: 'Guarda evidencias, usa la opción de reporte por suplantación de identidad y avisa a tus contactos para que no caigan en el engaño.' },
    { id: 's10', tema: 'configuracion', titulo: 'La linterna curiosa', canal: 'Instalación de app', remitente: 'App "Linterna Super" (ficticia)',
      mensaje: 'Al instalar una app de linterna te pide permiso para: contactos, ubicación, micrófono y mensajes.',
      opciones: ['Acepto todo, así funciona', 'Rechazo los permisos innecesarios o busco otra app', 'Acepto solo la ubicación'], ok: 1,
      explicacion: 'Una linterna no necesita tus contactos ni tus mensajes. Pedir permisos de más es señal de que la app recopila datos.' },
    { id: 's11', tema: 'acceso', titulo: 'Computadora de la biblioteca', canal: 'Equipo compartido', remitente: 'Tú',
      mensaje: 'Terminaste de usar tu correo en la computadora de la biblioteca escolar. El navegador pregunta: "¿Guardar contraseña?"',
      opciones: ['Acepto para entrar más rápido la próxima vez', 'Rechazo y cierro sesión antes de irme', 'Solo cierro la pestaña'], ok: 1,
      explicacion: 'Cerrar la pestaña no cierra la sesión. En equipos compartidos rechaza guardar contraseñas y cierra sesión siempre.' },
    { id: 's12', tema: 'respuesta', titulo: 'No puedo entrar a mi cuenta', canal: 'Red social', remitente: 'Tú',
      mensaje: 'Intentas entrar a tu cuenta y la contraseña ya no funciona. Te llegó un correo de "cambio de correo electrónico" que no hiciste.',
      opciones: ['Creo una cuenta nueva y olvido la anterior', 'Uso el enlace oficial de recuperación, cambio contraseñas y aviso a mis contactos', 'Le pido a un desconocido que "hackee" la cuenta para recuperarla'], ok: 1,
      explicacion: 'Sigue el proceso oficial de recuperación de la plataforma. Nunca pagues ni des datos a supuestos "recuperadores" de cuentas: suelen ser otro fraude.' }
  ];

  /* Academia: 6 módulos con lección breve y cuestionario de 3 preguntas. */
  const MODULOS = [
    { id: 'm1', titulo: 'Contraseñas que sí protegen', icono: '🔑', puntos: [
      'La longitud es lo más importante: una frase de 15 caracteres o más es más difícil de adivinar que una palabra corta con símbolos.',
      'Usa una contraseña distinta para cada cuenta importante; empieza por tu correo.',
      'Un gestor de contraseñas puede recordarlas por ti.',
      'La verificación en dos pasos agrega un segundo candado aunque roben tu contraseña.'],
      quiz: [
        { p: '¿Qué hace más fuerte a una contraseña?', o: ['Que tenga un símbolo', 'Que sea larga y única', 'Que tenga tu fecha de nacimiento'], c: 1 },
        { p: '¿Por qué no conviene repetir contraseñas?', o: ['Porque se olvidan', 'Porque si una se filtra, abren todas tus cuentas', 'No pasa nada'], c: 1 },
        { p: 'La verificación en dos pasos…', o: ['Pide un segundo código para entrar', 'Borra tu cuenta', 'Hace tu contraseña más corta'], c: 0 }] },
    { id: 'm2', titulo: 'Mensajes engañosos (phishing)', icono: '🎣', puntos: [
      'Desconfía de mensajes con urgencia, premios o amenazas.',
      'Revisa el remitente y la dirección del enlace antes de abrirlo.',
      'Ninguna plataforma seria te pedirá tu contraseña o un código por mensaje.',
      'Repórtalo y bórralo. Si ya diste datos, cambia tu contraseña de inmediato.'],
      quiz: [
        { p: 'Un mensaje dice que tu cuenta se cerrará en 1 hora si no das tu contraseña. Es…', o: ['Un aviso oficial', 'Probablemente phishing', 'Un error del sistema'], c: 1 },
        { p: '¿Qué debes hacer con un código de verificación que alguien te pide?', o: ['Compartirlo si es un amigo', 'No compartirlo nunca', 'Publicarlo'], c: 1 },
        { p: '¿Cuál es la forma más segura de revisar tu cuenta?', o: ['Desde el enlace del mensaje', 'Entrando desde la app oficial', 'Respondiendo el correo'], c: 1 }] },
    { id: 'm3', titulo: 'Tu huella digital', icono: '👣', puntos: [
      'Lo que publicas puede quedarse en internet aunque lo borres.',
      'Varios datos sueltos (escuela, colonia, horario) juntos revelan dónde encontrarte.',
      'Publica tu ubicación después de irte, no en tiempo real.',
      'Antes de publicar pregúntate: ¿me molestaría que lo viera alguien desconocido dentro de 5 años?'],
      quiz: [
        { p: '¿Qué combinación de datos es más riesgosa?', o: ['Tu color favorito', 'Escuela + colonia + horario', 'Tu película favorita'], c: 1 },
        { p: '¿Cuándo es mejor publicar la foto de un lugar?', o: ['En el momento', 'Después de irte', 'Nunca se puede'], c: 1 },
        { p: 'Si borras una publicación…', o: ['Desaparece para siempre', 'Pudo haber sido guardada o capturada antes', 'Se borra de todos los teléfonos'], c: 1 }] },
    { id: 'm4', titulo: 'Imágenes y consentimiento', icono: '📷', puntos: [
      'Pide permiso antes de publicar fotos de otras personas.',
      'Nadie debe presionarte para enviar fotos íntimas; eso es una señal de alerta.',
      'Si recibes una imagen íntima de otra persona, no la reenvíes y avisa a un adulto de confianza.',
      'En México, difundir imágenes íntimas sin consentimiento puede ser delito (conocido como "Ley Olimpia").'],
      quiz: [
        { p: 'Antes de publicar una foto grupal debes…', o: ['Publicarla y ya', 'Pedir permiso a quienes aparecen', 'Ponerle filtro'], c: 1 },
        { p: 'Si te presionan para enviar una foto íntima…', o: ['Es normal en una relación', 'Es una señal de alerta y puedes pedir ayuda', 'Debes enviarla'], c: 1 },
        { p: 'Reenviar una foto íntima de otra persona…', o: ['No tiene consecuencias', 'Causa daño y puede ser delito', 'Está bien si es de broma'], c: 1 }] },
    { id: 'm5', titulo: 'Configuración y permisos', icono: '⚙️', puntos: [
      'Una cuenta privada limita quién ve tus publicaciones.',
      'Revisa quién puede escribirte, etiquetarte o encontrarte por tu número.',
      'Las apps solo deben tener los permisos que necesitan.',
      'Las actualizaciones corrigen fallas de seguridad: actívalas.'],
      quiz: [
        { p: '¿Qué permiso NO necesita una app de calculadora?', o: ['Ninguno especial', 'Tus contactos', 'Pantalla'], c: 1 },
        { p: '¿Para qué sirven las actualizaciones?', o: ['Solo para cambiar colores', 'Corrigen fallas de seguridad', 'Gastan datos sin razón'], c: 1 },
        { p: 'Una cuenta privada…', o: ['Muestra todo a todos', 'Limita quién ve lo que publicas', 'No permite publicar'], c: 1 }] },
    { id: 'm6', titulo: 'Qué hacer si algo sale mal', icono: '🆘', puntos: [
      'No es tu culpa: pide ayuda a un adulto de confianza o a la escuela.',
      'Guarda evidencias (capturas con fecha y nombre de usuario) antes de bloquear.',
      'Usa las opciones oficiales de reporte y recuperación de cada plataforma.',
      'Si hay amenazas, extorsión o difusión de imágenes íntimas, se puede denunciar ante las autoridades.'],
      quiz: [
        { p: 'Antes de bloquear a quien te acosa conviene…', o: ['Borrar todo', 'Guardar capturas como evidencia', 'Responder con insultos'], c: 1 },
        { p: 'Si te roban una cuenta, lo primero es…', o: ['Usar el proceso oficial de recuperación', 'Pagar a un "hacker"', 'Crear otra cuenta'], c: 0 },
        { p: '¿A quién acudir si algo te preocupa en internet?', o: ['A nadie', 'A un adulto de confianza o a la escuela', 'Solo a desconocidos en línea'], c: 1 }] }
  ];

  /* Evaluación de conocimientos: dos formas equivalentes (antes = A, después = B).
     Cada par de preguntas mide el mismo tema con diferente redacción. */
  const EVALUACION = {
    antes: [
      { tema: 'contraseñas', p: '¿Cuál es la contraseña más segura?', o: ['Maria2009', 'gato123!', 'mi-bici-azul-sube-al-cerro-lento', 'qwerty'], c: 2 },
      { tema: 'verificación en dos pasos', p: '¿Qué es la verificación en dos pasos?', o: ['Escribir la contraseña dos veces', 'Un segundo código o confirmación además de la contraseña', 'Tener dos cuentas'], c: 1 },
      { tema: 'phishing', p: 'Un mensaje dice: "Tu banco bloqueó tu tarjeta, entra aquí". ¿Qué es lo más probable?', o: ['Un aviso real', 'Un intento de engaño (phishing)', 'Un error'], c: 1 },
      { tema: 'códigos de verificación', p: 'Un contacto te pide el código de 6 dígitos que te llegó por SMS.', o: ['Se lo das', 'No lo compartes', 'Lo publicas en estados'], c: 1 },
      { tema: 'ubicación', p: '¿Cuándo es más seguro compartir dónde estuviste?', o: ['En tiempo real', 'Después de haberte ido', 'Siempre con la ubicación exacta'], c: 1 },
      { tema: 'permisos', p: 'Un juego pide acceso a tus contactos y micrófono. Lo correcto es…', o: ['Aceptar todo', 'Negar los permisos que no necesita', 'Desinstalar el teléfono'], c: 1 },
      { tema: 'consentimiento', p: 'Para publicar una foto donde sale tu amiga debes…', o: ['Pedirle permiso', 'Etiquetarla', 'Publicarla sin decir nada'], c: 0 },
      { tema: 'imágenes de otras personas', p: 'Te llega una foto íntima de un compañero. ¿Qué haces?', o: ['La reenvío', 'No la reenvío, la borro y aviso a un adulto', 'La guardo por si acaso'], c: 1 },
      { tema: 'evidencias', p: 'Si alguien te acosa, antes de bloquearle conviene…', o: ['Guardar capturas como evidencia', 'Borrar la conversación', 'Responder igual'], c: 0 },
      { tema: 'recuperación de cuentas', p: 'Si te roban una cuenta, ¿qué NO debes hacer?', o: ['Usar la recuperación oficial', 'Avisar a tus contactos', 'Pagarle a alguien que promete recuperarla'], c: 2 }
    ],
    despues: [
      { tema: 'contraseñas', p: '¿Qué contraseña sería más difícil de adivinar?', o: ['Juan2008', 'futbol!', 'tres-tacos-de-luna-en-la-azotea', '123456'], c: 2 },
      { tema: 'verificación en dos pasos', p: 'La verificación en dos pasos sirve para…', o: ['Pedir un segundo dato además de la contraseña', 'Recordar la contraseña', 'Cambiar de usuario'], c: 0 },
      { tema: 'phishing', p: 'Un correo dice: "Tu cuenta será eliminada hoy, confirma tu contraseña". Es probablemente…', o: ['Un aviso oficial', 'Phishing', 'Publicidad normal'], c: 1 },
      { tema: 'códigos de verificación', p: 'Te escriben: "te llegó un código por error, pásamelo". Lo correcto es…', o: ['Compartirlo', 'No compartirlo y confirmar por otro medio', 'Enviar una captura'], c: 1 },
      { tema: 'ubicación', p: 'Publicar "estoy sola/o en casa" con tu ubicación es…', o: ['Seguro', 'Riesgoso', 'Obligatorio'], c: 1 },
      { tema: 'permisos', p: 'Una app de linterna pide tus mensajes. Debes…', o: ['Aceptar', 'Negar el permiso o buscar otra app', 'Compartir la app'], c: 1 },
      { tema: 'consentimiento', p: 'Antes de subir un video donde salen tus compañeros…', o: ['Les pides permiso', 'Lo subes y ya', 'Solo lo subes a historias'], c: 0 },
      { tema: 'imágenes de otras personas', p: 'En el grupo circula una foto humillante de alguien. Lo correcto es…', o: ['Reaccionar con risa', 'No reenviar, pedir que la borren y avisar a un adulto', 'Guardarla'], c: 1 },
      { tema: 'evidencias', p: '¿Qué sirve como evidencia de acoso digital?', o: ['Capturas con fecha y nombre de usuario', 'Nada, se borra solo', 'Solo lo que recuerdes'], c: 0 },
      { tema: 'recuperación de cuentas', p: 'Para recuperar una cuenta robada lo más seguro es…', o: ['El proceso oficial de la plataforma', 'Un "hacker" de redes', 'Crear otra cuenta y olvidarla'], c: 0 }
    ]
  };

  const EMERGENCIAS = [
    { id: 'robo', titulo: 'Me robaron una cuenta', icono: '🔓', pasos: [
      'Intenta entrar y usa la opción oficial "¿Olvidaste tu contraseña?" o "Necesito ayuda para iniciar sesión" de la plataforma.',
      'Revisa tu correo: si recibiste un aviso de "cambio de correo" o "cambio de contraseña", muchas plataformas incluyen un enlace para revertirlo.',
      'Cuando recuperes la cuenta: cambia la contraseña por una frase larga y única, y activa la verificación en dos pasos.',
      'Cierra las sesiones abiertas en dispositivos que no reconozcas.',
      'Si usabas la misma contraseña en otras cuentas, cámbiala también ahí, empezando por tu correo.',
      'Avisa a tus contactos que no respondan mensajes enviados desde tu cuenta mientras no la recuperes.',
      'No pagues ni des datos a personas que prometen recuperar cuentas: suele ser otro fraude.'] },
    { id: 'suplantacion', titulo: 'Alguien se hace pasar por mí', icono: '🎭', pasos: [
      'No respondas con insultos ni amenazas a la cuenta falsa.',
      'Guarda evidencias: capturas del perfil, del nombre de usuario, de la dirección del perfil y de los mensajes, con fecha.',
      'Reporta la cuenta usando la opción de suplantación de identidad (en el menú ⋯ del perfil).',
      'Pide a tus amigos y familiares que también la reporten y que no envíen dinero ni datos.',
      'Avisa a un adulto de confianza. Si piden dinero en tu nombre o hay amenazas, se puede denunciar.'] },
    { id: 'fotos', titulo: 'Difundieron una foto mía sin permiso', icono: '🖼️', pasos: [
      'Recuerda: no es tu culpa. Quien difunde sin permiso es responsable.',
      'Habla con un adulto de confianza o con orientación educativa de tu escuela.',
      'Guarda evidencias (capturas de dónde se publicó y quién lo compartió) sin reenviar la imagen.',
      'Reporta la publicación en la plataforma: la mayoría tiene opciones para contenido íntimo o publicado sin consentimiento.',
      'Si la imagen es íntima, en México la difusión sin consentimiento puede denunciarse (reformas conocidas como "Ley Olimpia"). Un adulto puede acompañarte ante la Fiscalía de tu estado.',
      'Si alguien te amenaza con publicar fotos a cambio de dinero o más fotos (sextorsión): no pagues, no envíes nada más, guarda evidencias y pide ayuda de inmediato.'] },
    { id: 'acoso', titulo: 'Me están acosando o amenazando', icono: '⚠️', pasos: [
      'No respondas a las provocaciones.',
      'Guarda evidencias antes de bloquear: capturas con fecha, nombre de usuario y mensajes.',
      'Bloquea y reporta a la persona en la plataforma.',
      'Cuéntalo a un adulto de confianza o a la escuela.',
      'Si hay amenazas contra tu seguridad, llama al 911 (emergencias en México).'] }
  ];

  /* Recursos verificados por el equipo de desarrollo (consulta: 27/10/2026). */
  const RECURSOS = [
    { titulo: 'Secure Our World / Cybersecurity Awareness Month', org: 'CISA (Estados Unidos)', url: 'https://www.cisa.gov/secure-our-world', tema: 'Cuatro hábitos básicos: phishing, contraseñas fuertes, MFA/gestor y actualizaciones.' },
    { titulo: 'NIST SP 800-63B-4: Digital Identity Guidelines — Authentication', org: 'NIST (Estados Unidos)', url: 'https://pages.nist.gov/800-63-4/sp800-63b.html', tema: 'Reglas técnicas sobre contraseñas: longitud mínima, sin reglas de composición, listas de bloqueo.' },
    { titulo: 'Authentication Cheat Sheet', org: 'OWASP', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html', tema: 'Buenas prácticas de autenticación para desarrolladores.' },
    { titulo: 'Menores — Internet Segura for Kids (IS4K)', org: 'INCIBE (España)', url: 'https://www.incibe.es/menores', tema: 'Materiales de ciberseguridad para adolescentes, familias y docentes.' },
    { titulo: 'Cyberbullying: What is it and how to stop it', org: 'UNICEF', url: 'https://www.unicef.org/end-violence/how-to-stop-cyberbullying', tema: 'Qué es el ciberacoso y cómo actuar.' },
    { titulo: 'Secretaría Anticorrupción y Buen Gobierno', org: 'Gobierno de México', url: 'https://www.gob.mx/buengobierno', tema: 'Autoridad que asumió la protección de datos personales tras la extinción del INAI (2025).' },
    { titulo: 'Sugerencias para completar los pasos de recuperación de la cuenta', org: 'Ayuda de Cuenta de Google', url: 'https://support.google.com/accounts/answer/7299973?hl=es-419', tema: 'Recuperar una cuenta de Google.' },
    { titulo: 'Cómo administrar los ajustes de la verificación en dos pasos', org: 'Servicio de ayuda de WhatsApp', url: 'https://faq.whatsapp.com/1920866721452534', tema: 'Activar el PIN de verificación en dos pasos de WhatsApp.' }
  ];

  /* Perfil FICTICIO para el modo de demostración. No corresponde a ninguna persona real. */
  const PERFIL_DEMO = {
    nombre: 'Estudiante Demo (perfil ficticio)',
    respuestas: { p1: 0, p2: 1, p3: 1, p4: 0, p5: 1, p6: 0, p7: 1, p8: 2, p9: 1, p10: 0, p11: 1, p12: 1, p13: 1, p14: 2, p15: 1, p16: 2, p17: 3, p18: 1, p19: 2, p20: 1, p21: 0, p22: 1, p23: 2, p24: 1 }
  };

  /* ---------- Gamificación ---------- */
  const NIVELES = [
    { n: 1, nombre: 'Aprendiz digital', icono: '🌱', min: 0 },
    { n: 2, nombre: 'Detective de datos', icono: '🔍', min: 150 },
    { n: 3, nombre: 'Escudo activo', icono: '🛡️', min: 350 },
    { n: 4, nombre: 'Agente 360', icono: '⚡', min: 600 },
    { n: 5, nombre: 'Leyenda de la privacidad', icono: '👑', min: 900 }
  ];

  /* Las condiciones de cada insignia están en logica.js (calcularLogros). */
  const INSIGNIAS = [
    { id: 'primer-escaneo', nombre: 'Primer escaneo', icono: '🧭', descripcion: 'Completa tu primer diagnóstico.' },
    { id: 'segunda-vuelta', nombre: 'Segunda vuelta', icono: '🔁', descripcion: 'Repite el diagnóstico para medir tu avance.' },
    { id: 'candado-acero', nombre: 'Candado de acero', icono: '🔐', descripcion: 'Prueba en el verificador una contraseña de ejemplo fuerte.' },
    { id: 'detector', nombre: 'Detector de engaños', icono: '🕵️', descripcion: 'Toma 5 decisiones seguras en el simulador.' },
    { id: 'cazaphishing', nombre: 'Cazaphishing', icono: '🎣', descripcion: 'Resuelve las 12 situaciones del simulador sin errores.' },
    { id: 'revision', nombre: 'Revisión a fondo', icono: '✅', descripcion: 'Completa la mitad de la auditoría manual.' },
    { id: 'racha-3', nombre: 'Racha de 3', icono: '🔥', descripcion: 'Completa 3 días de tu plan.' },
    { id: 'plan-completo', nombre: 'Plan completo', icono: '🏁', descripcion: 'Completa los 7 días de tu plan.' },
    { id: 'mente-360', nombre: 'Mente 360', icono: '🎓', descripcion: 'Termina los 6 módulos de la Academia.' },
    { id: 'aprendizaje', nombre: 'Aprendizaje comprobado', icono: '📈', descripcion: 'Saca más en la evaluación final que en la inicial.' },
    { id: 'emergencias', nombre: 'Lista para emergencias', icono: '🆘', descripcion: 'Abre las 4 guías de emergencia.' },
    { id: 'detective-mirador', nombre: 'Detective del Mirador', icono: '🕵️', descripcion: 'Resuelve 3 casos de Detectives.' },
    { id: 'caza-rumores', nombre: 'Caza rumores', icono: '🚩', descripcion: 'Resuelve un caso perfecto, sin creerle a ningún rumor.' },
    { id: 'competidor', nombre: 'A la arena', icono: '🏟️', descripcion: 'Termina una partida en una sala multijugador.' },
    { id: 'podio', nombre: 'En el podio', icono: '🥇', descripcion: 'Queda entre los 3 primeros de una sala.' },
    { id: 'escapista', nombre: 'Escapista digital', icono: '🗝️', descripcion: 'Escapa de las 3 salas.' },
    { id: 'muro-digital', nombre: 'Muro digital', icono: '🛡️', descripcion: 'Consigue 800 puntos en Cortafuegos.' },
    { id: 'buen-vecino', nombre: 'Buen compañero', icono: '🏫', descripcion: 'Ayuda a todos en el Colegio Mirador.' },
    { id: 'en-equipo', nombre: 'En equipo', icono: '🤝', descripcion: 'Termina un Relevo por equipos.' },
    { id: 'coleccionista', nombre: 'Coleccionista', icono: '🛍️', descripcion: 'Compra 5 artículos en la tienda.' }
  ];

  /* Misiones del mapa: se completan en orden sugerido, pero se pueden hacer en cualquier orden. */
  const MISIONES = [
    { id: 'escaneo', titulo: 'Escaneo inicial', icono: '🧭', ruta: '#/diagnostico', xp: 100 },
    { id: 'eval-antes', titulo: 'Reto de conocimientos', icono: '🧠', ruta: '#/evaluacion/antes', xp: 40 },
    { id: 'plan', titulo: 'Plan de 7 días', icono: '🗓️', ruta: '#/plan', xp: 140 },
    { id: 'simulador', titulo: 'Simulador', icono: '🎮', ruta: '#/simulador', xp: 180 },
    { id: 'auditoria', titulo: 'Auditoría de apps', icono: '✅', ruta: '#/auditoria', xp: 130 },
    { id: 'academia', titulo: 'Academia 360', icono: '🎓', ruta: '#/academia', xp: 360 },
    { id: 'eval-despues', titulo: 'Reto final', icono: '🏆', ruta: '#/evaluacion/despues', xp: 90 },
    { id: 'reescaneo', titulo: 'Nuevo escaneo', icono: '🔁', ruta: '#/progreso', xp: 100 }
  ];

  /* Avatares para personalizar sin dar datos personales (no se pide foto ni nombre). */
  const AVATARES = ['🦊', '🐼', '🐧', '🦄', '🐸', '🐱', '🐙', '🦉', '🐝', '🐢', '🐰', '🦖'];

  /* ---------- Modo aventura (todo el contenido es FICTICIO) ---------- */
  /* Cada mundo es una secuencia de retos. Tipos: forja (armar contraseña), rapido (¿engaño o seguro?),
     censura (tapar datos de una publicación), decision (situación del simulador) y jefe (batalla final). */
  const MUNDOS = [
    { id: 'm1', nombre: 'Bosque de las Contraseñas', icono: '🌲', enemigo: '🐺', color: 'verde',
      intro: 'Los lobos adivinan contraseñas débiles. Forja una frase fuerte y no caigas en trampas.',
      pasos: [{ tipo: 'forja' }, { tipo: 'decision', esc: 's5' }, { tipo: 'decision', esc: 's11' }, { tipo: 'decision', esc: 's10' }] },
    { id: 'm2', nombre: 'Ciudad del Phishing', icono: '🏙️', enemigo: '🎣', color: 'azul',
      intro: 'Llueven mensajes. Detecta los engaños antes de que se acabe el tiempo.',
      pasos: [{ tipo: 'rapido', n: 6 }, { tipo: 'decision', esc: 's1' }, { tipo: 'decision', esc: 's2' }, { tipo: 'decision', esc: 's6' }] },
    { id: 'm3', nombre: 'Isla de las Redes', icono: '🏝️', enemigo: '🦈', color: 'rosa',
      intro: 'Los tiburones buscan datos en tus publicaciones. Tápalos antes de publicar.',
      pasos: [{ tipo: 'censura', post: 0 }, { tipo: 'decision', esc: 's3' }, { tipo: 'decision', esc: 's4' }, { tipo: 'censura', post: 1 }, { tipo: 'decision', esc: 's8' }] },
    { id: 'm5', nombre: 'Patio sin Acoso', icono: '🏫', enemigo: '🌩️', color: 'durazno',
      intro: 'En la escuela y en los grupos de chat hay acoso. Decide cómo ayudar y aprende la ruta de denuncia segura.',
      pasos: [{ tipo: 'rapido', n: 6, set: 'testigo' }, { tipo: 'decision', esc: 'b1' }, { tipo: 'orden' }, { tipo: 'decision', esc: 'b2' }, { tipo: 'decision', esc: 'b3' }, { tipo: 'decision', esc: 'b4' }] },
    { id: 'm4', nombre: 'Torre del Hacker', icono: '🗼', enemigo: '👾', color: 'lila',
      intro: 'El Hacker Fantasma te espera en la cima. Supera sus trampas y derrótalo.',
      pasos: [{ tipo: 'decision', esc: 's9' }, { tipo: 'decision', esc: 's12' }, { tipo: 'jefe' }] }
  ];

  const MENSAJES_RAPIDOS = [
    { de: 'Banco Seguro', texto: 'Tu tarjeta fue bloqueada. Entra YA a banco-seguro-verifica.example', engano: true, pista: 'Urgencia + enlace raro' },
    { de: 'Mamá', texto: 'Llego tarde, hay comida en el refri 🍲', engano: false, pista: 'Mensaje normal: no pide datos ni tiene enlaces' },
    { de: 'Soporte de tu red social', texto: 'Tu cuenta será eliminada. Envía tu contraseña para verificarla.', engano: true, pista: 'Nadie oficial te pide tu contraseña' },
    { de: 'Profe de Mate', texto: 'Mañana hay examen del tema 3, repasen la guía.', engano: false, pista: 'Información sin pedirte nada' },
    { de: 'Número desconocido', texto: '¡Ganaste un celular! 🎁 Reclámalo en 10 min: premio-gratis.example', engano: true, pista: 'Premio que no pediste + prisa' },
    { de: 'Amigo (número nuevo)', texto: 'Cambié de número, ¿me pasas el código que te llegó?', engano: true, pista: 'Nunca compartas códigos de verificación' },
    { de: 'App del clima', texto: 'Mañana lloverá por la tarde ☔', engano: false, pista: 'Aviso normal' },
    { de: 'Tienda en línea', texto: 'Tu pedido llegó. Paga $15 de envío aquí: envio-pago.example', engano: true, pista: 'Cobro inesperado con enlace' },
    { de: 'Grupo del salón', texto: 'Recuerden traer la maqueta el viernes 📐', engano: false, pista: 'Mensaje normal del grupo' },
    { de: 'Plataforma de series', texto: 'Tu pago falló. Actualiza tu tarjeta: serie5-pagos.example', engano: true, pista: 'Dirección parecida pero falsa' },
    { de: 'Biblioteca escolar', texto: 'El libro que apartaste ya está disponible.', engano: false, pista: 'Aviso sin enlaces ni datos' },
    { de: 'Desconocido', texto: 'Tengo fotos tuyas 😈 entra aquí para verlas', engano: true, pista: 'Miedo + enlace = engaño' }
  ];

  const PUBLICACIONES = [
    { imagen: '🏫📸', elementos: [
      { t: '📍 Ubicación en vivo: Col. Centro', riesgo: true }, { t: '🏫 Foto frente a la Prepa «Lázaro Cárdenas»', riesgo: true },
      { t: '😎 ¡Por fin viernes!', riesgo: false }, { t: '📞 Escríbeme: 55 0000 0000', riesgo: true }, { t: '#música #amigos', riesgo: false }] },
    { imagen: '🎂🎉', elementos: [
      { t: '🎂 Hoy cumplo 16 · 12/03/2010', riesgo: true }, { t: '🏠 Fiesta en mi casa: Calle Roble 123', riesgo: true },
      { t: '🎉 ¡Gracias a todos!', riesgo: false }, { t: '🐶 Mi perrito Firulais (¡también es mi contraseña! jaja)', riesgo: true }, { t: '🌅 Qué bonito atardecer', riesgo: false }] }
  ];

  /* «¿Ayuda o empeora?»: acciones de quien presencia acoso o ciberbullying. */
  const ACCIONES_TESTIGO = [
    { texto: 'Reenvías el meme que se burla de un compañero', ayuda: false, pista: 'Reenviar multiplica el daño' },
    { texto: 'Le escribes a quien sufre acoso: «No estás solo, ¿quieres que avisemos a alguien?»', ayuda: true, pista: 'El apoyo de un testigo hace la diferencia' },
    { texto: 'Tomas captura de los mensajes de acoso para tener evidencia', ayuda: true, pista: 'Las evidencias sirven para denunciar' },
    { texto: 'Le das «me gusta» al comentario ofensivo', ayuda: false, pista: 'Un «me gusta» también apoya al agresor' },
    { texto: 'Avisas a orientación educativa lo que viste en el grupo', ayuda: true, pista: 'Avisar no es «chismear»: es proteger' },
    { texto: 'Te ríes y dices que «solo es una broma»', ayuda: false, pista: 'Si a alguien le duele, no es broma' },
    { texto: 'Reportas el perfil falso que se burla de alguien', ayuda: true, pista: 'Reportar ayuda a que lo eliminen' },
    { texto: 'Agregas a más personas al grupo donde se burlan de alguien', ayuda: false, pista: 'Más público = más humillación' },
    { texto: 'Invitas a quien siempre está solo a sentarse con ustedes', ayuda: true, pista: 'Incluir previene el acoso' },
    { texto: 'Compartes la dirección de alguien «para que lo visiten»', ayuda: false, pista: 'Es exponer datos personales y puede ser peligroso' }
  ];

  /* Situaciones del modo aventura sobre bullying, ciberbullying y acoso (no aparecen en el simulador clásico). */
  const ESCENARIOS_JUEGO = [
    { id: 'b1', tema: 'bullying', titulo: 'La encuesta cruel', canal: 'Grupo de WhatsApp del salón', remitente: 'Grupo «3°B» (ficticio)',
      mensaje: 'Alguien publicó una encuesta: «¿Quién es el más feo del salón?» con fotos de compañeros. Muchos ya votaron.',
      opciones: ['Voto para no quedar mal', 'Salgo del grupo sin decir nada', 'No participo, guardo captura, digo que no está bien y aviso a un adulto'], ok: 2,
      explicacion: 'Votar o quedarse callado normaliza el ciberbullying. Guardar evidencia y avisar a un adulto ayuda a detenerlo.' },
    { id: 'b2', tema: 'bullying', titulo: 'El secreto del patio', canal: 'En persona', remitente: 'Compañero de tu grupo (ficticio)',
      mensaje: 'Un grupo empuja todos los días a un compañero y le quita su almuerzo. Él te pide que no le digas a nadie.',
      opciones: ['Guardo el secreto', 'Me uno a ellos para que no me hagan lo mismo', 'Le digo que no es su culpa y juntos avisamos a orientación o a un docente'], ok: 2,
      explicacion: 'El acoso escolar casi nunca se detiene solo. Acompañar a la persona a pedir ayuda es la forma más segura de pararlo.' },
    { id: 'b3', tema: 'acoso', titulo: 'La amenaza', canal: 'Mensaje privado', remitente: 'Perfil que conociste en línea (ficticio)',
      mensaje: 'Si no me mandas más fotos o dinero, publico la foto que me enviaste. Tienes 1 hora.',
      opciones: ['Le mando lo que pide para que no la publique', 'Borro todo y no le cuento a nadie', 'No envío nada, guardo evidencias, bloqueo, aviso a un adulto y denuncio'], ok: 2,
      explicacion: 'Esto es sextorsión. Pagar o enviar más no la detiene. No es tu culpa: guarda evidencias, pide ayuda y denuncia (911 o Fiscalía).' },
    { id: 'b4', tema: 'bullying', titulo: 'El video viral', canal: 'Red social', remitente: 'Cuenta anónima (ficticia)',
      mensaje: 'Subieron un video donde golpean a un compañero a la salida de la escuela. Ya tiene cientos de vistas.',
      opciones: ['Lo comparto para que todos sepan', 'Comento insultos contra el agresor', 'No lo comparto, lo reporto en la plataforma y aviso a la escuela'], ok: 2,
      explicacion: 'Compartir el video vuelve a humillar a la víctima. Reportarlo y avisar a la escuela ayuda a que lo quiten y a proteger a tu compañero.' }
  ];

  /* «Ruta de denuncia segura»: el jugador debe tocar los pasos en orden. */
  const RUTA_DENUNCIA = ['🛑 No respondas a las provocaciones', '📸 Guarda evidencias (capturas con fecha y usuario)', '🚫 Bloquea y reporta la cuenta',
    '🗣️ Cuéntalo a un adulto de confianza o a la escuela', '🚓 Si hay amenazas, denuncia (911 o Fiscalía)'];

  /* Fichas para «forjar» una contraseña de ejemplo (nunca se guarda). */
  const FICHAS_CLAVE = ['luna', 'volcán', 'mango', 'río', 'nube', 'tacos', 'cometa', 'azul', '-', '!', '7', '123', '2009', 'Juan', 'qwerty', 'password'];

  /* Consecuencias que se muestran cuando el jugador toma una mala decisión. */
  const CONSECUENCIAS = {
    acceso: '🔓 ¡Entraron a tus cuentas!', configuracion: '🕵️ La app se quedó con tus datos', compartir: '📍 Un desconocido sabe dónde estás',
    mensajes: '😱 ¡Te robaron la cuenta!', imagenes: '📸 La foto se volvió viral sin permiso', respuesta: '⏳ Perdiste la cuenta para siempre',
    bullying: '💔 Alguien fue humillado frente a todos', acoso: '😰 El acoso empeoró'
  };

  const JEFE = { nombre: 'Hacker Fantasma', icono: '👾', vida: 100, golpe: 20 };

  const DATOS = { CATEGORIAS, PREGUNTAS, ACCIONES_PLAN, AUDITORIA, ESCENARIOS, MODULOS, EVALUACION, EMERGENCIAS, RECURSOS, PERFIL_DEMO, NIVELES, INSIGNIAS, MISIONES, AVATARES,
    MUNDOS, MENSAJES_RAPIDOS, PUBLICACIONES, FICHAS_CLAVE, CONSECUENCIAS, JEFE, ACCIONES_TESTIGO, ESCENARIOS_JUEGO, RUTA_DENUNCIA };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATOS;
  else raiz.P360_DATOS = DATOS;
})(typeof window !== 'undefined' ? window : globalThis);
