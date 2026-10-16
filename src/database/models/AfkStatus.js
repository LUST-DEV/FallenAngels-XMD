const { DataTypes } = require('sequelize')

module.exports = (sequelize) => sequelize.define('AfkStatus', {
  numero: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  jid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  reason: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  since: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: false,
})
