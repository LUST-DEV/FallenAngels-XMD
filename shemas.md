
Fallen-angels-xmd/
├── package.json
├── .env                      # PORT, ADMIN_PASSWORD, DEFAULT_PREFIX
├── .gitignore                # node_modules, sessions/, *.db, .env
├── index.js                  # point d'entrée : DB, serveur, restauration des sessions
│
├── src/
│   ├── config.js             # lit le .env
│   ├── logger.js             # instance pino
│   │
│   ├── database/
│   │   ├── index.js          # connexion Sequelize + sync
│   │   └── models/
│   │       ├── User.js       # numero, country, prefix, status, autotyping
│   │       ├── CommandLog.js # numero, command, createdAt
│   │       └── GroupSetting.js # welcome/goodbye settings per group
│   │
│   ├── bot/
│   │   ├── sessionManager.js # Map des sockets, start / stop / restore
│   │   ├── messageHandler.js # messages.upsert, lecture du préfixe du user
│   │   └── commands/
│   │       ├── index.js      # charge auto toutes les commandes
│   │       ├── ping.js
│   │       ├── menu.js
│   │       ├── setprefix.js  # le propriétaire change le préfixe
│   │       ├── autotyping.js # active/désactive l’indicateur de saisie
│   │       ├── gstories.js   # partage texte ou média dans les groupes
│       └── group commands # add, close, tags, kicks, welcome/goodbye
│   │
│   ├── server/
│   │   ├── app.js            # Express + middlewares
│   │   ├── routes/
│   │   │   ├── pair.js       # POST /pair
│   │   │   └── stats.js      # GET /api/stats (admin)
│   │   └── middleware/
│   │       └── adminAuth.js  # protège le dashboard
│   │
│   └── utils/
│       └── phone.js          # libphonenumber-js
│
├── public/                   # le site
│   ├── index.html            # page de pairing
│   ├── dashboard.html        # analytics Chart.js
│   ├── css/style.css         # thème dark gothique
│   └── js/
│       ├── pair.js
│       └── dashboard.js
│
├── sessions/                 # un dossier d'auth Baileys par user (auto-créé)
└── data/
    └── bot.db                # SQLite (auto-créé)