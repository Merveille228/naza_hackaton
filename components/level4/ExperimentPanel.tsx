"use client";

import { useGame } from "@/lib/game/GameProvider";
import { POIS, RESOURCE_META } from "@/lib/game/level4Data";
import type { Resource, Resources } from "@/lib/game/types";

function EffectChips({ effects }: { effects: Partial<Resources> }) {
  const entries = (Object.entries(effects) as [Resource, number][]).filter(
    ([, value]) => value !== 0,
  );
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {entries.map(([key, value]) => {
        const meta = RESOURCE_META[key];
        const good = meta.higherIsBetter ? value > 0 : value < 0;
        return (
          <li
            key={key}
            className={`px-2 py-1 text-xs font-medium ${
              good ? "bg-ok/20 text-ok" : "bg-nasa-red/20 text-[#ff8a78]"
            }`}
          >
            {meta.label} {value > 0 ? "+" : "−"}
            {Math.abs(value)}
          </li>
        );
      })}
    </ul>
  );
}

export function ExperimentPanel() {
  const { state, dispatch } = useGame();
  const poi = POIS.find((p) => p.id === state.activePoi);
  if (!poi) return null;

  const result = state.results[poi.id];
  const chosen = result ? poi.options.find((o) => o.id === result.optionId) : undefined;
  const allDone = Object.keys(state.results).length === POIS.length;

  const close = () => {
    dispatch({ type: "close" });
    if (allDone) dispatch({ type: "toggleJournal" });
  };

  return (
    <section
      role="dialog"
      aria-label={poi.name}
      className="absolute inset-x-0 bottom-0 z-20 max-h-[75dvh] overflow-y-auto border-t border-white/15 bg-panel/95 p-5 backdrop-blur-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[27rem] sm:border"
    >
      <h2 className="font-display text-lg font-bold text-white">{poi.name}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{poi.scenario}</p>
      <p className="mt-4 text-base font-semibold text-white">{poi.question}</p>

      <ul className="mt-3 flex flex-col gap-2">
        {poi.options.map((option) => {
          const isChosen = result?.optionId === option.id;
          let style = "border-white/20 bg-white/5 hover:bg-white/10";
          if (result) {
            if (option.correct) style = "border-ok bg-ok/15";
            else if (isChosen) style = "border-nasa-red bg-nasa-red/15";
            else style = "border-white/10 bg-white/5 opacity-60";
          }
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={Boolean(result)}
                onClick={() => dispatch({ type: "answer", poiId: poi.id, optionId: option.id })}
                className={`w-full border px-3 py-2.5 text-left text-sm text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default ${style}`}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>

      {result && chosen && (
        <div className="mt-4" aria-live="polite">
          <p className="text-sm leading-relaxed text-white/85">
            <span className="font-semibold text-white">
              {result.correct ? "Bon choix. " : "Pas tout à fait. "}
            </span>
            {chosen.feedback}
          </p>
          <EffectChips effects={chosen.effects} />
          <div className="mt-4 border-l-2 border-ok bg-black/30 px-3 py-2">
            <p className="text-xs text-white/60">Ajouté au journal</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{poi.knowledge.title}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={close}
        className="mt-5 bg-nasa-red px-5 py-2.5 font-display text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-[#ff5340] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {result ? (allDone ? "Voir le bilan" : "Retour à l'exploration") : "Fermer"}
      </button>
    </section>
  );
}
