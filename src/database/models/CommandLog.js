const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define("CommandLog", {
        numero: {
            type: DataTypes.STRING,
            allowNull: false
        },
        command: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
}