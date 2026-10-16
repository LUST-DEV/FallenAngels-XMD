async function getLyrics(query) {
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      const match = data.find(item => item.plainLyrics);
      if (match && match.plainLyrics) {
        return {
          title: match.trackName,
          artist: match.artistName,
          lyrics: match.plainLyrics,
          image: null
        };
      }
    }
  } catch (e) {
    console.log("LRCLIB failed, trying fallback...");
  }

  try {
    const res2 = await fetch(`https://api.popcat.xyz/lyrics?song=${encodeURIComponent(query)}`);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.lyrics) {
        return {
          title: data2.title || query,
          artist: data2.artist || 'Unknown Artist',
          lyrics: data2.lyrics,
          image: data2.image || null
        };
      }
    }
  } catch (e) {
    console.log("Popcat API failed.");
  }

  return null;
}

module.exports = {
  name: 'lyrics',
  desc: 'Search and display song lyrics',
  async run({ args, reply, sock, jid, msg }) {
    const query = args.join(' ').trim();
    if (!query) {
      return reply('> 𝐔ꜱᴀɢᴇ: .lyrics <sᴏɴɢ ᴛɪᴛʟᴇ ᴀɴᴅ ᴀʀᴛɪsᴛ>');
    }
    if (query.length > 200) {
      return reply('> ❌ 𝐓ʜᴇ sᴇᴀʀᴄʜ ǫᴜᴇʀʏ ᴍᴜsᴛ ʙᴇ 200 ᴄʜᴀʀᴀᴄᴛᴇʀs ᴏʀ ғᴇᴡᴇʀ.');
    }

    try {
      const songData = await getLyrics(query);

      if (!songData || !songData.lyrics) {
        return reply(`> ❌ 𝐍ᴏ ʟʏʀɪᴄs ғᴏᴜɴᴅ ғᴏʀ: *${query}*`);
      }

      let lyrics = songData.lyrics;
      if (lyrics.length > 3900) {
        lyrics = lyrics.substring(0, 3800) + '\n\n...[𝐋ʏʀɪᴄs ᴛᴏᴏ ʟᴏɴɢ, ᴛʀᴜɴᴄᴀᴛᴇᴅ]';
      }

      const formattedText = `🎶 *${songData.title.toUpperCase()}* — *${songData.artist}*\n\n${lyrics}`;
      const targetJid = jid || (msg && msg.key.remoteJid);

      if (songData.image && sock && targetJid) {
        return await sock.sendMessage(targetJid, {
          image: { url: songData.image },
          caption: formattedText
        }, { quoted: msg });
      }

      return reply(formattedText);

    } catch (error) {
      console.error("Lyrics Error:", error);
      return reply('> ❌ 𝐔ɴᴀʙʟᴇ ᴛᴏ ғᴇᴛᴄʜ ʟʏʀɪᴄs ᴀᴛ ᴛʜᴇ ᴍᴏᴍᴇɴᴛ.');
    }
  },
};
