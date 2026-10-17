const router = require('express').Router()
const { User, CommandLog } = require('../../database')
const adminAuth = require('../middleware/adminAuth')
const { sessions, stopSession, restartSession, restartAllSessions } = require('../../bot/sessionManager')

// Liste des users
router.get('/users', adminAuth, async (req, res) => {
  const users = await User.findAll({ order: [['createdAt', 'DESC']], raw: true })
  res.json(users.map((u) => ({ ...u, online: sessions.has(u.numero) })))
})

router.post('/users/restart-all', adminAuth, async (req, res) => {
  const result = await restartAllSessions()
  res.json({ ok: result.failed.length === 0, ...result })
})

router.post('/users/:numero/restart', adminAuth, async (req, res) => {
  const { numero } = req.params
  if (!/^\d{5,15}$/.test(numero)) {
    return res.status(400).json({ error: 'Invalid phone number.' })
  }

  const user = await User.findByPk(numero)
  if (!user) return res.status(404).json({ error: 'User not found.' })

  const result = await restartSession(numero)
  return res.json({ ok: true, ...result })
})

router.delete('/users/:numero', adminAuth, async (req, res) => {
  const { numero } = req.params
  if (!/^\d{5,15}$/.test(numero)) {
    return res.status(400).json({ error: 'Invalid phone number.' })
  }

  await stopSession(numero, { logout: true })
  await CommandLog.destroy({ where: { numero } })
  await User.destroy({ where: { numero } })
  res.json({ ok: true })
})

module.exports = router