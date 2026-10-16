const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('GroupWarning', {
  groupJid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  participantJid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
})
