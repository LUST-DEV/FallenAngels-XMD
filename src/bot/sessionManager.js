const fs = require('fs')
const path = require('path')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
  normalizeMessageContent,
} = require('@whiskeysockets/baileys')

const config = require('../config')
const logger = require('../logger')
const { User, GroupSetting } = require('../database')
const { sendParticipantNotice } = require('./groupMessages')
const { moderateGroupMessage } = require('./antiLink')
const { enforceGroupSlowmode } = require('./slowmode')

const sessions = new Map() // numero -> socket
const reconnectTimers = new Map()
const reconnectAttempts = new Map()
const restartOperations = new Map()
const newsletterFollowOperations = new Map()
const MAX_RECONNECT_DELAY_MS = 60_000

const sessionDir = (numero) => path.join(config.sessionsDir, numero)

function hasRegisteredAuth(numero) {
  const credsPath = path.join(sessionDir(numero), 'creds.json')
  if (!fs.existsSync(credsPath)) return false

  try {
    return JSON.parse(fs.readFileSync(credsPath, 'utf8')).registered === true
  } catch (error) {
    logger.error({ numero, err: error }, 'impossible de lire les identifiants WhatsApp')
    throw new Error(`Unable to read WhatsApp credentials for ${numero}.`, { cause: error })
  }
}

function isBotMentioned(msg, sock) {
  const content = normalizeMessageContent(msg.message || {})
  const botJids = [sock.user?.id, sock.user?.lid].filter(Boolean)
  const botIds = new Set(botJids.map((jid) => jid.split('@')[0].split(':')[0]))

  for (const value of Object.values(content)) {
    const context = value?.contextInfo
    if (!context) continue
    if ((context.mentionedJid || []).some((jid) => (
      botJids.includes(jid) || botIds.has(jid.split('@')[0].split(':')[0])
    ))) return true
  }

  const text = content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    ''
  return [...botIds].some((id) => id && text.includes(`@${id}`))
}

function scheduleReconnect(numero) {
  if (reconnectTimers.has(numero) || sessions.has(numero)) return

  const attempt = (reconnectAttempts.get(numero) || 0) + 1
  reconnectAttempts.set(numero, attempt)
  const delay = Math.min(5000 * (2 ** (attempt - 1)), MAX_RECONNECT_DELAY_MS)
  logger.info({ numero, attempt, delayMs: delay }, 'reconnexion WhatsApp planifiée')

  const timer = setTimeout(() => {
    reconnectTimers.delete(numero)
    if (!sessions.has(numero)) {
      startSession(numero).catch((error) => {
        logger.error({ numero, err: error }, 'échec de reconnexion')
        scheduleReconnect(numero)
      })
    }
  }, delay)
  reconnectTimers.set(numero, timer)
}

function removeAuth(numero) {
  fs.rmSync(sessionDir(numero), { recursive: true, force: true })
}

async function updateConnectionStatus(numero, status) {
  try {
    await User.update({ status }, { where: { numero } })
  } catch (error) {
    logger.error({ numero, status, err: error }, 'échec de mise à jour du statut de connexion')
  }
}

async function followNewsletterOnce(numero, sock) {
  const newsletterJid = config.whatsappNewsletterJid
  if (!/^\d+@newsletter$/.test(newsletterJid)) {
    throw new Error(`Invalid WhatsApp newsletter JID: ${newsletterJid}`)
  }

  const markerPath = path.join(
    sessionDir(numero),
    `newsletter-followed-${encodeURIComponent(newsletterJid)}.json`,
  )
  if (fs.existsSync(markerPath)) return
  if (newsletterFollowOperations.has(numero)) return newsletterFollowOperations.get(numero)

  const operation = (async () => {
    await sock.newsletterFollow(newsletterJid)
    fs.writeFileSync(markerPath, JSON.stringify({ newsletterJid }), { flag: 'wx' })
    logger.info({ numero, newsletterJid }, 'abonnement automatique à la chaîne WhatsApp effectué')
  })()

  newsletterFollowOperations.set(numero, operation)
  try {
    await operation
  } finally {
    if (newsletterFollowOperations.get(numero) === operation) {
      newsletterFollowOperations.delete(numero)
    }
  }
}

function isPermanentAuthFailure(code) {
  return code === DisconnectReason.loggedOut || code === DisconnectReason.badSession
}

async function startSession(numero) {
  // Session déjà active ?
  if (sessions.has(numero)) {
    const old = sessions.get(numero)
    if (old.authState.creds.registered) return null // déjà connecté
    await stopSession(numero) // pairing jamais terminé : on repart propre
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir(numero))
  if (!state.creds.registered && state.creds.me) {
    delete state.creds.me
    delete state.creds.pairingCode
    await saveCreds()
  }

  const { version } = await fetchLatestBaileysVersion()
  const baileysLogger = logger.child({ level: 'warn' })

  const sock = makeWASocket({
    version,
    logger: baileysLogger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    browser: Browsers.ubuntu('Chrome'), // obligatoire pour le pairing code
    connectTimeoutMs: config.whatsappConnectTimeoutMs,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  })

  sessions.set(numero, sock)
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('call', async (calls) => {
    try {
      const user = await User.findByPk(numero, { attributes: ['anticallEnabled'] })
      if (!user?.anticallEnabled) return

      for (const call of calls) {
        if (call.status !== 'offer' || !call.id || !call.from) continue
        try {
          await sock.rejectCall(call.id, call.from)
          logger.info({ numero, caller: call.from, callId: call.id }, 'incoming call rejected by anticall')
        } catch (error) {
          logger.error({ numero, caller: call.from, callId: call.id, err: error.message }, 'failed to reject incoming call')
        }
      }
    } catch (error) {
      logger.error({ numero, err: error.message }, 'failed to read anticall setting')
    }
  })

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      if (sock.stopped || sessions.get(numero) !== sock) return
      reconnectAttempts.delete(numero)
      await updateConnectionStatus(numero, 'connected')
      logger.info({ numero }, 'session connectée ✅')
      followNewsletterOnce(numero, sock).catch((error) => {
        logger.error(
          { numero, newsletterJid: config.whatsappNewsletterJid, err: error },
          'échec de l’abonnement automatique à la chaîne WhatsApp',
        )
      })
    }

    if (connection === 'close') {
      if (sock.stopped || sessions.get(numero) !== sock) return // arrêt volontaire ou ancien socket
      sessions.delete(numero)

      const code = lastDisconnect?.error?.output?.statusCode
      const registered = sock.authState.creds.registered
      const disconnectError = lastDisconnect?.error

      if (isPermanentAuthFailure(code)) {
        removeAuth(numero)
        await updateConnectionStatus(numero, 'disconnected')
        logger.warn(
          { numero, code, err: disconnectError?.message, details: disconnectError?.output?.payload },
          'identifiants WhatsApp invalides ou révoqués, session supprimée',
        )
        return
      }

      if (!registered) {
        await updateConnectionStatus(numero, 'disconnected')
        logger.warn(
          { numero, code, err: disconnectError?.message, details: disconnectError?.output?.payload },
          'connexion de pairing interrompue; identifiants conservés, une nouvelle demande de code est possible',
        )
        return
      }

      logger.info({ numero, code }, 'connexion interrompue; les identifiants sont conservés')
      scheduleReconnect(numero)
      await updateConnectionStatus(numero, 'disconnected')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    let privateMode = false
    if (messages.some((msg) => msg.message && !msg.key.fromMe)) {
      try {
        const user = await User.findByPk(numero, { attributes: ['botMode'] })
        privateMode = user?.botMode === 'private'
      } catch (error) {
        logger.error({ numero, err: error.message }, 'failed to read bot mode')
        return
      }
    }

    for (const msg of messages) {
      const jid = msg.key.remoteJid
      const isStatus = jid === 'status@broadcast'

      if (isStatus && !msg.key.fromMe) {
        try {
          const user = await User.findByPk(numero, {
            attributes: ['autostatus', 'autoreact'],
          })

          if (user?.autostatus && msg.key.id) {
            await sock.readMessages([msg.key])
          }

          if (user?.autoreact && msg.key.id && msg.key.participant) {
            await sock.sendMessage(
              'status@broadcast',
              { react: { text: '💚', key: msg.key } },
              { statusJidList: [msg.key.participant] },
            )
          }
        } catch (error) {
          logger.error({ numero, jid, err: error.message }, 'échec de l’auto-lecture ou réaction au statut')
        }
      }

      if (!msg.key.fromMe && !isStatus && msg.message && msg.key.id) {
        try {
          const user = await User.findByPk(numero, { attributes: ['autoread'] })
          if (user?.autoread && !isBotMentioned(msg, sock)) {
            await sock.readMessages([msg.key])
          }
        } catch (error) {
          logger.error({ numero, jid, err: error.message }, 'échec de l’auto-lecture des messages')
        }
      }

      if (!msg.message || (privateMode && !msg.key.fromMe)) continue

      if (jid?.endsWith('@g.us')) {
        try {
          await moderateGroupMessage(sock, msg)
        } catch (error) {
          logger.error({ numero, jid, err: error.message }, 'échec du middleware antilink')
        }
        try {
          await enforceGroupSlowmode(sock, msg)
        } catch (error) {
          logger.error({ numero, jid, err: error.message }, 'failed to enforce group slowmode')
        }
      }

      try {
        const handleMessage = require('./messageHandler')
        await handleMessage(sock, numero, msg)
      } catch (e) {
        logger.error({ numero, err: e.message }, 'erreur handler')
      }
    }
  })

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add' && action !== 'remove') return
    try {
      const user = await User.findByPk(numero, { attributes: ['botMode'] })
      if (user?.botMode === 'private') return
    } catch (error) {
      logger.error({ numero, id, err: error.message }, 'failed to read bot mode')
      return
    }

    for (const participant of participants) {
      await sendParticipantNotice(sock, id, participant, action)
    }
  })

  sock.ev.on('group.join-request', async ({ id, participant, participantPn, action }) => {
    if (action !== 'created') return

    try {
      const settings = await GroupSetting.findByPk(id, { attributes: ['autoAcceptEnabled'] })
      if (!settings?.autoAcceptEnabled) return

      const participantJid = participantPn || participant
      if (!participantJid) {
        logger.warn({ numero, id }, 'join request did not include a participant JID')
        return
      }

      const results = await sock.groupRequestParticipantsUpdate(id, [participantJid], 'approve')
      const succeeded = Array.isArray(results) &&
        results.some((result) => Number(result.status) >= 200 && Number(result.status) < 300)
      if (!succeeded) {
        logger.warn({ numero, id, participantJid, results }, 'automatic join request approval failed')
      } else {
        logger.info({ numero, id, participantJid }, 'automatically approved group join request')
      }
    } catch (error) {
      logger.error({ numero, id, participant, err: error.message }, 'automatic join request approval failed')
    }
  })

  // Pairing code (seulement si pas encore lié)
  if (!sock.authState.creds.registered) {
    try {
      await sock.waitForSocketOpen()
      await new Promise((resolve) => setTimeout(resolve, 3000))
      if (!sock.ws.isOpen) {
        const error = new Error('WhatsApp a fermé la connexion avant la demande du code.')
        error.output = { statusCode: DisconnectReason.connectionClosed }
        throw error
      }
      return await sock.requestPairingCode(numero)
    } catch (error) {
      sock.stopped = true
      if (sessions.get(numero) === sock) sessions.delete(numero)
      try {
        sock.end(error)
      } catch (closeError) {
        logger.warn({ numero, err: closeError.message }, 'fermeture du socket de pairing déjà terminée')
      }
      await User.update({ status: 'disconnected' }, { where: { numero } })
      throw error
    }
  }
  return null
}

async function stopSession(numero, { logout = false } = {}) {
  const reconnectTimer = reconnectTimers.get(numero)
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimers.delete(numero)
  reconnectAttempts.delete(numero)

  const sock = sessions.get(numero)
  if (sock) {
    sock.stopped = true
    sessions.delete(numero)
  }

  if (logout) {
    if (sock) {
      try {
        await sock.logout()
      } catch (err) {
        logger.warn({ numero, err: err.message }, 'déconnexion WhatsApp déjà interrompue')
      }
    }
    removeAuth(numero)
    await User.update({ status: 'disconnected' }, { where: { numero } })
  } else if (sock) {
    sock.end(undefined)
  }
}

async function restartSession(numero) {
  if (restartOperations.has(numero)) return restartOperations.get(numero)

  const operation = (async () => {
    if (!hasRegisteredAuth(numero)) {
      const error = new Error(`No linked WhatsApp session exists for ${numero}.`)
      error.status = 409
      throw error
    }

    await stopSession(numero)
    try {
      await updateConnectionStatus(numero, 'disconnected')
      await startSession(numero)
      return { numero, status: 'restarting' }
    } catch (error) {
      scheduleReconnect(numero)
      throw error
    }
  })()

  restartOperations.set(numero, operation)
  try {
    return await operation
  } finally {
    if (restartOperations.get(numero) === operation) restartOperations.delete(numero)
  }
}

async function restartAllSessions() {
  const users = await User.findAll({ attributes: ['numero'], raw: true })
  const numbers = []
  const failures = []
  let skipped = 0

  for (const user of users) {
    try {
      if (hasRegisteredAuth(user.numero)) {
        numbers.push(user.numero)
      } else {
        skipped++
      }
    } catch (error) {
      failures.push({ numero: user.numero, error: error.message })
    }
  }

  let nextIndex = 0
  const workerCount = Math.min(3, numbers.length)
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < numbers.length) {
      const numero = numbers[nextIndex++]
      try {
        await restartSession(numero)
      } catch (error) {
        logger.error({ numero, err: error }, 'échec du redémarrage de session')
        failures.push({ numero, error: error.message })
      }
    }
  }))

  const failedNumbers = new Set(failures.map((failure) => failure.numero))
  return {
    restarted: numbers.filter((numero) => !failedNumbers.has(numero)).length,
    skipped,
    failed: failures,
  }
}

// Au démarrage : relance toutes les sessions déjà liées
async function restoreSessions() {
  const users = await User.findAll()
  let i = 0
  for (const u of users) {
    const credsPath = path.join(sessionDir(u.numero), 'creds.json')
    if (!fs.existsSync(credsPath)) continue

    let registered
    try {
      registered = JSON.parse(fs.readFileSync(credsPath, 'utf8')).registered
    } catch (error) {
      logger.warn({ numero: u.numero, err: error.message }, 'identifiants de session illisibles; restauration ignorée')
      continue
    }

    if (!registered) continue

    setTimeout(() => startSession(u.numero).catch((error) => {
      logger.error({ numero: u.numero, err: error }, 'échec de restauration de session')
    }), i++ * 5000)
  }
  logger.info(`${i} session(s) à restaurer`)
}

module.exports = { sessions, startSession, stopSession, restartSession, restartAllSessions, restoreSessions }