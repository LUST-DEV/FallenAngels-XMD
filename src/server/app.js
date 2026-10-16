const express = require('express')
const path = require('path')
const logger = require('../logger')
const authRoutes = require('./routes/auth')
const pairRoutes = require('./routes/pair')
const statsRoutes = require('./routes/stats')
const userRoutes = require('./routes/User')

const app = express()
const publicDir = path.join(__dirname, '..', '..', 'public')

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))
app.use('/api', authRoutes)
app.use('/api', pairRoutes)
app.use('/api', statsRoutes)
app.use('/api', userRoutes)

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }))
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')))
app.get('/dashboard', require('./middleware/adminAuth'), (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'))
})
app.get('/dashboard.html', require('./middleware/adminAuth'), (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'))
})

app.get('/vendor/chart.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js'))
})

app.use(express.static(publicDir, { index: false }))
app.get('/desc', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'desc.md'))
})
app.get('/desc.md', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'desc.md'))
})
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }))
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  logger.error({ err }, 'Erreur HTTP')
  res.status(err.status || 500).json({
    error: err.status && err.status < 500 ? err.message : 'An internal error occurred.',
  })
})

module.exports = app
