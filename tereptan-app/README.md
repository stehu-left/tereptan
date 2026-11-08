# Tereptan & Térképészet Oktató Laboratórium

Interaktív webes katonai és topográfiai oktatóeszköz, amelyet honvédelmi alapismeretek, kadétképzés és középiskolai földrajzoktatás támogatására hoztunk létre.

## Fő Funkciók

1. **Dinamikus UTM & MGRS Térképmotor:**
   * A nagyítási szinthez (zoom) alkalmazkodó rács: Kontinensszintű zónák (GZD) $\rightarrow$ 100 km-es blokkok $\rightarrow$ 10 km-es navigációs háló $\rightarrow$ 1 km-es tüzérségi méterrács.
   * Színkódolt élő MGRS dekóder.
   * Beépített hangos rádióforgalmi szimulátor (`SpeechSynthesis`).

2. **Vonás / Mil Optikai Szimulátor:**
   * Szálkereszt vászon szabadon pozicionálható célpontokkal.
   * Az ezredszabály ($D = \frac{M \times 1000}{V}$) élő kiszámítása és levezetése.
   * NATO (6400) és Varsói Szerződés szerinti (6000) szögrendszer azonnali váltása.

3. **Vetületelmélet & Kvíz:**
   * Animáció a Föld gömbi torzulásáról, a hengerpalástról és a 60 UTM zónáról.
   * Azonnali visszajelzést adó önellenőrző kérdéssor.

## Telepítés és Futtatás

A projekt nem igényel fordítást, szervert vagy csomagkezelőt:
1. Klónozd a tárolót: `git clone https://github.com/stehu-left/tereptan.git`
2. Nyisd meg az `index.html`-t közvetlenül a böngésződben, vagy kapcsold be a GitHub Pages-t a `main` ágon.