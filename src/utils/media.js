const fs = require('fs')
const path = require('path')
const config = require('../config')
const logger = require('../logger')

const EXT = /\.(jpe?g|png|webp)$/i

// Photo au hasard dans assets/<category>, sinon à la racine d'assets
function pickImage(category) {
  if (category) {
    const namedImage = ['jpg', 'jpeg', 'png', 'webp']
      .map((extension) => path.join(config.assetsDir, `${category}.${extension}`))
      .find((file) => fs.existsSync(file))
    if (namedImage) return namedImage
  }

  const dirs = [path.join(config.assetsDir, category), config.assetsDir]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir).filter((f) => EXT.test(f))
    if (files.length)
      return path.join(dir, files[Math.floor(Math.random() * files.length)])
  }
  return null
}

module.exports = async (sock, jid, msg, caption, category = '') => {
  const img = pickImage(category)

  if (!img) {
    logger.warn(`Aucune photo dans ${config.assetsDir}/${category}`)
    return sock.sendMessage(jid, { text: caption }, { quoted: msg })
  }
  return sock.sendMessage(
    jid,
    { image: fs.readFileSync(img), caption },
    { quoted: msg }
  )
}