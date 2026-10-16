const { rejectall } = require('../groupCommands')

module.exports = { name: 'rejectall', desc: 'Reject all pending group join requests (admin)', run: rejectall }
