# Leviathan's Ledger 🚢

Walvisvangst Scheepslogs Applicatie - Een interactieve database en visualisatie tool voor historische walvisvangst scheepslogs.

**Hack The Future 2025**

## 🎯 Overzicht

Deze applicatie digitaleert en analyseert historische walvisvangst logboeken. Het biedt:

- **AI-Powered PDF Extractie**: Intelligente parsing van scheepslog PDF's met OpenAI
- **Database**: SQLite database met gestructureerde data
- **REST API**: Express backend met uitgebreide endpoints
- **Interactieve Frontend**: React applicatie met kaarten, grafieken en tijdlijnen
- **Visualisaties**: Leaflet kaarten, Recharts grafieken, en meer

## 🤖 AI-Gestuurde Data Extractie

De applicatie gebruikt OpenAI GPT-4 om historische scheepslogs nauwkeurig te analyseren en structureren:

### Waarom AI?

Historische scheepslogs zijn vaak:
- **Ongestructureerd**: Verschillende schrijfstijlen en formaten
- **Moeilijk te parsen**: Geen consistente data formatting
- **Historisch complex**: Datums uit 1800s-1900s, oude notaties
- **Context-afhankelijk**: Scheepsnamen en details verstopt in tekst

### Wat extraheert de AI?

✅ **Scheepsnamen**: Echte scheepsnamen (niet document codes zoals "MS-220")  
✅ **Historische Datums**: Correcte datums uit 1800s-1900s (niet 2024/2025!)  
✅ **Coördinaten**: Nauwkeurige latitude/longitude van locaties  
✅ **Walvis Waarnemingen**: Species, aantal, vangsten  
✅ **Vangstgegevens**: Aantal walvissen, olie vaten, spek gewicht  
✅ **Bemanning Events**: Ziekte, overlijden, ongelukken  
✅ **Weer & Navigatie**: Weersomstandigheden, koers, wind  

### Setup

1. Verkrijg een OpenAI API key op https://platform.openai.com/api-keys
2. Maak een `server/.env` bestand:
   ```bash
   OPENAI_API_KEY=jouw_api_key_hier
   ```
3. Run AI-extractie: `npm run extract-pdfs-ai`
4. Importeer data: `npm run import-data-ai`

## 🛠️ Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- SQLite3
- OpenAI GPT-4 voor AI-extractie
- pdf-parse voor PDF extractie

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Leaflet.js (kaarten)
- Recharts (grafieken)
- React Router (navigatie)

## 📋 Vereisten

- Node.js 18+ en npm
- Git

## 🚀 Installatie & Setup

### 1. Clone de repository

```bash
git clone <repository-url>
cd dpIRG
```

### 2. Installeer dependencies

```bash
# Root dependencies installeren
npm install

# Client en server dependencies installeren
cd client && npm install
cd ../server && npm install
cd ..
```

### 3. PDF's Extracten

Plaats je PDF scheepslogs in de `ship-logs/` folder en run:

```bash
npm run extract-pdfs
```

Dit maakt een `extracted-data/` folder aan met JSON bestanden.

### 4. Database Importeren

Importeer de geëxtraheerde data in de SQLite database:

```bash
npm run import-data
```

Dit maakt een `server/database/leviathan.db` bestand aan.

### 5. Start de Applicatie

In development mode (beide servers tegelijk):

```bash
npm run dev
```

Of start ze apart:

```bash
# Terminal 1 - Backend API (http://localhost:5000)
npm run dev:server

# Terminal 2 - Frontend (http://localhost:3000)
npm run dev:client
```

De applicatie is nu beschikbaar op **http://localhost:3000**

## 📁 Project Structuur

```
dpIRG/
├── client/                 # Frontend React applicatie
│   ├── src/
│   │   ├── components/    # Herbruikbare UI componenten
│   │   ├── pages/         # Pagina componenten
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client
│   │   └── lib/           # Utilities
│   └── package.json
├── server/                # Backend API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── db.ts         # Database connectie
│   │   └── index.ts      # Express server
│   ├── scripts/          # Data processing scripts
│   │   ├── extract-pdfs.ts
│   │   ├── parse-log-entries.ts
│   │   ├── import-data.ts
│   │   └── types.ts
│   ├── database/
│   │   └── schema.sql    # Database schema
│   └── package.json
├── ship-logs/            # PDF scheepslogs (input)
├── extracted-data/       # Geëxtraheerde JSON (gegenereerd)
└── package.json          # Root package.json
```

## 🔌 API Endpoints

### Ships
- `GET /api/ships` - Alle schepen
- `GET /api/ships/:id` - Specifiek schip
- `GET /api/ships/:id/voyages` - Reizen van een schip

### Voyages
- `GET /api/voyages` - Alle reizen (met filters)
- `GET /api/voyages/:id` - Specifieke reis
- `GET /api/voyages/:id/log-entries` - Log entries van een reis

### Log Entries
- `GET /api/log-entries` - Alle log entries (gepagineerd)
- `GET /api/log-entries/:id` - Specifieke log entry met gerelateerde data

### Whale Sightings
- `GET /api/whale-sightings` - Alle walvis waarnemingen (met filters)
- `GET /api/whale-sightings/species` - Soorten overzicht

### Statistics
- `GET /api/statistics` - Algemene statistieken
- `GET /api/statistics/voyages` - Reis statistieken

### Timeline
- `GET /api/timeline` - Tijdlijn gebeurtenissen (met filters)

## 📊 Features

### Dashboard
- Overzicht van belangrijkste statistieken
- Grafieken van vangsten over tijd
- Soorten verdeling
- Top jachtgebieden

### Kaart Weergave
- Interactieve Leaflet kaart
- Walvis waarnemingen en vangsten als markers
- Filters voor gevangen vs. waargenomen
- Popup details voor elke waarneming

### Tijdlijn
- Chronologische weergave van gebeurtenissen
- Filters voor reizen, walvissen, en bemanning
- Visuele tijdlijn met iconen

### Logboeken
- Gepagineerde lijst van alle log entries
- Zoeken en filteren
- Gedetailleerde weergave per entry
- Gerelateerde walvis waarnemingen en vangsten

### Statistieken
- Uitgebreide grafieken en analyses
- Soorten vergelijking
- Success rates per gebied
- Gedetailleerde tabellen

### UI Features
- **Dark/Light Mode**: Toggle tussen dark en light theme
- **Responsive Design**: Werkt op desktop, tablet en mobile
- **Smooth Transitions**: Animaties en hover effecten
- **Loading States**: Duidelijke feedback tijdens data laden

## 🗄️ Database Schema

De database heeft 6 hoofdtabellen:

1. **ships** - Scheepsinformatie
2. **voyages** - Reizen/tochten
3. **log_entries** - Dagelijkse logboek entries
4. **whale_sightings** - Walvis waarnemingen
5. **crew_events** - Bemanning gebeurtenissen
6. **catches** - Vangstresultaten

Zie `server/database/schema.sql` voor het volledige schema.

## 🔧 Development

### Scripts

```bash
# Alle dependencies installeren
npm run install:all

# Development mode (beide servers)
npm run dev

# Alleen backend
npm run dev:server

# Alleen frontend
npm run dev:client

# Build voor productie
npm run build

# PDF extractie
npm run extract-pdfs

# Data import
npm run import-data
```

### Environment Variables

Maak een `.env` bestand in de `server/` folder (optioneel):

```env
PORT=5000
```

## 📝 Data Parsing

De PDF parsing logica gebruikt regex patterns voor:

- **Datums**: Verschillende datum formaten (DD/MM/YYYY, etc.)
- **Coördinaten**: Latitude/Longitude in meerdere notaties
- **Walvis Keywords**: Detectie van walvissoorten
- **Vangst Keywords**: Identificatie van vangsten
- **Crew Events**: Bemanning gebeurtenissen (ziekte, ongevallen, etc.)

Pas de patterns aan in `server/scripts/parse-log-entries.ts` voor betere parsing van jouw specifieke PDF's.

## 🤝 Bijdragen

Dit is een educatief project voor historische data analyse. Suggesties en verbeteringen zijn welkom!

## 📄 Licentie

MIT License

## 🙏 Credits

Gebouwd met moderne web technologieën en open-source libraries.
