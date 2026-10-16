const config = require('./src/config')
const logger = require('./src/logger')
const { sequelize, syncDatabase } = require('./src/database')
const app = require('./src/server/app')
const { restoreSessions } = require('./src/bot/sessionManager')

async function start() {
  if (!config.adminPassword) {
    throw new Error('ADMIN_PASSWORD doit être défini dans le fichier .env.')
  }

  await sequelize.authenticate()
  await syncDatabase()
  await restoreSessions()

  const server = app.listen(config.port, () => {
    logger.info(`Serveur démarré sur le port ${config.port}`)
  })

  const shutdown = async () => {
    server.close()
    await sequelize.close()
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

start().catch((error) => {
  logger.error({ err: error }, 'Impossible de démarrer le bot')
  process.exitCode = 1
});

