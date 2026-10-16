const router = require('express').Router()
const { Op } = require('sequelize')
const { sequelize, User, CommandLog } = require('../../database')
const adminAuth = require('../middleware/adminAuth')
const { sessions } = require('../../bot/sessionManager')
const stats = require('../../utils/stats')

router.get('/stats', adminAuth, async (req, res) => {
  const activitySince = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [users, logs, commands, recentLogs, hourlyActivity, countries, cpu] = await Promise.all([
    User.count(),
    CommandLog.count(),
    CommandLog.findAll({
      attributes: ['command', [sequelize.fn('COUNT', sequelize.col('command')), 'count']],
      group: ['command'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    }),
    CommandLog.findAll({
      attributes: ['numero', 'command', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 15,
      raw: true,
    }),
    CommandLog.findAll({
      attributes: [
        [sequelize.fn('strftime', '%Y-%m-%d %H:00', sequelize.col('createdAt')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: activitySince } },
      group: [sequelize.literal('hour')],
      order: [[sequelize.literal('hour'), 'ASC']],
      raw: true,
    }),
    User.findAll({
      attributes: ['country', [sequelize.fn('COUNT', sequelize.col('numero')), 'count']],
      group: ['country'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true,
    }),
    stats.cpuUsage(),
  ])

  const activityByHour = new Map(
    hourlyActivity.map((entry) => [entry.hour, Number(entry.count)]),
  )
  const activity = Array.from({ length: 24 }, (_, index) => {
    const hour = new Date(activitySince.getTime() + index * 60 * 60 * 1000)
    const key = `${hour.getUTCFullYear()}-${String(hour.getUTCMonth() + 1).padStart(2, '0')}-${String(hour.getUTCDate()).padStart(2, '0')} ${String(hour.getUTCHours()).padStart(2, '0')}:00`
    return { hour: hour.toISOString(), count: activityByHour.get(key) || 0 }
  })

  res.json({
    users,
    online: sessions.size,
    commands,
    commandTotals: commands.reduce((sum, item) => sum + Number(item.count), 0),
    logs,
    recentLogs,
    activity,
    countries: countries.map((entry) => ({
      country: entry.country || null,
      count: Number(entry.count),
    })),
    system: {
      uptime: stats.uptime(),
      ram: stats.ramUsage(),
      cpu,
      disk: stats.diskUsage(),
    },
  })
})

module.exports = router
