const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

function unwrapMessage(msg) {
    while (true) {
        if (!msg) return null;
        if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
        else if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
        else if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
        else if (msg.viewOnceMessageV2Extension) msg = msg.viewOnceMessageV2Extension.message;
        else return msg;
    }
}

module.exports = {
    name: 'vv',
    async run(sock, jid, message, args) {
        // Gère à la fois run(sock, jid, message, args) ET run({ sock, jid, msg, message, args })
        if (typeof sock === 'object' && sock.sock) {
            const ctxObj = sock;
            sock = ctxObj.sock;
            jid = ctxObj.jid;
            message = ctxObj.message || ctxObj.msg;
            args = ctxObj.args;
        }

        const m = message;

        try {
            const ctx = m?.message?.extendedTextMessage?.contextInfo;
            if (!ctx?.quotedMessage) {
                return await sock.sendMessage(jid, { text: "> ⚠️ 𝗨ꜱᴀɢᴇ : ʀᴇᴘʟʏ ᴛᴏ ᴀ ꜱɪɴɢʟᴇ‑ᴠɪᴇᴡ ᴍᴇꜱꜱᴀɢᴇ" }, { quoted: m });
            }

            let msg = unwrapMessage(ctx.quotedMessage);
            if (!msg) {
                return await sock.sendMessage(jid, { text: "> ❌ 𝗘ʀʀᴏʀ: ᴜɴᴀʙʟᴇ ᴛᴏ ʀᴇᴀᴅ ᴛʜᴇ ᴍᴇssᴀɢᴇ. sᴀᴍᴇ ᴛʜɪɴɢ" }, { quoted: m });
            }

            const type = Object.keys(msg)[0];
            if (!type || (!type.includes("imageMessage") && !type.includes("videoMessage"))) {
                return await sock.sendMessage(jid, { text: "> ⚠️ 𝐈ɴᴄᴏᴍᴘᴀᴛɪʙʟᴇ* : ᴛʜɪs ᴍᴇssᴀɢᴇ ɪs ɴᴏᴛ ᴀ sɪɴɢʟᴇ‑ᴠɪᴇᴡ ɪᴍᴀɢᴇ ᴏʀ ᴠɪᴅᴇᴏ" }, { quoted: m });
            }

            const media = msg[type];
            const mediaType = type.replace("Message", "").toLowerCase();

            const stream = await downloadContentFromMessage(media, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const caption = "> 𝐔ɴɪǫᴜᴇ ᴠɪᴇᴡ ᴜɴʙʟᴏᴄᴋᴇᴅ †";

            if (type.includes("imageMessage")) {
                await sock.sendMessage(jid, { image: buffer, caption }, { quoted: m });
            } else {
                await sock.sendMessage(jid, { video: buffer, caption }, { quoted: m });
            }

        } catch (e) {
            console.error("Erreur VV:", e);
            await sock.sendMessage(jid, { text: "> ❌ 𝐄ʀʀᴏʀ : ʀᴇᴛʀɪᴇᴠᴀʟ ᴇʀʀᴏʀ." }, { quoted: m });
        }
    }
};