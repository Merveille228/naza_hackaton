"use client";

import Link from "next/link";
import { useGame } from "@/lib/game/GameProvider";
import { POIS, RESOURCE_META } from "@/lib/game/level4Data";
import type { Resource } from "@/lib/game/types";

const ORDER: Resource[] = ["energy", "air", "water", "food", "radiation"];

function summary(correct: number, total: number): string {
  if (correct === total) {
    return "Parcours sans faute : vous avez compris comment les systèmes de la base dépendent les uns des autres.";
  }
  if (correct >= total - 2) {
    return "Bon résultat. Relisez les fiches des expériences manquées avant de passer à la fabrication de produits.";
  }
  return "Plusieurs choix ont coûté cher en ressources. Relisez les fiches, puis rejouez le niveau pour tester d'autres décisions.";
}

export function JournalPanel() {
  const { state, dispatch } = useGame();
  if (!state.journalOpen) return null;

  const doneCount = Object.keys(state.results).length;
  const correctCount = Object.values(state.results).filter((r) => r.correct).length;
  const finished = doneCount === POIS.length;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => dispatch({ type: "closeJournal" })}
    >
      <section
        role="dialog"
        aria-label="Journal de bord"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-xl overflow-y-auto border border-white/15 bg-panel p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-white">
            {finished ? "Bilan du niveau 4" : "Journal de bord"}
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "closeJournal" })}
            className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Fermer
          </button>
        </div>

        {finished && (
          <div className="mt-4">
            <p className="text-sm leading-relaxed text-white/85">
              {correctCount} bons choix sur {POIS.length}. {summary(correctCount, POIS.length)}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ORDER.map((key) => (
                <li key={key} className="bg-black/30 px-2 py-2">
                  <p className="text-xs text-white/60">{RESOURCE_META[key].label}</p>
                  <p className="font-mono text-sm text-white">
                    {Math.round(state.resources[key])}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="mt-6 text-sm font-semibold text-white/70">
          Fiches découvertes ({doneCount}/{POIS.length})
        </h3>
        {doneCount === 0 ? (
          <p className="mt-2 text-sm text-white/70">
            Aucune fiche pour l&apos;instant. Rendez-vous à un point lumineux sur le terrain
            pour faire votre première expérience.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {POIS.filter((poi) => state.results[poi.id]).map((poi) => (
              <li key={poi.id} className="border-l-2 border-ok bg-black/25 px-3 py-2.5">
                <p className="text-sm font-semibold text-white">{poi.knowledge.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/75">
                  {poi.knowledge.text}
                </p>
              </li>
            ))}
          </ul>
        )}

        {finished && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: "reset" })}
              className="bg-nasa-red px-5 py-2.5 font-display text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-[#ff5340] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Rejouer le niveau
            </button>
            <Link
              href="/"
              className="border border-white/25 px-5 py-2.5 font-display text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
