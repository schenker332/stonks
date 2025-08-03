# Stonks Finance Tracker

## Voraussetzungen

```bash
# PostgreSQL installieren
brew install postgresql

# Prisma Dependencies installieren
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

## Setup

### 1. **PostgreSQL starten**
```bash
brew services start postgresql

# Status überprüfen
brew services list
```

### 2. **Datenbank & Rolle anlegen**
```bash
psql -U niclas -d postgres

# In der PostgreSQL Shell:
CREATE ROLE 'USERNAME' WITH LOGIN;
CREATE DATABASE stonks_db OWNER 'USERNAME';
\q
```

### 3. **Repo klonen & Abhängigkeiten installieren**
```bash
git clone git@github.com:schenker332/stonks.git
npm install
```

### 4. **Umgebungsdatei konfigurieren**
Erstelle eine `.env` Datei im Root-Verzeichnis:
```env
DATABASE_URL="postgresql://USERNAME@localhost:5432/stonks_db?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```
> **Wichtig**: Ersetze `USERNAME` mit deinem echten PostgreSQL Benutzernamen

### 5. **Prisma-Client generieren & Migration ausführen**
```bash
# Prisma Client generieren
npx prisma generate

# Datenbank Schema erstellen
npx prisma migrate dev --name init
```

### 6. **Development Server starten**
```bash
npm run dev
```

🎉 Öffne [http://localhost:3000](http://localhost:3000) in deinem Browser!



## Entwicklung

```bash
# Prisma Studio öffnen (Datenbank GUI)
npx prisma studio
```


