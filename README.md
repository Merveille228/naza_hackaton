# ORBITe 3 — introduction cinématique

Introduction 3D temps réel (Three.js) : la Terre, le départ du vaisseau, le transit, l'approche de Mars et l'atterrissage. Le gameplay reprend ensuite sur `/play`.

## Lancer

```bash
yarn
yarn dev
```

Ouvrir [http://localhost:3000](http://localhost:3000), puis **Lancer la mission**.

- **Espace** ou **Passer** interrompt l'introduction et enchaîne sur la scène jouable.
- **Mode Cadet** sur l'accueil va directement au jeu.
- `http://localhost:3000/intro?speed=8` accélère le montage.
- `http://localhost:3000/intro?t=55` saute à un instant (secondes).

## Modèles

Les fichiers sont dans `public/models/`. Les chemins se changent dans `src/assets.js` :

| Rôle | Fichier utilisé |
| --- | --- |
| Terre + nuages | `earth (2).glb` |
| Mars | `mars (2).glb` |
| Astronaute (`idle`, `wave`, `moon_walk`) | `astronaut.glb` |
| Vaisseau | lander procédural (`spaceship: null`) |

Pour un vaisseau GLB : nez vers +Z, ventre vers le bas, puis `spaceship: "/models/mon-vaisseau.glb"`. S'il ne charge pas, le lander de remplacement reste affiché.

`astronautFacing` règle la direction de sortie si un autre astronaute ne regarde pas le sas.

Les GLB Mars et astronaute utilisent l'extension `KHR_materials_pbrSpecularGlossiness`, retirée de Three.js. Le chargeur la convertit à la volée vers un matériau PBR standard.

## Scripts

```bash
yarn dev
yarn build
yarn start
```
