const { reject } = require('../groupCommands')

module.exports = { name: 'reject', desc: 'Reject a group join request by phone number (admin)', run: reject }
