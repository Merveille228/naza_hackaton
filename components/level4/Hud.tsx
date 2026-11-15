"use client";

import { useGame } from "@/lib/game/GameProvider";
import { POIS, RESOURCE_META } from "@/lib/game/level4Data";
import type { Resource } from "@/lib/game/types";

const ORDER: Resource[] = ["energy", "air", "water", "food", "radiation"];

export function Hud() {
  const { state, dispatch } = useGame();
  const done = Object.keys(state.results).length;
  const showHint = state.activePoi === null && done === 0;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.18em] text-white/90">
              ORBITE 3
            </p>
            <h1 className="mt-1 font-display text-lg font-bold text-white sm:text-2xl">
              Niveau 4 : Découvrir et créer
            </h1>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "toggleJournal" })}
            className="pointer-events-auto border border-white/25 bg-nasa-blue/50 px-4 py-2 font-display text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-nasa-blue/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Journal ({done}/{POIS.length})
          </button>
        </div>

        <ul className="grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5">
          {ORDER.map((key) => {
            const meta = RESOURCE_META[key];
            const value = Math.round(state.resources[key]);
            const danger = meta.higherIsBetter ? value < 25 : value > 70;
            const color = danger ? "#fc3d21" : meta.color;
            return (
              <li key={key} className="bg-black/55 px-3 py-2 backdrop-blur-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-white/80">{meta.label}</span>
                  <span className="font-mono text-xs text-white">{value}</span>
                </div>
                <div
                  className="mt-1.5 h-1.5 w-full bg-white/15"
                  role="progressbar"
                  aria-label={meta.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={value}
                >
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{ width: `${value}%`, backgroundColor: color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {showHint && (
        <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-[min(92vw,26rem)] -translate-x-1/2 bg-black/65 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
          Cliquez sur un point lumineux pour envoyer l&apos;astronaute faire une expérience.
        </p>
      )}
    </>
  );
}
