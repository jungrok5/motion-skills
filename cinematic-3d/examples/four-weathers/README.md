# Four Weathers

Four 7-second shots recreating a set of stylised reference renders, joined with 0.8 s dissolves (25.6 s, 1080×1920, 30 fps):

| shot | page | what moves |
|---|---|---|
| fog | `shots/fog.html` | drone drifts up and in over a cloud sea; red aviation lights blink; the cloud flows |
| rain | `shots/rain.html` | a red tram creeps round the bend; the camera pans with its nose; rain, ripples |
| snow | `shots/snow.html` | a man walks his dog away down the tyre tracks; his prints appear behind him; snowfall |
| autumn | `shots/autumn.html` | the picture is a puddle: leaves fall and land (ripples bend the tower), a cyclist passes |

`audio/<id>.mp3` are the ElevenLabs sound-effect beds used (9 s each); `audio/mix.wav` is made by `scripts/mix.py`.

```bash
node ../../scripts/film.mjs        # renders out/<id>.mp4 for every shot that has none, then out/film.mp4 + out/film-share.mp4
```
