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
| Springen  | **Leertaste**, **↑**, **W**, Mausklick, Tippen |
| Wiederholt springen | Taste/Maus **gedrückt halten**     |
| Neustart  | **Leertaste** (nach Game Over)               |
| Ton an/aus | **M** oder Klick auf 🔊 (oben rechts)        |

## ✨ Features

- 🟦 Rotierender Würfel mit Trail-Effekt
- 🔺 Stacheln, Plattformen (1–3 hoch) und gelbe Sprung-Pads
- 📊 Fortschrittsanzeige & Prozent-Highscore (im Browser gespeichert)
- 🎨 3 Level mit eigenen Farben & Parallax-Hintergrund
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
| `E`     | Endmarkierung                   |

Viel Spaß! 🚀
