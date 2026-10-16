const crypto = require('crypto')
const config = require('../../config')

const cookieName = 'fallen_admin'
const sessionDuration = 12 * 60 * 60 * 1000
const signingKey = () => crypto.createHash('sha256').update(config.adminPassword || '').digest()

function createSession() {
  const expires = Date.now() + sessionDuration
  const value = String(expires)
  const signature = crypto.createHmac('sha256', signingKey()).update(value).digest('hex')
  return { value: `${value}.${signature}`, expires }
}

function isValidSession(value) {
  if (!config.adminPassword || typeof value !== 'string') return false
  const [expires, signature, extra] = value.split('.')
  if (!expires || !signature || extra || !/^\d+$/.test(expires) || Number(expires) <= Date.now()) {
    return false
  }

  const expected = crypto.createHmac('sha256', signingKey()).update(expires).digest()
  let actual
  try {
    actual = Buffer.from(signature, 'hex')
  } catch {
    return false
  }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function readSessionCookie(req) {
  const cookies = (req.headers.cookie || '').split(';')
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${cookieName}=`))
  return entry ? entry.trim().slice(cookieName.length + 1) : ''
}

function cookieOptions(req, maxAge) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https'
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

function setSessionCookie(req, res) {
  const session = createSession()
  const secure = req.secure || req.get('x-forwarded-proto') === 'https'
  res.setHeader(
    'Set-Cookie',
    `${cookieName}=${encodeURIComponent(session.value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionDuration / 1000)}${secure ? '; Secure' : ''}`,
  )
}

function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', cookieOptions(req, 0))
}

module.exports = function adminAuth(req, res, next) {
  if (!isValidSession(readSessionCookie(req))) {
    return res.status(401).json({ error: 'Authentification requise.' })
  }
  return next()
}

module.exports.createSession = createSession
module.exports.isValidSession = isValidSession
module.exports.setSessionCookie = setSessionCookie
module.exports.clearSessionCookie = clearSessionCookie
module.exports.verifyPassword = (password) => {
  if (!config.adminPassword || typeof password !== 'string') return false
  const provided = Buffer.from(password)
  const expected = Buffer.from(config.adminPassword)
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}
