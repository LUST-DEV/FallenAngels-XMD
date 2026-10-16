const { setdesc } = require('../groupCommands')

module.exports = {
  name: 'setdesc',
  desc: 'Change the group description (admin)',
  run: setdesc,
}
