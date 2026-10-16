// Load folder file
const fs = require('fs');
const path = require('path');
const logger = require('../../logger')

const commands = new Map();

for (const file of fs.readdirSync(__dirname)) {
    if (file === 'index.js' || !file.endsWith('.js')) continue

    try {
        const cmd = require(path.join(__dirname, file))
        commands.set(cmd.name, cmd)
        cmd.aliases?.forEach((alias) => commands.set(alias, cmd))
    } catch (error) {
        logger.error({ file, err: error.message }, 'failed to load bot command')
    }
}

module.exports = commands;