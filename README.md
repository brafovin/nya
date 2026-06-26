# 🎮 Cube Dash — ein Geometry-Dash-Klon

Ein kleines, in reinem **HTML5 Canvas + JavaScript** geschriebenes Spiel im Stil von *Geometry Dash*. Keine Bibliotheken, keine Installation — einfach im Browser öffnen.

## ▶️ Spielen

Öffne einfach die Datei `index.html` in einem Browser. Fertig!

Oder starte einen kleinen lokalen Server (empfohlen):

```bash
# Python
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## 🕹️ Steuerung

| Aktion    | Taste / Eingabe                              |
| --------- | -------------------------------------------- |
| Springen (Würfel) | **Leertaste**, **↑**, **W**, Mausklick, Tippen |
| Wiederholt springen | Taste/Maus **gedrückt halten**     |
| 🚀 Steigen (Flugmodus) | Taste/Maus **gedrückt halten** = hoch, loslassen = runter |
| Neustart  | **Leertaste** (nach Game Over)               |
| Ton an/aus | **M** oder Klick auf 🔊 (oben rechts)        |

## ✨ Features

- 🟦 Rotierender Würfel mit Trail-Effekt
- 🚀 **Flugmodus (Ship)** wie in Geometry Dash — fliege als Rakete durch enge Korridore
- 🌀 **Portale**, die mitten im Level zwischen Würfel- und Flugmodus umschalten
- 🔺 Stacheln (am Boden & an der Decke), Plattformen (1–3 hoch), schwebende Blöcke, Korridore und gelbe Sprung-Pads
- 📊 Fortschrittsanzeige & Prozent-Highscore (im Browser gespeichert)
- 🎨 **6 Level** mit eigenen Farben & Parallax-Hintergrund
- 💥 Partikel-Explosionen
- 🎵 **Prozedurale Chiptune-Musik & Soundeffekte** (Web Audio API, keine Dateien nötig) — eigener Beat pro Level, plus Sprung-, Pad-, Tod- und Sieg-Sounds
- 📱 Funktioniert auch auf dem Handy (Touch)

## 🛠️ Eigene Level bauen

Level werden in `game.js` im Array `LEVELS` als einfache Text-Maps definiert.
Jedes Zeichen ist eine Raster-Spalte:

| Zeichen | Bedeutung                       |
| ------- | ------------------------------- |
| `_`     | leer                            |
| `^`     | Stachel (tödlich)               |
| `B`     | Block / Plattform (1 hoch)      |
| `2`/`3` | Block 2 bzw. 3 Tiles hoch       |
| `J`     | Sprung-Pad (Boost nach oben)    |
| `v`     | Stachel an der Decke (Flugmodus)|
| `T`/`Y` | Decken-Block (1 bzw. 2 hoch)    |
| `o`     | schwebender Block (mittig)      |
| `H`     | Korridor (Decke + Boden, Lücke in der Mitte) |
| `P`     | Portal → Flugmodus              |
| `C`     | Portal → Würfelmodus            |
| `E`     | Endmarkierung                   |

Pro Level kann zusätzlich `startMode: "cube"` oder `"ship"` gesetzt werden.

Viel Spaß! 🚀
