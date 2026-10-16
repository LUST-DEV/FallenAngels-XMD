const { sequelize, User } = require('./src/database')

;(async () => {
  await sequelize.sync()
  const [u] = await User.findOrCreate({ where: { numero: '50948702083' } })
  console.log(u.toJSON())
})()


// Powered By Senior's Angels 
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels
// Powered By Senior's Angels