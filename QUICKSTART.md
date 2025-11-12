# Quick Start Guide 🚀

Volg deze stappen om de applicatie snel werkend te krijgen:

## 1. Dependencies Installeren

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

## 2. PDF Data Extracten

De PDF's staan al in de `ship-logs/` folder, dus run:

```bash
npm run extract-pdfs
```

✅ Dit maakt `extracted-data/` folder aan met JSON bestanden

## 3. Database Vullen

```bash
npm run import-data
```

✅ Dit maakt `server/database/leviathan.db` aan met alle data

## 4. Start de App

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

