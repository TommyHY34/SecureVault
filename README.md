# 🔐 SecureVault - Guide d'installation et de lancement

Partage de fichiers éphémères chiffrés (AES-256-GCM, Zero-knowledge)

---

## 📋 Prérequis

- **Node.js** >= 18.0.0 et **npm** >= 9.0.0
- **PostgreSQL** >= 13

---

## 🗄️ 1. Configurer PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER securevault_user WITH PASSWORD 'Sv@Secure2026!';
CREATE DATABASE securevault OWNER securevault_user;
GRANT ALL PRIVILEGES ON DATABASE securevault TO securevault_user;
\q
```

Puis initialiser le schéma :

```bash
psql -U securevault_user -d securevault -f backend/sql/schema.sql
```

> 💡 Tous les mots de passe sont dans **PASSWORDS.txt**

---

## ⚙️ 2. Lancer le Backend

```bash
cd backend
npm install
npm run dev
```

✅ Tourne sur : http://localhost:3001

---

## 🌐 3. Lancer le Frontend

Dans un **nouveau terminal** :

```bash
cd frontend
npm install
npm start
```

✅ Ouvre sur : http://localhost:3000

---

## 🚀 Utilisation

**Partager un fichier :**
1. Allez sur http://localhost:3000
2. Glissez/sélectionnez un fichier
3. Choisissez les options et cliquez **🔐 Chiffrer & Partager**
4. Copiez et partagez le lien généré

**Télécharger un fichier :**
1. Ouvrez le lien de partage
2. Cliquez **🔓 Télécharger & Déchiffrer**
3. Le fichier est déchiffré localement dans le navigateur

---

## 🔒 Sécurité

- Chiffrement **AES-256-GCM** côté client (Web Crypto API)
- La clé n'est **jamais envoyée au serveur** (fragment URL #)
- Suppression automatique après expiration
- Helmet, Rate-limiting, CORS, validation Multer

---

## 📁 Structure

```
securevault-project/
├── PASSWORDS.txt           ← Mots de passe (ne pas committer!)
├── README.md
├── backend/
│   ├── .env                ← Config (ne pas committer!)
│   ├── sql/schema.sql
│   └── src/
│       ├── server.js
│       ├── config/database.js
│       ├── controllers/
│       ├── middleware/security.js
│       ├── models/File.js
│       ├── routes/index.js
│       └── utils/cleanup.js
└── frontend/
    └── src/
        ├── App.js           ← Routing React
        ├── components/
        │   ├── Upload.js    ← Chiffrement + upload
        │   └── Download.js  ← Téléchargement + déchiffrement
        └── utils/crypto.js  ← AES-256-GCM
```
