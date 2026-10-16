const { setname } = require('../groupCommands')

module.exports = {
  name: 'setname',
  desc: 'Change the group name (admin)',
  run: setname,
}
