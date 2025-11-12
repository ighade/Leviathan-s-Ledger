<!-- a76ae389-8156-4372-b5d3-c2fa7eef7925 83284868-2dff-4d53-bf7f-6ffe25078f98 -->
# Leviathan's Ledger - Walvisvangst Scheepslogs Applicatie

## Tech Stack

- **Backend**: Node.js met TypeScript + Express
- **Database**: SQLite3
- **Frontend**: React met TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui componenten
- **Kaarten**: Leaflet.js voor interactieve kaarten
- **Grafieken**: Recharts voor data visualisatie
- **PDF Parsing**: pdf-parse library

## Database Schema

### Tabellen:

1. **ships** - Scheepsinformatie (naam, type, thuishaven)
2. **voyages** - Reizen/tochten (schip, start/einddatum, route)
3. **log_entries** - Dagelijkse logboek entries (datum, tijd, locatie, weer, koers)
4. **whale_sightings** - Walvis waarnemingen (soort, aantal, locatie, gevangen/gezien)
5. **crew_events** - Bemanning gebeurtenissen (naam, rol, incident type)
6. **catches** - Vangstresultaten (aantal vaten olie, spek gewicht)

## Fase 1: PDF Extractie & Data Parsing

**Doel**: PDF's converteren naar gestructureerde tekst en eerste data-extractie

1. Node.js script maken met `pdf-parse` om PDF's te lezen
2. Tekst extractie per pagina/log entry
3. Pattern matching/regex voor herkennen van:

- Datums (verschillende formaten)
- Coördinaten (latitude/longitude)
- Scheepsnamen
- Walvissoorten
- Getallen (vangsten, aantallen)

4. Output naar JSON bestanden voor verdere verwerking

**Bestanden**:

- [`scripts/extract-pdfs.ts`](scripts/extract-pdfs.ts) - PDF extractie
- [`scripts/parse-log-entries.ts`](scripts/parse-log-entries.ts) - Text parsing logica
- [`scripts/types.ts`](scripts/types.ts) - TypeScript types voor data modellen

## Fase 2: Database Setup & Data Import

**Doel**: SQLite database opzetten en geparsede data importeren

1. Database schema definiëren met SQL migrations
2. Import scripts om JSON data naar SQLite te schrijven
3. Indexen aanmaken voor snelle queries (datum, locatie, scheepsnaam)
4. Data validatie en cleaning

**Bestanden**:

- [`database/schema.sql`](database/schema.sql) - Database schema
- [`database/migrations/`](database/migrations/) - Database migraties
- [`scripts/import-data.ts`](scripts/import-data.ts) - Data import script

## Fase 3: Backend API

**Doel**: RESTful API voor data toegang

**Endpoints**:

- `GET /api/ships` - Alle schepen
- `GET /api/voyages` - Reizen met filters (datum, schip)
- `GET /api/log-entries` - Log entries met paginatie & filters
- `GET /api/whale-sightings` - Walvis data met locatie filters
- `GET /api/statistics` - Statistieken (totaal vangsten, populaire gebieden)
- `GET /api/timeline` - Tijdlijn data voor visualisatie

**Bestanden**:

- [`server/src/index.ts`](server/src/index.ts) - Express server setup
- [`server/src/routes/`](server/src/routes/) - API routes
- [`server/src/db.ts`](server/src/db.ts) - Database connectie
- [`server/src/controllers/`](server/src/controllers/) - Business logica

## Fase 4: Frontend Applicatie

**Doel**: Interactieve webinterface

### Componenten:

1. **Dashboard** - Overview met statistieken en snelle filters
2. **Kaart Weergave** - Leaflet kaart met:

- Scheepsroutes
- Walvis waarnemingen (markers)
- Heatmap van vangstgebieden
- Filter op datum/scheepsnaam

3. **Tijdlijn** - Chronologische weergave van:

- Reizen
- Belangrijke gebeurtenissen
- Vangst trends

4. **Zoek & Filter** - Geavanceerde zoekfunctie:

- Datum range picker
- Scheepsnaam zoeken
- Locatie/gebied filters
- Walvissoort filters

5. **Log Entry Detail** - Gedetailleerde weergave van individuele logs
6. **Statistieken** - Grafieken en analyses:

- Vangsten over tijd
- Populairste jachtgebieden
- Walvissoorten verdeling
- Bemanning statistieken

**Bestanden**:

- [`client/src/App.tsx`](client/src/App.tsx) - Hoofd app component
- [`client/src/components/`](client/src/components/) - UI componenten
- [`client/src/pages/`](client/src/pages/) - Pagina componenten
- [`client/src/services/api.ts`](client/src/services/api.ts) - API client
- [`client/src/hooks/`](client/src/hooks/) - Custom React hooks

## Fase 5: Styling & UX

**Doel**: Moderne, gebruiksvriendelijke interface

1. Responsive design (desktop & mobile)
2. Dark/light mode
3. Loading states & error handling
4. Smooth transitions en animaties
5. Accessibility (keyboard navigatie, screen readers)

## Fase 6: Testing & Deployment

**Doel**: Production-ready applicatie

1. Unit tests voor parsing logica
2. API endpoint tests
3. Build voor productie
4. Deployment setup (bijvoorbeeld Vercel/Netlify voor frontend, Railway/Fly.io voor backend)

---

## Development Volgorde

De implementatie volgt deze stappen:

1. Project setup (package.json, TypeScript config, folder structuur)
2. PDF extractie testen met één bestand
3. Database schema en import
4. Backend API basics
5. Frontend basis met routing
6. Kaart implementatie
7. Overige features (tijdlijn, statistieken)
8. Polish en refinement

### To-dos

- [ ] Project structuur opzetten met Node.js, TypeScript, separate client/server folders, en package.json configuratie
- [ ] PDF extractie script implementeren met pdf-parse en test met één scheepslog bestand
- [ ] Parsing logica bouwen om structuur te herkennen in log entries (datums, coördinaten, walvissen, etc.)
- [ ] SQLite database schema definiëren voor ships, voyages, log_entries, whale_sightings, crew_events, catches
- [ ] Import scripts bouwen om geparsede data naar SQLite database te schrijven
- [ ] Express API opzetten met endpoints voor ships, voyages, log-entries, whale-sightings, statistics
- [ ] React + Vite frontend project opzetten met TypeScript, Tailwind CSS, en routing
- [ ] API client in frontend bouwen met fetch/axios en custom hooks voor data fetching
- [ ] Dashboard pagina met overview, statistieken cards, en snelle filters
- [ ] Leaflet kaart component met routes, walvis markers, en interactieve filters
- [ ] Tijdlijn visualisatie voor chronologische weergave van reizen en gebeurtenissen
- [ ] Geavanceerde zoek en filter functionaliteit (datum, scheepsnaam, locatie, walvissoort)
- [ ] Gedetailleerde weergave pagina's voor individuele log entries en reizen
- [ ] Recharts grafieken voor vangsten over tijd, populaire gebieden, walvissoorten verdeling
- [ ] UI polish: responsive design, dark/light mode, loading states, transitions, accessibility