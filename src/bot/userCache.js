const { User } = require('../database')
const config = require('../config');

const cache = new Map()



async function getPrefix(numero) {
    if (cache.has(numero)) return cache.get(numero)

    const u = await User.findByPk(numero)
    const prefix = u?.prefix || config.defaultPrefix
    cache.set(numero, prefix)
    return prefix
}

const setCachedPrefix = (numero, prefix) => cache.set(numero, prefix)

module.exports = { getPrefix, setCachedPrefix }