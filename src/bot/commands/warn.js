const { warn } = require('../groupCommands')

module.exports = { name: 'warn', desc: 'Warn a group member; remove them after three warnings', run: warn }
