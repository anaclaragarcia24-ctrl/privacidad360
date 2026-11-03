/* PRIVACIDAD 360 — Idiomas (español, inglés, francés y portugués).
   t('texto en español', {vars}) devuelve la traducción del idioma activo; si no existe, devuelve el español.
   loc(tipo, objeto) traduce el contenido del modo aventura. Las secciones informativas (diagnóstico, academia,
   guías, recursos…) siguen solo en español en esta versión y muestran un aviso en el idioma elegido.
   Inglés aquí; francés y portugués en idiomas/fr.js y idiomas/pt.js; textos de los modos nuevos en idiomas/textos.js. */
(function () {
  'use strict';
  const IDIOMAS = { es: 'Español', en: 'English', fr: 'Français', pt: 'Português' };
  const ETIQUETA_HTML = { es: 'es-MX', en: 'en', fr: 'fr', pt: 'pt-BR' };
  const leer = () => { try { return localStorage.getItem('p360_idioma'); } catch (e) { return null; } };
  let idioma = IDIOMAS[leer()] ? leer() : 'es';

  const EN = {
    // ---- Interfaz general ----
    'Inicio': 'Home', 'Jugar': 'Play', 'Mi base': 'My base', 'Escaneo': 'Scan', 'Plan': 'Plan', 'Contraseñas': 'Passwords', 'Auditoría': 'Audit',
    'Simulador': 'Simulator', 'Academia': 'Academy', 'Emergencia': 'Emergency', 'Recursos': 'Resources', 'Progreso': 'Progress', 'Logros': 'Achievements',
    'Estadísticas': 'Statistics', 'Proyecto': 'Project', 'Privacidad': 'Privacy', 'Secciones': 'Sections', '☰ Menú': '☰ Menu',
    'Modo demostración': 'Demo mode', 'Salir de demostración': 'Exit demo', 'Saltar al contenido': 'Skip to content',
    '🎭 MODO DEMOSTRACIÓN — todos los datos mostrados son ficticios': '🎭 DEMO MODE — all data shown is fictional',
    'Silenciar sonidos': 'Mute sounds', 'Activar sonidos': 'Turn sounds on', 'Cambiar a modo oscuro': 'Switch to dark mode', 'Cambiar a modo claro': 'Switch to light mode', 'Idioma': 'Language',
    'PRIVACIDAD 360 · Reto 3 · Proyecto escolar · Caso: Escuela Preparatoria «Lázaro Cárdenas» · Prototipo educativo.': 'PRIVACIDAD 360 · Challenge 3 · School project · Case: «Lázaro Cárdenas» High School · Educational prototype.',
    'Nunca te pediremos contraseñas reales, fotos ni acceso a tus cuentas.': 'We will never ask for real passwords, photos or access to your accounts.',
    'Aviso de privacidad': 'Privacy notice',
    '🌐 Esta sección todavía está solo en español. El juego (Inicio y Jugar) ya está en inglés.': '🌐 This section is only available in Spanish for now. The game (Home and Play) is already in English.',
    'Nivel {n}': 'Level {n}', '{xp} puntos de experiencia, nivel {n}: {nombre}. Ver mis logros': '{xp} experience points, level {n}: {nombre}. See my achievements',
    'faltan {n} XP para «{nombre}»': '{n} XP to «{nombre}»', '¡nivel máximo!': 'max level!',
    '+{n} XP': '+{n} XP', '¡Nueva insignia: {nombre}!': 'New badge: {nombre}!', '¡Subiste de nivel!': 'Level up!', 'Ahora eres {nombre} (nivel {n}).': 'You are now {nombre} (level {n}).', '¡Genial! 🎉': 'Awesome! 🎉',
    '🎭 Modo demostración activado: todos los datos son ficticios.': '🎭 Demo mode on: all data is fictional.',
    'Saliste del modo demostración. Se borraron los datos ficticios.': 'You left demo mode. The fictional data was deleted.',
    // ---- Pantalla de título y mapa ----
    'Reto 3 · Caso: Preparatoria «Lázaro Cárdenas»': 'Challenge 3 · Case: «Lázaro Cárdenas» High School',
    'Protege tu vida digital y sube de nivel': 'Protect your digital life and level up', '▶ JUGAR': '▶ PLAY', '▶ CONTINUAR': '▶ CONTINUE',
    '⭐ {e} de {te} estrellas · 🏅 {i} de {ti} insignias': '⭐ {e} of {te} stars · 🏅 {i} of {ti} badges',
    '🎭 Ver modo demostración': '🎭 Try demo mode', '🧭 Escanear mis hábitos': '🧭 Scan my habits',
    '🔒 Nunca te pedimos contraseñas reales, fotos ni acceso a tus redes. Todo se guarda solo en este navegador.': '🔒 We never ask for real passwords, photos or access to your social media. Everything stays in this browser.',
    '🗺️ Mundos de la aventura': '🗺️ Adventure worlds', '⚡ Misiones extra': '⚡ Extra missions', '🗺️ Elige tu mundo': '🗺️ Choose your world', '▶ Jugar': '▶ Play',
    '⏱ Jugar sin límite de tiempo': '⏱ Play without time limit', '⏱ Sin límite de tiempo: activado': '⏱ No time limit: on',
    '🎭 En modo demostración todos los mundos están abiertos.': '🎭 In demo mode every world is unlocked.',
    '🔒 Mundo bloqueado': '🔒 World locked', 'Gana al menos 1 estrella en «{nombre}» para abrirlo.': 'Earn at least 1 star in «{nombre}» to unlock it.', '▶ Ir al mundo anterior': '▶ Go to the previous world',
    'Escaneo': 'Scan', '24 preguntas sobre tus hábitos con puntaje por categoría.': '24 questions about your habits, scored by category.',
    'Plan de 7 días': '7-day plan', 'Una misión diaria según tus resultados.': 'One daily mission based on your results.',
    'Pon a prueba una contraseña de ejemplo. No se guarda.': 'Test a sample password. It is never stored.',
    'Revisa tus apps tú mismo, paso a paso.': 'Check your apps yourself, step by step.', '12 situaciones ficticias: ¿qué harías?': '12 fictional situations: what would you do?',
    '6 módulos cortos con quiz.': '6 short modules with quizzes.', 'Qué hacer si te roban una cuenta o difunden una foto.': 'What to do if your account is stolen or a photo is shared.',
    'Tu nivel, tus insignias y tu avatar.': 'Your level, badges and avatar.',
    // ---- Juego ----
    '{n} de 3 estrellas': '{n} of 3 stars', 'Récord: {n} puntos': 'Best: {n} points', '{n} retos': '{n} challenges', 'Gana 1 estrella en el mundo anterior': 'Earn 1 star in the previous world',
    'Reto {n}/{total}': 'Challenge {n}/{total}', 'Escudo {n} de 100': 'Shield {n} of 100', '⏱ Modo sin límite de tiempo': '⏱ No time limit mode',
    '¿Qué haces?': 'What do you do?', '⚡ ¿Engaño o seguro? · mensaje {n} de {total}': '⚡ Scam or safe? · message {n} of {total}',
    '⚡ ¿Ayuda o empeora? · acción {n} de {total}': '⚡ Helps or hurts? · action {n} of {total}', '🤝 ¡Ayuda!': '🤝 Helps!', '💥 Empeora': '💥 Hurts',
    '🚩 ¡Engaño!': '🚩 Scam!', '✅ Seguro': '✅ Safe', '🖍️ Toca los datos riesgosos para taparlos antes de publicar': '🖍️ Tap the risky details to cover them before posting',
    '█████ TAPADO 🖍️': '█████ COVERED 🖍️', '📤 Publicar': '📤 Post', '🔨 Forja una contraseña de ejemplo «Fuerte» tocando fichas': '🔨 Forge a «Strong» sample password by tapping tiles',
    'toca las fichas…': 'tap the tiles…', 'Sin evaluar': 'Not rated', '{n} caracteres': '{n} characters', '⌫ Borrar': '⌫ Delete', '🔨 ¡Forjar!': '🔨 Forge!',
    'Muy débil': 'Very weak', 'Débil': 'Weak', 'Regular': 'Fair', 'Fuerte': 'Strong', 'Muy fuerte': 'Very strong',
    '🧭 Ruta de denuncia segura: toca los pasos en el orden correcto': '🧭 Safe reporting path: tap the steps in the right order', '¡Ese no va aquí!': 'Not this one yet!',
    'Orden correcto: {pasos}': 'Right order: {pasos}', 'PV': 'HP', 'Vida del jefe {n} de {total}': 'Boss health {n} of {total}',
    '¡IMPARABLE!': 'UNSTOPPABLE!', '¡Bien hecho!': 'Well done!', '¡Ouch!': 'Ouch!', '+{n} puntos': '+{n} points', '-{n} de escudo · combo reiniciado': '-{n} shield · combo reset',
    'Continuar ▶': 'Continue ▶', '🏆 ¡DERROTASTE AL HACKER!': '🏆 YOU BEAT THE HACKER!', '🎉 ¡MUNDO COMPLETADO!': '🎉 WORLD COMPLETE!',
    '{n} puntos': '{n} points', '{a}/{b} aciertos': '{a}/{b} correct', '{n} de escudo': '{n} shield',
    '🎁 Ya tenías estas estrellas: ¡supera tu récord para ganar más XP!': '🎁 You already had these stars: beat your record to earn more XP!',
    'Abrir cofre de recompensa': 'Open reward chest', '¡Toca para abrir el cofre!': 'Tap to open the chest!', 'Siguiente mundo': 'Next world',
    '🔄 Jugar otra vez': '🔄 Play again', '🗺️ Mapa': '🗺️ Map', '💥 ¡TU ESCUDO CAYÓ!': '💥 YOUR SHIELD BROKE!', 'Esto fue lo que pasó por tus decisiones:': 'This is what happened because of your choices:',
    'Recibiste demasiados golpes': 'You took too many hits', 'En la vida real cada una de estas decisiones tendría consecuencias. ¡Aquí puedes intentarlo otra vez!': 'In real life each of these choices would have consequences. Here you can try again!',
    '🔄 Reintentar': '🔄 Retry', '🛡️ Tu escudo empieza en 100: cada error lo baja; si llega a 0, pierdes.': '🛡️ Your shield starts at 100: every mistake lowers it; at 0 you lose.',
    '🔥 Aciertos seguidos = combo hasta ×4. Responder rápido da bonus.': '🔥 Correct answers in a row = combo up to ×4. Fast answers earn a bonus.',
    '⏱ Cada reto tiene tiempo límite.': '⏱ Every challenge has a time limit.', '▶ ¡A jugar!': '▶ Let’s play!',
    '⏰ ¡Se acabó el tiempo!': '⏰ Time’s up!', '⏰ ¡Muy lento!': '⏰ Too slow!', '⏰ ¡El Hacker te atacó mientras dudabas!': '⏰ The Hacker attacked while you hesitated!',
    '🎣 Caíste en un engaño': '🎣 You fell for a scam', '¡Publicación segura! Tapaste todos los datos riesgosos y dejaste lo demás.': 'Safe post! You covered every risky detail and kept the rest.',
    'Se te escaparon {n} dato(s) riesgoso(s).': '{n} risky detail(s) slipped through.', 'Tapaste {n} cosa(s) que no tenían riesgo.': 'You covered {n} harmless thing(s).',
    '🦈 Un desconocido juntó tus datos': '🦈 A stranger collected your details',
    'Contraseña «{etiqueta}» de {n} caracteres. ¡Los lobos no pudieron adivinarla! (Es solo un ejemplo: no se guarda.)': '«{etiqueta}» password with {n} characters. The wolves couldn’t guess it! (Just an example: it is not stored.)',
    'Contraseña «{etiqueta}». Usa varias palabras, sin nombres ni años, y que sea larga.': '«{etiqueta}» password. Use several words, no names or years, and make it long.',
    '🔓 Una computadora la adivinó en segundos': '🔓 A computer guessed it in seconds',
    '¡Golpe crítico! La respuesta correcta era: «{r}».': 'Critical hit! The right answer was: «{r}».', 'El Hacker contraatacó. La respuesta correcta era: «{r}».': 'The Hacker struck back. The right answer was: «{r}».',
    '👾 El Hacker te robó datos': '👾 The Hacker stole your data',
    '⚠️ ¡PELIGRO! ⚠️': '⚠️ DANGER! ⚠️', '{nombre} se acerca…': '{nombre} is coming…', '¡FASE FINAL!': 'FINAL PHASE!',
    '🎁 ¡Caja misteriosa!': '🎁 Mystery box!', 'Elige una': 'Pick one', 'Caja {n}': 'Box {n}', '+250 puntos': '+250 points', '+20 de escudo': '+20 shield',
    '¡Combo +1!': 'Combo +1!', '¡Virus! -10 de escudo': 'Virus! -10 shield', '¡Desbloqueaste {nombre}!': 'You unlocked {nombre}!', '🔥 Racha: {n} día(s)': '🔥 Streak: {n} day(s)',
    'Silenciar efectos de sonido': 'Mute sound effects', 'Activar efectos de sonido': 'Turn sound effects on', 'Apagar la música': 'Turn music off', 'Encender la música': 'Turn music on'
  };

  /* ---- Contenido del modo aventura en inglés (todo ficticio) ---- */
  const C = {
    mundos: {
      m1: { nombre: 'Password Forest', intro: 'Wolves guess weak passwords. Forge a strong passphrase and avoid the traps.' },
      m2: { nombre: 'Phishing City', intro: 'Messages are raining down. Spot the scams before time runs out.' },
      m3: { nombre: 'Social Island', intro: 'Sharks hunt for details in your posts. Cover them before posting.' },
      m5: { nombre: 'Bully-Free Schoolyard', intro: 'There is bullying at school and in group chats. Decide how to help and learn the safe reporting path.' },
      m4: { nombre: 'Hacker Tower', intro: 'The Ghost Hacker waits at the top. Get past the traps and defeat it.' }
    },
    jefe: { nombre: 'Ghost Hacker' },
    consecuencias: {
      acceso: '🔓 They got into your accounts!', configuracion: '🕵️ The app kept your data', compartir: '📍 A stranger knows where you are',
      mensajes: '😱 Your account was stolen!', imagenes: '📸 The photo went viral without consent', respuesta: '⏳ You lost the account forever',
      bullying: '💔 Someone was humiliated in front of everyone', acoso: '😰 The harassment got worse'
    },
    escenarios: {
      s1: { titulo: 'The surprise prize', canal: 'SMS', remitente: '+52 55 0000 0000 (unknown number)', mensaje: 'CONGRATULATIONS! Your number won a new phone. Claim it in the next 2 hours: free-phone-prize.example',
        opciones: ['I tap it fast before time runs out', 'I reply asking for more information', 'I don’t open the link, I block the number and delete the message'],
        explicacion: 'Prizes you didn’t ask for + urgency + a strange link = classic phishing signs. Replying also confirms your number is active.' },
      s2: { titulo: 'The “friend” who asks for a code', canal: 'WhatsApp', remitente: 'Contact: “Cousin Luis” (fictional)', mensaje: 'Hey, a 6-digit code reached you by mistake, it was for me. Can you send it to me? It’s urgent 🙏',
        opciones: ['I send it, he’s my cousin', 'I don’t share it and I call my cousin another way to check', 'I forward a screenshot of the message'],
        explicacion: 'That code registers YOUR WhatsApp on another phone. Stolen accounts are used to ask contacts for codes. Check another way.' },
      s3: { titulo: 'Live story', canal: 'Instagram', remitente: 'You', mensaje: 'You’re about to post a story: “Home alone all afternoon 😎” with your neighborhood location on.',
        opciones: ['I post it like that', 'I remove the location and don’t say I’m alone', 'I post it only to “close friends” with location'],
        explicacion: 'Saying you’re alone and where you are gives useful information to people with bad intentions. Share without location and later.' },
      s4: { titulo: 'The photo going around', canal: 'Class WhatsApp group', remitente: 'Group “3B” (fictional)', mensaje: 'Someone sent the group an embarrassing photo of a classmate taken without him noticing. Everyone is laughing.',
        opciones: ['I forward it to another group', 'I don’t forward it, I ask them to delete it and tell a teacher', 'I just react with an emoji'],
        explicacion: 'Forwarding or celebrating the photo increases the harm. The right move is not to join in, ask for it to be deleted and tell a responsible adult.' },
      s5: { titulo: 'Password for the new game', canal: 'Game sign-up', remitente: 'You', mensaje: 'You sign up for an online game and it asks you to create a password.',
        opciones: ['I use my email password so I don’t forget it', 'I use my name and birth year', 'I create a long, different passphrase and save it in a password manager'],
        explicacion: 'If the game is breached and your password is the same as your email’s, they can get into all your accounts. A long, unique passphrase is safest.' },
      s6: { titulo: '“Support” email', canal: 'Email', remitente: 'security-support@account-verification.example', mensaje: 'We detected unusual activity. Your account will be deleted in 24 hours unless you confirm your password here.',
        opciones: ['I type my password in the link', 'I ignore the email and check my account from the official app', 'I reply asking if it’s real'],
        explicacion: 'Real platforms don’t ask for your password by email. If you’re worried, open the official app yourself and check the activity.' },
      s7: { titulo: 'The unknown request', canal: 'Social network', remitente: 'New profile with 3 photos and 12 mutual friends (fictional)', mensaje: 'A stranger writes: “I saw you at school, you’re so cute. Can I have your number?”',
        opciones: ['I give my number, we have mutual friends', 'I don’t share my number, I ignore the request and block/report if they insist', 'I ask what class they’re in'],
        explicacion: 'New profiles, little information and quick compliments can be impersonations or attempts to approach with bad intentions.' },
      s8: { titulo: 'Pressure for a photo', canal: 'Private message', remitente: 'Someone you’ve chatted with for two weeks (fictional)', mensaje: 'If you really trust me, send me an intimate photo. Nobody else will see it, I promise.',
        opciones: ['I send it so I don’t lose the relationship', 'I don’t send it, I end the conversation and talk to a trusted adult', 'I send someone else’s photo'],
        explicacion: 'Pressure to send intimate photos is a red flag (it may be grooming or sextortion). You don’t have to, and asking for help is not your fault.' },
      s9: { titulo: 'Impersonated account', canal: 'Instagram', remitente: 'A friend warns you', mensaje: 'Someone created an account with your photos and name and is asking your followers for money.',
        opciones: ['I insult the fake account', 'I take screenshots, report it for impersonation, warn my contacts and an adult', 'I do nothing, it will go away'],
        explicacion: 'Save evidence, use the impersonation report option and warn your contacts so they don’t fall for it.' },
      s10: { titulo: 'The curious flashlight', canal: 'App install', remitente: 'App “Super Flashlight” (fictional)', mensaje: 'When installing a flashlight app it asks for: contacts, location, microphone and messages.',
        opciones: ['I accept everything, that’s how it works', 'I deny the unnecessary permissions or look for another app', 'I accept only location'],
        explicacion: 'A flashlight doesn’t need your contacts or messages. Asking for too many permissions means the app collects data.' },
      s11: { titulo: 'Library computer', canal: 'Shared computer', remitente: 'You', mensaje: 'You finished using your email on the school library computer. The browser asks: “Save password?”',
        opciones: ['I accept so it’s faster next time', 'I decline and sign out before leaving', 'I just close the tab'],
        explicacion: 'Closing the tab doesn’t sign you out. On shared computers, never save passwords and always sign out.' },
      s12: { titulo: 'I can’t get into my account', canal: 'Social network', remitente: 'You', mensaje: 'Your password no longer works. You got an “email changed” message you didn’t request.',
        opciones: ['I create a new account and forget the old one', 'I use the official recovery link, change passwords and warn my contacts', 'I ask a stranger to “hack” the account back'],
        explicacion: 'Follow the platform’s official recovery process. Never pay or give data to so-called “account recoverers”: it’s usually another scam.' },
      b1: { titulo: 'The cruel poll', canal: 'Class WhatsApp group', remitente: 'Group “3B” (fictional)', mensaje: 'Someone posted a poll: “Who is the ugliest in class?” with classmates’ photos. Many already voted.',
        opciones: ['I vote so I don’t look bad', 'I leave the group without saying anything', 'I don’t take part, I save a screenshot, say it’s not OK and tell an adult'],
        explicacion: 'Voting or staying silent normalizes cyberbullying. Saving evidence and telling an adult helps stop it.' },
      b2: { titulo: 'The schoolyard secret', canal: 'In person', remitente: 'Classmate (fictional)', mensaje: 'A group pushes a classmate every day and takes his lunch. He asks you not to tell anyone.',
        opciones: ['I keep the secret', 'I join them so they don’t do it to me', 'I tell him it’s not his fault and we go together to the counselor or a teacher'],
        explicacion: 'School bullying almost never stops on its own. Going with the person to ask for help is the safest way to stop it.' },
      b3: { titulo: 'The threat', canal: 'Private message', remitente: 'Profile you met online (fictional)', mensaje: 'If you don’t send me more photos or money, I’ll post the photo you sent me. You have 1 hour.',
        opciones: ['I send what they ask so they don’t post it', 'I delete everything and tell no one', 'I send nothing, save evidence, block, tell an adult and report it'],
        explicacion: 'This is sextortion. Paying or sending more doesn’t stop it. It’s not your fault: save evidence, ask for help and report it (911 or the prosecutor’s office).' },
      b4: { titulo: 'The viral video', canal: 'Social network', remitente: 'Anonymous account (fictional)', mensaje: 'Someone uploaded a video of a classmate being beaten after school. It already has hundreds of views.',
        opciones: ['I share it so everyone knows', 'I post insults against the attacker', 'I don’t share it, I report it on the platform and tell the school'],
        explicacion: 'Sharing the video humiliates the victim again. Reporting it and telling the school helps get it removed and protects your classmate.' }
    },
    mensajes: [
      { de: 'Safe Bank', texto: 'Your card was blocked. Go NOW to safe-bank-verify.example', pista: 'Urgency + strange link' },
      { de: 'Mom', texto: 'I’ll be late, there’s food in the fridge 🍲', pista: 'Normal message: no data requests or links' },
      { de: 'Your social network support', texto: 'Your account will be deleted. Send your password to verify it.', pista: 'No official service asks for your password' },
      { de: 'Math teacher', texto: 'Tomorrow is the unit 3 test, review the guide.', pista: 'Information without asking you for anything' },
      { de: 'Unknown number', texto: 'You won a phone! 🎁 Claim it in 10 min: free-prize.example', pista: 'A prize you didn’t ask for + hurry' },
      { de: 'Friend (new number)', texto: 'I changed numbers, can you send me the code you just got?', pista: 'Never share verification codes' },
      { de: 'Weather app', texto: 'Rain expected tomorrow afternoon ☔', pista: 'Normal alert' },
      { de: 'Online store', texto: 'Your order arrived. Pay $15 shipping here: shipping-pay.example', pista: 'Unexpected charge with a link' },
      { de: 'Class group', texto: 'Remember to bring the model on Friday 📐', pista: 'Normal group message' },
      { de: 'Streaming service', texto: 'Your payment failed. Update your card: stream5-payments.example', pista: 'Look-alike but fake address' },
      { de: 'School library', texto: 'The book you reserved is now available.', pista: 'Notice with no links or data' },
      { de: 'Stranger', texto: 'I have photos of you 😈 click here to see them', pista: 'Fear + link = scam' }
    ],
    testigo: [
      { texto: 'You forward the meme mocking a classmate', pista: 'Forwarding multiplies the harm' },
      { texto: 'You message the person being bullied: “You’re not alone, want us to tell someone?”', pista: 'Support from a bystander makes a difference' },
      { texto: 'You screenshot the bullying messages as evidence', pista: 'Evidence helps when reporting' },
      { texto: 'You “like” the offensive comment', pista: 'A “like” also supports the bully' },
      { texto: 'You tell the school counselor what you saw in the group', pista: 'Telling isn’t “snitching”: it’s protecting' },
      { texto: 'You laugh and say “it’s just a joke”', pista: 'If it hurts someone, it isn’t a joke' },
      { texto: 'You report the fake profile mocking someone', pista: 'Reporting helps get it removed' },
      { texto: 'You add more people to the group mocking someone', pista: 'More audience = more humiliation' },
      { texto: 'You invite the kid who is always alone to sit with you', pista: 'Including others prevents bullying' },
      { texto: 'You share someone’s address “so people can visit”', pista: 'It exposes personal data and can be dangerous' }
    ],
    publicaciones: [
      ['📍 Live location: Downtown', '🏫 Photo in front of «Lázaro Cárdenas» High School', '😎 Finally Friday!', '📞 Text me: 55 0000 0000', '#music #friends'],
      ['🎂 Turning 16 today · 03/12/2010', '🏠 Party at my place: 123 Oak St.', '🎉 Thanks everyone!', '🐶 My puppy Firulais (also my password! lol)', '🌅 What a beautiful sunset']
    ],
    ruta: ['🛑 Don’t respond to provocations', '📸 Save evidence (screenshots with date and username)', '🚫 Block and report the account',
      '🗣️ Tell a trusted adult or the school', '🚓 If there are threats, report it (911 or prosecutor’s office)'],
    fichas: ['moon', 'volcano', 'mango', 'river', 'cloud', 'tacos', 'comet', 'blue', '-', '!', '7', '123', '2009', 'John', 'qwerty', 'password'],
    evaluacion: {
      antes: [
        { p: 'Which password is the most secure?', o: ['Maria2009', 'cat123!', 'my-blue-bike-climbs-the-hill-slowly', 'qwerty'] },
        { p: 'What is two-step verification?', o: ['Typing the password twice', 'A second code or confirmation besides the password', 'Having two accounts'] },
        { p: 'A message says: “Your bank blocked your card, click here”. What is it most likely?', o: ['A real notice', 'A scam attempt (phishing)', 'An error'] },
        { p: 'A contact asks for the 6-digit code you got by SMS.', o: ['You give it', 'You don’t share it', 'You post it in your status'] },
        { p: 'When is it safer to share where you were?', o: ['In real time', 'After you left', 'Always with the exact location'] },
        { p: 'A game asks for your contacts and microphone. The right move is…', o: ['Accept everything', 'Deny the permissions it doesn’t need', 'Uninstall the phone'] },
        { p: 'To post a photo of your friend you should…', o: ['Ask for permission', 'Tag her', 'Post it without saying anything'] },
        { p: 'You get an intimate photo of a classmate. What do you do?', o: ['I forward it', 'I don’t forward it, I delete it and tell an adult', 'I keep it just in case'] },
        { p: 'If someone harasses you, before blocking them you should…', o: ['Save screenshots as evidence', 'Delete the conversation', 'Answer back the same way'] },
        { p: 'If your account is stolen, what should you NOT do?', o: ['Use the official recovery', 'Warn your contacts', 'Pay someone who promises to recover it'] }
      ],
      despues: [
        { p: 'Which password would be hardest to guess?', o: ['Juan2008', 'soccer!', 'three-moon-tacos-on-the-rooftop', '123456'] },
        { p: 'Two-step verification is used to…', o: ['Ask for a second factor besides the password', 'Remember the password', 'Change user'] },
        { p: 'An email says: “Your account will be deleted today, confirm your password”. It’s probably…', o: ['An official notice', 'Phishing', 'Normal advertising'] },
        { p: 'Someone writes: “a code reached you by mistake, send it to me”. The right move is…', o: ['Share it', 'Don’t share it and check another way', 'Send a screenshot'] },
        { p: 'Posting “I’m home alone” with your location is…', o: ['Safe', 'Risky', 'Required'] },
        { p: 'A flashlight app asks for your messages. You should…', o: ['Accept', 'Deny the permission or find another app', 'Share the app'] },
        { p: 'Before uploading a video with your classmates in it…', o: ['You ask them for permission', 'You just upload it', 'You only upload it to stories'] },
        { p: 'A humiliating photo of someone is going around the group. The right move is…', o: ['React with a laugh', 'Don’t forward, ask them to delete it and tell an adult', 'Save it'] },
        { p: 'What counts as evidence of online harassment?', o: ['Screenshots with date and username', 'Nothing, it deletes itself', 'Only what you remember'] },
        { p: 'To recover a stolen account the safest option is…', o: ['The platform’s official process', 'A social media “hacker”', 'Create another account and forget it'] }
      ]
    },
    niveles: { 1: 'Digital rookie', 2: 'Data detective', 3: 'Active shield', 4: 'Agent 360', 5: 'Privacy legend' }
  };

  const DICC = { en: EN };
  const CONTENIDO = { en: C };

  function t(texto, vars) {
    let s = (DICC[idioma] && DICC[idioma][texto]) || texto;
    if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  function loc(tipo, obj) {
    const C = CONTENIDO[idioma];
    if (!C || !obj) return obj;
    const m = (extra) => (extra ? Object.assign({}, obj, extra) : obj);
    switch (tipo) {
      case 'mundo': return m(C.mundos[obj.id]);
      case 'escenario': return m(C.escenarios[obj.id]);
      case 'mensaje': return m(C.mensajes[obj._i]);
      case 'testigo': return m(C.testigo[obj._i]);
      case 'consecuencia': return m(C.consecuencias[obj.tema] ? { texto: C.consecuencias[obj.tema] } : null);
      case 'jefe': return m(C.jefe);
      case 'ruta': return m({ pasos: C.ruta });
      case 'fichas': return m({ fichas: C.fichas });
      case 'nivel': return m(C.niveles[obj.n] ? { nombre: C.niveles[obj.n] } : null);
      case 'evaluacion': { const q = (C.evaluacion[obj._forma] || [])[obj._i]; return m(q); }
      case 'publicacion': {
        const textos = C.publicaciones[obj._i];
        return textos ? Object.assign({}, obj, { elementos: obj.elementos.map((el, i) => Object.assign({}, el, { t: textos[i] || el.t })) }) : obj;
      }
      default: return obj;
    }
  }

  function cambiar(nuevo) {
    if (!IDIOMAS[nuevo]) return idioma;
    idioma = nuevo;
    try { localStorage.setItem('p360_idioma', nuevo); } catch (e) { /* sin acceso */ }
    document.documentElement.lang = ETIQUETA_HTML[nuevo];
    return idioma;
  }

  /* Cada idioma adicional aporta sus textos y su contenido. */
  function registrar(codigo, textos, contenido) {
    DICC[codigo] = Object.assign(DICC[codigo] || {}, textos);
    if (contenido) CONTENIDO[codigo] = contenido;
  }
  /* Tabla { 'texto en español': ['inglés', 'francés', 'portugués'] } */
  function agregarTabla(tabla) {
    Object.keys(tabla).forEach((es) => {
      ['en', 'fr', 'pt'].forEach((codigo, i) => { DICC[codigo] = DICC[codigo] || {}; DICC[codigo][es] = tabla[es][i]; });
    });
  }

  window.P360_I18N = { t, loc, cambiar, registrar, agregarTabla, idioma: () => idioma, IDIOMAS, _contenidoEN: C, _textosEN: EN, _dicc: DICC, _contenido: CONTENIDO };
})();
