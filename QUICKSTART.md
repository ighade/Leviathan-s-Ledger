# Quick Start Guide 🚀

Volg deze stappen om de applicatie snel werkend te krijgen:

## 1. Dependencies Installeren

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

## 2. OpenAI API Key Setup (voor AI-extractie)

Voor de beste resultaten gebruiken we AI om de PDF's te analyseren:

1. Ga naar https://platform.openai.com/api-keys
2. Maak een API key aan
3. Maak een `.env` bestand in de `server/` folder:

```bash
echo "OPENAI_API_KEY=jouw_api_key_hier" > server/.env
```

## 3. PDF Data Extracten met AI 🤖

De PDF's worden met AI geanalyseerd voor accurate data-extractie:

```bash
npm run extract-pdfs-ai
```

✅ Dit maakt `extracted-data/` folder aan met gestructureerde JSON bestanden
✅ Herkent correcte scheepsnamen (5 verschillende schepen)
✅ Extraheert historische datums (1800s-1900s)
✅ Parset coördinaten correct
✅ Identificeert walvis waarnemingen, vangsten, en bemanning events

**Optioneel**: Voor snelle basis-extractie zonder AI:
```bash
npm run extract-pdfs
```

## 4. Database Vullen met AI-data

```bash
npm run import-data-ai
```

✅ Dit maakt `server/database/leviathan.db` aan met alle gestructureerde data
✅ 5 verschillende schepen met unieke namen
✅ Correcte historische datums (1800s-1900s)
✅ Nauwkeurige coördinaten

**Optioneel**: Voor import zonder AI-gestructureerde data:
```bash
npm run import-data
```

## 5. Start de App

```bash
npm run dev
```

✅ Backend API: http://localhost:5000
✅ Frontend App: http://localhost:3000

## Problemen?

### "Module not found" errors
```bash
# Verwijder alle node_modules en installeer opnieuw
rm -rf node_modules client/node_modules server/node_modules
npm run install:all
```

### Database errors
```bash
# Verwijder database en importeer opnieuw
rm server/database/leviathan.db
npm run import-data
```

### Port already in use
```bash
# Wijzig de port in server/.env
echo "PORT=5001" > server/.env
```

## Belangrijke URL's

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health
- **Statistics**: http://localhost:5000/api/statistics

## Features Testen

1. **Dashboard**: Zie overzicht van alle statistieken
2. **Kaart**: Bekijk walvis waarnemingen op de kaart
3. **Tijdlijn**: Chronologische weergave van gebeurtenissen
4. **Logboeken**: Blader door alle scheepslogs
5. **Statistieken**: Uitgebreide analyses en grafieken

## Development Tips

- **Hot Reload**: Beide servers hebben hot reload - wijzigingen worden direct zichtbaar
- **Dark Mode**: Click de maan/zon icon rechts boven
- **API Testen**: Gebruik http://localhost:5000/api/ships in je browser
- **Database Bekijken**: Gebruik een SQLite browser om `server/database/leviathan.db` te bekijken

Veel plezier! 🚢

