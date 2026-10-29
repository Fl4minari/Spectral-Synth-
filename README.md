## Files

- `index.html` — interface structure and controls.
- `style.css` — layout, colors, font, and visual styling.
- `script.js` — Tone.js audio, melodies, and control behavior.
- `assets/` — exported SVG artwork and the Matemasie font file.

## Controls

- Each oscillator has independent Start, Mute, Stop, and Reset.
- Volume, Attack, Release, waveform, Distortion, and Reverb are independent for each voice.
- FX knobs: drag vertically; double-click a knob to restore its default value.
- Tempo controls both sequences.
- Start Both / Stop Both / Reset All are global controls.

## Project

Данный синтезатор был создан при помощи нейросети (модель — ChatPGT-6). Будучи новичком в коде (и отчасти в дизайне), трудно создать что-то стоящее без ии. Основной процесс начался с промптов описания функций, приложения скринов макетов / сырого кода и текста требований. Концепция, правки и дизайн лежат на мне. Проводились точечные корректировки итогового синтезатора как на уровне промптов (что нужно поправить и как, какая проблема обнаружилась и в чем ее особенность), так и на уровне ручного ввода. Для более точной сборки в модель были закинуты свг файлы элементов синтезатора, а также используемый шрифт. В будущем планируется доработка и добавление новых функций. Музыкальной основой служат Oneohtrix Point Never, The Budos Band, Thievery Corporation и Bibio.
