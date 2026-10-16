const router = require('express').Router()
const { User } = require('../../database')
const normalizePhone = require('../../utils/phone')
const { startSession, sessions } = require('../../bot/sessionManager')

router.post('/pair', async (req, res) => {
  const phone = normalizePhone.parse(req.body?.numero)
  if (!phone) return res.status(400).json({ error: 'Enter a valid international phone number, including the country calling code.' })

  const { numero, country } = phone
  const [user] = await User.findOrCreate({
    where: { numero },
    defaults: { country }
  })
  if (user.country !== country) await user.update({ country })

  const existingSession = sessions.get(numero)
  if (existingSession?.authState.creds.registered) {
    if (user.status === 'connected') {
      return res.status(409).json({ error: 'This number is already connected.' })
    }

    return res.status(503).json({
      error: 'This session is already linked and is trying to reconnect. Wait a few moments and try again; a new pairing code cannot be created while it is reconnecting.',
      retryable: true,
    })
  }

  let pairingCode
  try {
    pairingCode = await startSession(numero)
  } catch (error) {
    const code = error.output?.statusCode
    if (code === 428 || code === 408 || code === 503) {
      return res.status(503).json({
        error: 'WhatsApp interrupted the connection before generating a code. Your data has been preserved; please try again in a few seconds.',
        retryable: true,
      })
    }
    throw error
  }

  if (!pairingCode) {
    const currentSession = sessions.get(numero)
    if (currentSession?.authState.creds.registered && user.status === 'connected') {
      return res.status(409).json({ error: 'This number is already connected.' })
    }

    return res.status(503).json({
      error: 'No pairing code was generated. Check your WhatsApp connection and try again in a few moments.',
      retryable: true,
    })
  }

  return res.status(200).json({
    numero,
    pairingCode,
    status: 'pairing',
    message: 'Enter this code in WhatsApp: Linked devices > Link a device > Link with phone number.',
  })
})

module.exports = router
