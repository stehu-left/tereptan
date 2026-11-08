# AGENTS.md — Kontextus AI Fejlesztők és LLM Modellek Számára

Ez a fájl tartalmazza a rendszer architektúráját, szigorú invariánsait, fájlstruktúráját és matematikai modelljét. Mielőtt bármilyen kódot módosítasz vagy új funkciót implementálsz, kövesd az alábbi irányelveket.

---

## 1. Technológiai Stack & Alapszabályok

- Környezet: Statikus Vanilla Web (HTML5, CSS3, ES6 JavaScript).
- Külső könyvtárak (kizárólag CDN-en keresztül):
  - Leaflet.js v1.9.4 (térképi alaprétegek)
  - MGRS.js v1.0.0 (WGS84 fok és MGRS kód transzformáció)
  - Proj4js v2.9.0 (WGS84 EPSG:4326 és UTM Zone 33N/34N méterháló vetülete)
  - FontAwesome 6 és Google Fonts (Chakra Petch, JetBrains Mono, Inter)
- Tiltott: Node.js, Webpack, Vite, React vagy külső npm build lépések bevezetése. A szoftvernek közvetlenül futnia kell GitHub Pages-ről és helyi fájlrendszerről.

---

## 2. Fájlstruktúra & Felelősségek

tereptan-app/
├── index.html            <- Csak a vázlat és CDN linkek, beágyazott JS/CSS nélkül
├── css/
│   ├── base.css          <- Változók, reset, fej- és lábléc, layout, asztali media query-k
│   ├── map.css           <- Térkép konténer, zoom kártya, dekóder, rádiópanel, MGRS címkék
│   ├── reticle.css       <- Távcső canvas, skálák, szögrendszer váltó, célpontválasztó, képletbanner
│   └── theory-quiz.css   <- Vetületi animáció és kvíz stílusok
├── js/
│   ├── config.js         <- Globális konstansok (CONFIG objektum), Proj4 definíciók
│   ├── radio.js          <- TTS hangszintézis (SpeechSynthesis) és katonai rádiószöveg formázás
│   ├── map.js            <- Leaflet térkép, dinamikus MGRS méterrács-generálás
│   ├── reticle.js        <- Mil-dot szimuláció, canvas rajzolás és érintéskezelés
│   ├── projection.js     <- Vetületi geometriai canvas rajzoló és animáció
│   ├── quiz.js           <- Kérdések kiértékelése és magyarázatok
│   ├── tabs.js           <- Fülváltás és Leaflet méret-újraszámítás
│   └── main.js           <- DOMContentLoaded központi belépési pont
├── README.md             <- Humán fejlesztői és pedagógiai leírás
└── AGENTS.md             <- Ez a specifikációs fájl

---

## 3. Matematikai & Kartográfiai Invariánsok

### A) Geodéziai Rácsgenerálás (js/map.js)
- Tilos fokos lépésközt használni a 100k, 10k és 1k szinteken! Az UTM rácsvonalak méterben párhuzamosak, nem földrajzi hosszúsági fokokban.
- A vonalakat a látható terület sarokpontjainak UTM métereiből kell származtatni a proj4 segítségével:
  - 100 km-es szint (Zoom 7-9): 100 000 m lépésköz.
  - 10 km-es szint (Zoom 10-12): 10 000 m lépésköz.
  - 1 km-es szint (Zoom 13+): 1 000 m lépésköz.
- 1 km-es vonalszámok: A vonalakon lévő kétjegyű számok (00-99) a 100 km-es blokk bal alsó sarkától mért km-távolságot jelentik, amiből a 4 jegyű koordináta összeáll.
- Sávbetűk (GZD): Az I és O betűk kimaradnak (CDEFGHJKLMNPQRSTUVWX). 72 és 84 fok északi szélesség között a sáv 12 fok magas (X sáv).

### B) Ezredszabály és Optika (js/reticle.js)
- Alapképlet: D = (M * 1000) / V
  - D: Távolság méterben
  - M: Célméret méterben
  - V: Szögérték vonásban (mil)
- Szögrendszerek:
  - NATO: Teljes kör = 6400 mil (1 mil kb. 0.982 mrad)
  - Varsói Szerződés: Teljes kör = 6000 vonás (1 v kb. 1.047 mrad)

---

## 4. Kódolási Szabályok AI Modelleknek

1. Moduláris integritás: Ne egyesítsd újra a fájlokat az index.html-be. Minden módosítást a megfelelő css/ vagy js/ fájlban végezz el.
2. Eseménykezelés: Ne használj elavult globális event objektumot. Az inline hívásoknak explicit referenciát (pl. this) kell átadniuk.
3. Reszponzivitás: A 900 px alatti mobil felületen az alsó Bottom Bar hüvelykujjal történő kezelhetőségét és a minimum 44 px-es érintőfelületeket meg kell őrizni.