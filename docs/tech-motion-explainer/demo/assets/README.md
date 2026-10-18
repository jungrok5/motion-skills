# Shared assets

Copy this folder to your project root as `assets/`. Topic pages load it as `../assets/…`.

| path | what | license |
|---|---|---|
| `fonts/Pretendard-Variable.woff2` | Pretendard 1.309, variable weight 100–900 (Korean + Latin UI text). © 2023 Kil Hyung-jin | SIL Open Font License 1.1 (https://openfontlicense.org; the font's metadata names the same license) |
| `fonts/JetBrainsMono.woff2` | JetBrains Mono 2.211 (code). © 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) | SIL Open Font License 1.1 (https://openfontlicense.org) |
| `vendor/three/` | three.js r170 (0.170): `build/three.module.min.js` and the `examples/jsm/` post-processing passes and shaders the 3D pages import | MIT, see `vendor/three/LICENSE` |

The fonts may be used, bundled and redistributed with any software, including commercial; they may not be sold by themselves.
3D pages use the importmap `{"three": "../assets/vendor/three/build/three.module.min.js", "three/addons/": "../assets/vendor/three/examples/jsm/"}`.
