"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { INITIAL_RESOURCES, POIS, TRAVEL_COST } from "./level4Data";
import type { Resource, Resources } from "./types";

export interface GameState {
  resources: Resources;
  /** Point d'intérêt dont le panneau d'expérience est ouvert */
  activePoi: string | null;
  /** Résultat par expérience terminée */
  results: Record<string, { optionId: string; correct: boolean }>;
  journalOpen: boolean;
}

export type GameAction =
  | { type: "open"; poiId: string }
  | { type: "close" }
  | { type: "answer"; poiId: string; optionId: string }
  | { type: "toggleJournal" }
  | { type: "closeJournal" }
  | { type: "reset" };

const initialState: GameState = {
  resources: INITIAL_RESOURCES,
  activePoi: null,
  results: {},
  journalOpen: false,
};

function applyEffects(current: Resources, effects: Partial<Resources>): Resources {
  const next = { ...current };
  (Object.keys(effects) as Resource[]).forEach((key) => {
    next[key] = Math.min(100, Math.max(0, current[key] + (effects[key] ?? 0)));
  });
  return next;
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "open":
      return {
        ...state,
        activePoi: action.poiId,
        resources: applyEffects(state.resources, TRAVEL_COST),
      };
    case "close":
      return { ...state, activePoi: null };
    case "answer": {
      if (state.results[action.poiId]) return state;
      const poi = POIS.find((p) => p.id === action.poiId);
      const option = poi?.options.find((o) => o.id === action.optionId);
      if (!poi || !option) return state;
      return {
        ...state,
        resources: applyEffects(state.resources, option.effects),
        results: {
          ...state.results,
          [poi.id]: { optionId: option.id, correct: option.correct },
        },
      };
    }
    case "toggleJournal":
      return { ...state, journalOpen: !state.journalOpen };
    case "closeJournal":
      return { ...state, journalOpen: false };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans <GameProvider>");
  return ctx;
}
