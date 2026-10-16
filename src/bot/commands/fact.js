const facts = [
  'Oᴄᴛᴏᴘᴜsᴇs ʜᴀᴠᴇ ᴛʜʀᴇᴇ ʜᴇᴀʀᴛs.',
  'A ᴅᴀʏ ᴏɴ Vᴇɴᴜs ɪs ʟᴏɴɢᴇʀ ᴛʜᴀɴ ɪᴛs ʏᴇᴀʀ.',
  'Sʜᴀʀᴋs ᴀʀᴇ ᴏʟᴅᴇʀ ᴛʜᴀɴ ᴛʀᴇᴇs.',
  'Hᴏɴᴇʏ ᴄᴀɴ ʟᴀsᴛ ᴛʜᴏᴜsᴀɴᴅs ᴏғ ʏᴇᴀʀs ᴡʜᴇɴ sᴛᴏʀᴇᴅ ᴘʀᴏᴘᴇʀʟʏ.',
  'Bᴀɴᴀɴᴀs ᴀʀᴇ ʙᴏᴛᴀɴɪᴄᴀʟʟʏ ʙᴇʀʀɪᴇs.',
]

module.exports = {
  name: 'fact',
  desc: 'Share a random fun fact',
  async run({ reply }) {
    await reply(`🧠 Dɪᴅ ʏᴏᴜ ᴋɴᴏᴡ? ${facts[Math.floor(Math.random() * facts.length)]}`)
  },
}
