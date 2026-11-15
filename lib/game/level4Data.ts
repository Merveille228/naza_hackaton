import type { Poi, Resource, Resources } from "./types";

export const INITIAL_RESOURCES: Resources = {
  energy: 70,
  air: 75,
  water: 55,
  food: 50,
  radiation: 15,
};

/** Coût d'une sortie vers un point d'intérêt. */
export const TRAVEL_COST: Partial<Resources> = { energy: -3, radiation: 2 };

export const RESOURCE_META: Record<
  Resource,
  { label: string; color: string; higherIsBetter: boolean }
> = {
  energy: { label: "Énergie", color: "#f5a623", higherIsBetter: true },
  air: { label: "Air", color: "#7cc4ff", higherIsBetter: true },
  water: { label: "Eau", color: "#3d8bff", higherIsBetter: true },
  food: { label: "Nourriture", color: "#3ddc97", higherIsBetter: true },
  radiation: { label: "Radiation reçue", color: "#b48cff", higherIsBetter: false },
};

/**
 * Chiffres à calibrer avec les données NASA (RadLab, DONKI, RAD de Curiosity)
 * avant la présentation finale.
 */
export const POIS: Poi[] = [
  {
    id: "radiation",
    name: "Dosimètre",
    position: [-7, -5],
    color: "#fc3d21",
    scenario:
      "Votre dosimètre indique une dose de l'ordre de 0,6 mSv par jour en surface, une valeur proche de celles mesurées par l'instrument RAD du rover Curiosity. Mars n'a ni champ magnétique global ni atmosphère épaisse pour vous protéger.",
    question: "Où installer la zone de repos de l'équipage ?",
    options: [
      {
        id: "a",
        label: "Sous une tente légère posée en surface",
        correct: false,
        feedback:
          "En surface, rien n'arrête vraiment les rayons cosmiques : la dose s'accumule jour après jour.",
        effects: { radiation: 10 },
      },
      {
        id: "b",
        label: "Sous quelques mètres de régolithe (le sol martien)",
        correct: true,
        feedback:
          "Le sol martien absorbe une grande partie des radiations. Plus la couche est épaisse, plus la protection est forte, mais creuser coûte de l'énergie.",
        effects: { radiation: -8, energy: -6 },
      },
      {
        id: "c",
        label: "À côté des panneaux solaires, pour garder l'énergie à portée",
        correct: false,
        feedback:
          "Les panneaux ne bloquent pas les radiations : être près d'eux ne change rien à la dose reçue.",
        effects: { radiation: 8 },
      },
    ],
    knowledge: {
      title: "Se protéger des radiations",
      text: "Sur Mars, la dose reçue en surface est bien plus élevée que sur Terre. Une couche de régolithe au-dessus de l'habitat réduit l'exposition, au prix de la masse à déplacer et de l'énergie dépensée.",
    },
  },
  {
    id: "ice",
    name: "Poche de glace",
    position: [7, -4],
    color: "#7cc4ff",
    scenario:
      "Le radar a repéré de la glace d'eau à faible profondeur. L'eau sert à boire, à cultiver et à produire de l'air.",
    question: "Comment obtenir de l'eau utilisable ?",
    options: [
      {
        id: "a",
        label: "Chauffer la glace en journée avec l'énergie des panneaux",
        correct: true,
        feedback:
          "Fondre la glace demande de l'énergie : le faire quand les panneaux produisent évite de vider les batteries. L'eau devra ensuite être filtrée.",
        effects: { water: 15, energy: -6 },
      },
      {
        id: "b",
        label: "La chauffer en pleine nuit, sur les batteries",
        correct: false,
        feedback:
          "Vous obtenez de l'eau, mais les batteries se vident au moment où le dôme en a le plus besoin.",
        effects: { water: 15, energy: -18 },
      },
      {
        id: "c",
        label: "La consommer telle quelle, sans traitement",
        correct: false,
        feedback:
          "La glace martienne est mêlée de poussière et de sels. Sans fonte ni filtration, l'eau n'est pas sûre.",
        effects: { water: -8 },
      },
    ],
    knowledge: {
      title: "L'eau a un coût en énergie",
      text: "La glace d'eau est une ressource précieuse, mais l'extraire, la fondre et la filtrer demande de l'énergie. Eau et énergie sont liées : économiser l'une oblige à dépenser l'autre.",
    },
  },
  {
    id: "soil",
    name: "Parcelle de test",
    position: [6, 6],
    color: "#3ddc97",
    scenario:
      "Le sol martien (régolithe) contient des perchlorates, des sels toxiques pour les plantes comme pour les humains. Vous devez tester une première culture.",
    question: "Que faites-vous avant de planter ?",
    options: [
      {
        id: "a",
        label: "Planter directement dans le régolithe",
        correct: false,
        feedback:
          "Les perchlorates freinent la croissance des plantes : la culture échoue et l'eau est gaspillée.",
        effects: { food: -6, water: -3 },
      },
      {
        id: "b",
        label: "Rincer et traiter le sol, puis planter",
        correct: true,
        feedback:
          "Traiter le sol retire une partie des sels toxiques. La culture pousse, mais le rinçage consomme de l'eau et de l'énergie.",
        effects: { food: 15, water: -8, energy: -3 },
      },
      {
        id: "c",
        label: "Arroser abondamment sans rien traiter",
        correct: false,
        feedback:
          "Arroser davantage ne supprime pas les sels : vous perdez de l'eau pour un mauvais résultat.",
        effects: { water: -12, food: -4 },
      },
    ],
    knowledge: {
      title: "Cultiver sur Mars",
      text: "Le régolithe martien contient des perchlorates : il faut le traiter avant d'y faire pousser quoi que ce soit. L'agriculture consomme de l'eau, de l'énergie et de la place, au détriment d'autres systèmes.",
    },
  },
  {
    id: "solar",
    name: "Panneaux solaires",
    position: [-7, 5],
    color: "#f5a623",
    scenario:
      "Un jour martien dure environ 24 h 40, et la nuit, les panneaux ne produisent rien. La poussière qui se dépose dessus les rend aussi moins efficaces.",
    question: "Comment garantir l'énergie du dôme ?",
    options: [
      {
        id: "a",
        label: "Ajouter des panneaux, sans batterie",
        correct: false,
        feedback:
          "Plus de panneaux produisent plus le jour, mais rien la nuit : le dôme s'éteint quand le soleil se couche.",
        effects: { energy: -10 },
      },
      {
        id: "b",
        label: "Panneaux, batteries et nettoyage régulier de la poussière",
        correct: true,
        feedback:
          "Les batteries stockent l'énergie du jour pour la nuit, et le nettoyage garde les panneaux efficaces.",
        effects: { energy: 15 },
      },
      {
        id: "c",
        label: "Couper le dôme pendant la nuit pour économiser",
        correct: false,
        feedback:
          "Le support vital ne doit jamais s'arrêter : sans lui, l'air n'est plus recyclé.",
        effects: { air: -15, energy: -2 },
      },
    ],
    knowledge: {
      title: "Produire et stocker l'énergie",
      text: "Sur Mars, l'énergie solaire varie avec la nuit, la poussière et les tempêtes : il faut la stocker. Chaque panneau prend aussi de la place qui ne sert plus à cultiver.",
    },
  },
  {
    id: "air",
    name: "Atmosphère",
    position: [0, -9],
    color: "#5ad1c4",
    scenario:
      "L'air de Mars est irrespirable : il est composé à environ 95 % de dioxyde de carbone. Le rover Perseverance a pourtant déjà produit de l'oxygène sur place avec son instrument MOXIE.",
    question: "Quelle ressource martienne peut fournir de l'oxygène ?",
    options: [
      {
        id: "a",
        label: "Le dioxyde de carbone de l'atmosphère",
        correct: true,
        feedback:
          "MOXIE sépare l'oxygène du dioxyde de carbone. Le procédé fonctionne, mais il demande beaucoup d'énergie.",
        effects: { air: 15, energy: -8 },
      },
      {
        id: "b",
        label: "L'azote de l'atmosphère",
        correct: false,
        feedback:
          "L'azote ne se transforme pas en oxygène respirable : l'oxygène vient du CO₂ ou de l'eau.",
        effects: { air: -5, energy: -4 },
      },
      {
        id: "c",
        label: "Respirer directement l'air du dehors",
        correct: false,
        feedback:
          "L'air de Mars ne contient presque pas d'oxygène et sa pression est très faible : il est mortel sans combinaison.",
        effects: { air: -20 },
      },
    ],
    knowledge: {
      title: "Fabriquer de l'air",
      text: "On peut produire de l'oxygène à partir du CO₂ de l'atmosphère martienne ou de l'eau, mais toujours avec de l'énergie. Le support vital est la priorité de la base.",
    },
  },
];
