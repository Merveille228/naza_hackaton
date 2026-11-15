export type Resource = "energy" | "air" | "water" | "food" | "radiation";

/** Toutes les valeurs vont de 0 à 100. Pour "radiation", plus c'est haut, pire c'est. */
export type Resources = Record<Resource, number>;

export interface ExperimentOption {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
  effects: Partial<Resources>;
}

export interface Poi {
  id: string;
  name: string;
  /** Position au sol : [x, z] */
  position: [number, number];
  color: string;
  scenario: string;
  question: string;
  options: ExperimentOption[];
  knowledge: { title: string; text: string };
}
