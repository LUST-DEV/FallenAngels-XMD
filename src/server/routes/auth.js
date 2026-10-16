const router = require('express').Router()
const adminAuth = require('../middleware/adminAuth')

router.post('/auth/login', (req, res) => {
  if (!adminAuth.verifyPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password.' })
  }
  adminAuth.setSessionCookie(req, res)
  return res.json({ ok: true })
})

router.post('/auth/logout', (req, res) => {
  adminAuth.clearSessionCookie(req, res)
  res.json({ ok: true })
})

router.get('/auth/session', adminAuth, (req, res) => res.json({ authenticated: true }))

module.exports = router
