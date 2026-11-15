/**
 * Chemins des modèles. Pour remplacer un modèle, déposez un .glb dans
 * public/models/ et changez uniquement l'URL ici.
 *
 * Vaisseau : laissez `null` pour le lander procédural, ou indiquez un GLB
 * orienté nez vers +Z, ventre vers -Y.
 *
 * astronautFacing : rotation Y ajoutée après normalisation (pieds sur Y=0).
 * Ajustez-la si le modèle de remplacement ne regarde pas vers la sortie.
 */
export const ASSETS = {
  earth: "/models/earth%20(2).glb",
  mars: "/models/mars%20(2).glb",
  astronaut: "/models/astronaut.glb",
  spaceship: null,
  rock: "/models/eroded_desert_rock.glb",
  astronautFacing: Math.PI / 2,
};

export const LOOK = {
  earthRadius: 32,
  marsRadius: 230,
  astronautHeight: 1.86,
  shipLength: 7.2,
};
