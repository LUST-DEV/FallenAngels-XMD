const router = require('express').Router()
const { User, CommandLog } = require('../../database')
const adminAuth = require('../middleware/adminAuth')
const { sessions, stopSession } = require('../../bot/sessionManager')

// Liste des users
router.get('/users', adminAuth, async (req, res) => {
  const users = await User.findAll({ order: [['createdAt', 'DESC']], raw: true })
  res.json(users.map((u) => ({ ...u, online: sessions.has(u.numero) })))
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