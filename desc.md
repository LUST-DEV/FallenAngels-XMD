# Fallen X Angels — Command Guide

English / Français · Default prefix: `.` · Owner-only commands must be sent from the bot's own WhatsApp account.

This is the complete command guide in one file. It can be read as Markdown or rendered by any Markdown viewer that supports embedded HTML.

## Before using commands / Avant d’utiliser les commandes

- Replace `.` in the examples with your current prefix if you changed it with `.setprefix`.
- In group commands, `<member>` can usually be a WhatsApp mention or a phone number with country code.
- **Owner-only** means the command must be sent from the WhatsApp account running the bot. A group admin is not automatically the bot owner.
- Commands needing a group admin are marked **Group admin**. If the bot also needs to be an admin, it is stated separately.
- Selected commands react to your message with a matching emoji while they run. / Certaines commandes réagissent à ton message avec un emoji adapté pendant leur exécution.
- Commands that call an external service may be unavailable when that service is down or rate-limited.

---

## Group management / Gestion du groupe

| Command | Access | English | Français |
|---|---|---|---|
| `.accept <number>` | Group admin + bot admin | Approves one pending join request. Example: `.accept +50912345678`. | Accepte une demande d’adhésion en attente. Exemple : `.accept +50912345678`. |
| `.acceptall` | Group admin + bot admin | Approves all pending join requests. | Accepte toutes les demandes d’adhésion en attente. |
| `.reject <number>` | Group admin + bot admin | Rejects one pending join request. | Refuse une demande d’adhésion en attente. |
| `.rejectall` | Group admin + bot admin | Rejects all pending join requests. | Refuse toutes les demandes d’adhésion en attente. |
| `.autoaccept on/off` | Group admin + bot admin | Enables or disables the bot's automatic approval of new join requests in this group. `off` stops the bot auto-approving; it may not turn off WhatsApp's join-approval setting itself. | Active ou arrête l’approbation automatique des nouvelles demandes par le bot dans ce groupe. `off` arrête l’auto-acceptation du bot, mais ne désactive pas forcément le réglage de demandes d’adhésion de WhatsApp. |
| `.add <member>` | Group admin + bot admin | Adds a member by mention or phone number. WhatsApp may still require the person to accept an invitation. | Ajoute un membre par mention ou numéro. WhatsApp peut quand même demander à la personne d’accepter l’invitation. |
| `.kick <member>` | Group admin + bot admin | Removes a member from the current group. | Retire un membre du groupe actuel. |
| `.kickall` | Group admin + bot admin | Removes non-admin members in batches. Admins, the bot and the command sender are preserved. | Retire les membres qui ne sont pas admins, par lots. Les admins, le bot et l’auteur de la commande sont conservés. |
| `.promote <member>` | Group admin + bot admin | Promotes a current member to group admin. | Nomme admin un membre actuel du groupe. |
| `.demote <member>` | Group admin + bot admin | Removes a member's group-admin role. | Retire le rôle d’admin à un membre. |
| `.admins` | Group | Lists and mentions the group's admins and owner. | Affiche et mentionne les admins et le propriétaire du groupe. |
| `.groupinfo` | Group | Shows the group name, member count, creation date and description. | Affiche le nom du groupe, le nombre de membres, la date de création et la description. |
| `.grouplink` | Group admin + bot admin | Shows the current group's WhatsApp invitation link. Treat the link as private: anyone who has it may be able to join. | Affiche le lien d’invitation WhatsApp du groupe actuel. Garde ce lien privé : toute personne qui le possède peut éventuellement rejoindre le groupe. |
| `.close` | Group admin + bot admin | Restricts sending messages to group admins. | Réserve l’envoi des messages aux admins du groupe. |
| `.open` | Group admin + bot admin | Allows all group members to send messages again. | Permet de nouveau à tous les membres d’envoyer des messages. |
| `.antilink on/off` | Group admin; bot admin required to enable | When enabled, removes detected links posted by non-admin members if the bot can delete messages. Admins are exempt. | Une fois activé, supprime les liens détectés envoyés par les membres non-admins, si le bot peut supprimer les messages. Les admins sont exemptés. |
| `.slowmode <seconds>` | Group admin; bot admin required to enable | Limits how often each non-admin member can send messages. Use `.slowmode 10` to allow one message every 10 seconds, or `.slowmode off` to disable it. Admins bypass the limit. | Limite la fréquence des messages de chaque membre non-admin. `.slowmode 10` autorise un message toutes les 10 secondes; `.slowmode off` désactive la limite. Les admins ne sont pas limités. |
| `.warn <member>` | Group admin + bot admin | Gives a member a warning. Three stored warnings can cause removal from the group. | Donne un avertissement à un membre. À trois avertissements enregistrés, le bot peut le retirer du groupe. |
| `.warnings <member>` | Group admin | Shows the member's warning count. | Affiche le nombre d’avertissements du membre. |
| `.resetwarn <member>` | Group admin | Clears the member's stored warnings. | Efface les avertissements enregistrés du membre. |
| `.tagall [message]` | Group admin | Mentions all group members, optionally with a short note. | Mentionne tous les membres, avec un petit message facultatif. |
| `.tagadmin [message]` | Group admin | Mentions only group admins, optionally with a note. | Mentionne seulement les admins, avec un petit message facultatif. |
| `.hidetag <message>` | Group admin | Sends text that mentions all members without displaying a list of names. | Envoie un texte qui notifie tous les membres sans afficher la liste des noms. |
| `.poll <question> \| <choice 1> \| <choice 2>` | Anyone | Creates a single-select poll. Add choices separated by `|`; at least two and at most twelve choices. | Crée un sondage à choix unique. Sépare les choix avec `|`; il faut de deux à douze choix. |
| `.rules` | Group | Displays the rules saved for the current group. | Affiche les règles enregistrées pour le groupe actuel. |
| `.setrules <text>` | Group admin | Saves the group's rules for the `.rules` command and welcome/goodbye templates. | Enregistre les règles du groupe pour `.rules` et les messages d’accueil/de départ. |
| `.welcome on/off` | Group admin | Turns join announcements on or off for this group. | Active ou désactive les annonces d’arrivée dans ce groupe. |
| `.goodbye on/off` | Group admin | Turns leave announcements on or off for this group. | Active ou désactive les annonces de départ dans ce groupe. |
| `.setwelcome <text>` | Group admin | Sets the join-message template. Variables include `@user`, `@group`, `@rules`, `@date`, `@time`, `@count`, and `@desc`. | Définit le modèle du message d’arrivée. Variables disponibles : `@user`, `@group`, `@rules`, `@date`, `@time`, `@count` et `@desc`. |
| `.setgoodbye <text>` | Group admin | Sets the leave-message template. It supports the same group/user/date variables as the welcome template. | Définit le modèle du message de départ. Il accepte les mêmes variables de membre, groupe et date que le message d’accueil. |
| `.setname <new name>` | Group admin + bot admin | Changes the group name. WhatsApp limits the name length. | Change le nom du groupe. WhatsApp limite la longueur du nom. |
| `.setdesc <text>` | Group admin + bot admin | Changes the group description. | Change la description du groupe. |

### Slow mode in simple terms / Slowmode en termes simples

Slow mode is a **per-member cooldown**, not a group-wide timer. With `.slowmode 15`, a regular member can send one message, then must wait 15 seconds before their next message. The first message is allowed. Group admins bypass the cooldown. If the bot lacks permission to delete messages, it may be unable to enforce the restriction. Turn it off with `.slowmode off`.

Le slowmode est un **délai individuel par membre**, pas un compte à rebours commun au groupe. Avec `.slowmode 15`, un membre ordinaire peut envoyer un message, puis doit attendre 15 secondes avant le suivant. Le premier message est autorisé. Les admins ne sont pas concernés. Sans permission de suppression, le bot peut ne pas réussir à faire respecter la limite. Utilise `.slowmode off` pour l’arrêter.

---

## Away, owner and account settings / Absence, propriétaire et réglages

| Command | Access | English | Français |
|---|---|---|---|
| `.afk [reason]` | Anyone | Marks you as away. For example, `.afk Sleeping`. The next message you send clears your status; group members who mention you see the away notice and reason. | Indique que tu es absent. Exemple : `.afk Je dors`. Ton prochain message enlève le statut; si quelqu’un te mentionne dans un groupe, le bot affiche l’avis et la raison. |
| `.afk off` | Anyone | Manually clears your away status. | Retire manuellement ton statut d’absence. |
| `.anticall on/off` | Owner only | Turns automatic rejection of incoming calls on or off for the bot account. | Active ou désactive le rejet automatique des appels entrants sur le compte du bot. |
| `.setprefix <symbol>` | Owner only | Changes the command prefix to one to three symbols, such as `.setprefix !`. Letters, numbers and spaces are not allowed. | Change le préfixe pour un à trois symboles, par exemple `.setprefix !`. Les lettres, chiffres et espaces ne sont pas autorisés. |
| `.mode [private/public]` | Owner only | Shows the current bot mode, or changes it. In private mode, non-owner messages do not receive command replies. | Affiche ou change le mode du bot. En mode privé, les messages des autres utilisateurs ne déclenchent pas de réponses aux commandes. |
| `.autoread [on/off]` | Owner only | Controls automatic reading of private incoming messages. Without an option, it toggles the current setting. | Gère la lecture automatique des messages privés entrants. Sans option, inverse le réglage actuel. |
| `.autoreact on/off` | Owner only | Turns automatic reactions to statuses on or off. | Active ou désactive les réactions automatiques aux statuts. |
| `.autostatus [on/off]` | Owner only | Controls automatic status viewing. It also supports `react on` or `react off` for status reactions. | Gère l’affichage automatique des statuts. Accepte aussi `react on` ou `react off` pour les réactions aux statuts. |
| `.autotyping on/off` | Owner only | Shows a typing indicator before the bot runs commands. | Affiche l’indicateur de saisie avant l’exécution des commandes du bot. |
| `.leave` | Owner only, group only | Makes the bot leave the group where the command is sent. | Fait quitter au bot le groupe où la commande est envoyée. |
| `.setpp` | Owner only | Reply to an image to set the bot's profile picture. | Réponds à une image pour changer la photo de profil du bot. |
| `.pair +<country code> <number>` | Owner only | Starts a WhatsApp linked-device session and returns a pairing code. Enter the number with `+` and country code; spaces, parentheses and hyphens are accepted. Example: `.pair +1 (415) 555-2671`. | Démarre une session WhatsApp liée et renvoie un code d’association. Saisis le numéro avec `+` et l’indicatif du pays; les espaces, parenthèses et tirets sont acceptés. Exemple : `.pair +1 (415) 555-2671`. |
| `.addtoken <API key>` | Owner only, private chat | Saves and activates the AI API key. Keep the key secret. | Enregistre et active la clé API de l’IA. Garde cette clé secrète. |

**Owner-only note / Note sur les commandes Owner :** In this bot, the owner is the WhatsApp account running the session. Being a group administrator alone does not grant owner access.

---

## Media, music and images / Médias, musique et images

| Command | English | Français |
|---|---|---|
| `.audio <song or YouTube URL>` | Finds a track and sends its audio and available details. | Recherche un morceau et envoie l’audio avec les informations disponibles. |
| `.play <song or YouTube URL>`, `.song <song or YouTube URL>` | Searches for a song and sends its cover, title, artist, duration, source link and audio. Both commands do the same thing. | Recherche une chanson et envoie sa pochette, son titre, son artiste, sa durée, son lien source et son audio. Les deux commandes font la même chose. |
| `.8d`, `.nightcore`, `.reverse`, `.slowed`, `.speedup` | Reply to an audio message to apply the named effect and receive the processed audio. | Réponds à un audio pour appliquer l’effet choisi et recevoir l’audio transformé. |
| `.stickers` | Reply to an image or video to turn it into a sticker. | Réponds à une image ou une vidéo pour la transformer en sticker. |
| `.toimg` | Reply to an image to resend it, or to a sticker to convert it to PNG. | Réponds à une image pour la renvoyer, ou à un sticker pour le convertir en PNG. |
| `.tovideo` | Reply to a video to resend it, or to an animated sticker to convert it to MP4. | Réponds à une vidéo pour la renvoyer, ou à un sticker animé pour le convertir en MP4. |
| `.removebg` | Attach an image or reply to an image/sticker to remove its background. Requires `REMOVE_BG_API_KEY` in `.env`. | Joins une image ou réponds à une image/un sticker pour enlever l’arrière-plan. Nécessite `REMOVE_BG_API_KEY` dans `.env`. |
| `.wallpaper <search>` | Finds and sends a wallpaper from Wikimedia Commons, with source and license details. | Recherche et envoie un fond d’écran de Wikimedia Commons avec sa source et sa licence. |
| `.tiktok <URL>` | Downloads a TikTok video. | Télécharge une vidéo TikTok. |
| `.getpp [number/mention]` | Fetches a contact's public profile photo; without a target, uses the bot account. | Récupère la photo de profil publique d’un contact; sans cible, utilise le compte du bot. |
| `.qr <text or URL>` | Creates a QR-code image from text or a link. | Crée une image de code QR à partir d’un texte ou d’un lien. |
| `.anime <title>` | Looks up an anime and sends information with its poster when available. | Recherche un anime et envoie ses informations avec son affiche si disponible. |
| `.animequote [random\|character\|anime <title>]` | Sends a quote as the character's image caption. Examples: `.animequote`, `.animequote Naruto Uzumaki`, `.animequote anime Naruto`. | Envoie une citation dans la légende de l’image du personnage. Exemples : `.animequote`, `.animequote Naruto Uzumaki`, `.animequote anime Naruto`. |
| `.tg <sticker-pack URL>` | Owner-only. Imports stickers from a public Telegram sticker pack; needs `TELEGRAM_BOT_TOKEN`. | Owner uniquement. Importe les stickers d’un pack Telegram public; nécessite `TELEGRAM_BOT_TOKEN`. |
| `.vv` | Reply to a view-once image/video to resend it as regular media. | Réponds à une image/vidéo à vue unique pour la renvoyer comme média normal. |

---

## Fun and information / Divertissement et informations

| Command | English | Français |
|---|---|---|
| `.8ball <question>` | Gives a random magic 8-ball answer. | Donne une réponse aléatoire de boule magique. |
| `.ai <question>` | Sends a question to the AI assistant. | Envoie une question à l’assistant IA. |
| `.fact`, `.joke`, `.quote`, `.techfact` | Sends a random fact, joke, uplifting quote or technology fact. | Envoie un fait, une blague, une citation positive ou un fait technologique aléatoire. |
| `.calc <expression>` | Calculates a mathematical expression. | Calcule une expression mathématique. |
| `.translate <language> <text>` | Translates text. Example: `.translate fr Good morning`. | Traduit un texte. Exemple : `.translate en Bonjour`. |
| `.weather <city>` | Shows current weather for a city. | Affiche la météo actuelle d’une ville. |
| `.crypto <btc\|eth\|sol\|ton>` | Shows supported cryptocurrency prices and a chart. | Affiche le cours des cryptomonnaies prises en charge et un graphique. |
| `.country <country>` | Shows public country information and its flag. | Affiche des informations publiques sur un pays et son drapeau. |
| `.devinfo` | Shows the developer's Telegram link. | Affiche le lien Telegram du développeur. |
| `.bin <six-digit BIN>` | Looks up public bank-card issuer details from the first six digits. Do not send a full card number. | Recherche les informations publiques de l’émetteur à partir des six premiers chiffres. N’envoie jamais un numéro de carte complet. |
| `.dns <domain>` | Looks up common DNS records for a domain. | Recherche les principaux enregistrements DNS d’un domaine. |
| `.gituser <username>` | Displays a GitHub profile. | Affiche un profil GitHub. |
| `.npm <package>` | Shows package information from the npm registry. | Affiche les informations d’un paquet du registre npm. |
| `.lyrics <song/query>` | Searches for song lyrics. | Recherche les paroles d’une chanson. |
| `.wiki <query>` | Searches for an English Wikipedia summary. | Recherche un résumé sur Wikipédia en anglais. |
| `.shorten <URL>` | Shortens an HTTP or HTTPS link. | Raccourcit un lien HTTP ou HTTPS. |
| `.tempmail` then `.checkmail <login> <domain>` | Creates a disposable inbox and checks it. Disposable inboxes are not private. | Crée une boîte temporaire puis vérifie les messages. Ces boîtes ne sont pas privées. |
| `.id [reply/number/JID/link]` | Shows the current chat ID or resolves a contact, group or channel ID. | Affiche l’identifiant du chat ou résout l’identifiant d’un contact, groupe ou canal. |
| `.ping`, `.alive`, `.runtime`, `.uptime`, `.about`, `.cross` | Show response/system status, runtime or bot information, or the project artwork. | Affichent l’état, les statistiques, les informations du bot ou l’illustration du projet. |
| `.profile [mention]` | Shows your profile or a mentioned member's role. | Affiche ton profil ou le rôle d’un membre mentionné. |
| `.ship <mention(s)>` | Gives a playful compatibility score for one or two mentioned people. | Donne un score de compatibilité ludique pour une ou deux personnes mentionnées. |

---

## Owner group broadcasts / Diffusions de groupe — Owner

| Command | English | Français |
|---|---|---|
| `.bcgroup <text>` | Sends a text broadcast to the bot's participating groups. | Diffuse un texte dans les groupes où le bot est présent. |
| `.gstories [text]` | Publishes text or replied media to group status audiences. | Publie un texte ou un média auquel tu réponds dans les statuts destinés aux groupes. |

---

## Menus / Menus

- `.menu` — Main menu / Menu principal.
- `.group`, `.owner`, `.aimenu`, `.fun`, `.mediamenu`, `.others` — Open a command category / Ouvre une catégorie de commandes.
- Aliases such as `.help` and `.aide` open `.menu`.
