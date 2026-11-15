"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GameProvider, useGame } from "@/lib/game/GameProvider";
import { POIS } from "@/lib/game/level4Data";
import { ExperimentPanel } from "./ExperimentPanel";
import { Hud } from "./Hud";
import { JournalPanel } from "./JournalPanel";
import { Level4Scene, type Travel } from "./Level4Scene";

function Level4Inner() {
  const { state, dispatch } = useGame();
  const [travel, setTravel] = useState<Travel | null>(null);

  const doneIds = useMemo(() => Object.keys(state.results), [state.results]);

  const onSelect = useCallback(
    (poiId: string) => {
      const poi = POIS.find((p) => p.id === poiId);
      if (!poi) return;
      dispatch({ type: "close" });
      setTravel({ poiId, position: poi.position });
    },
    [dispatch],
  );

  const onArrive = useCallback(
    (poiId: string) => dispatch({ type: "open", poiId }),
    [dispatch],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Escape") return;
      dispatch({ type: "close" });
      dispatch({ type: "closeJournal" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <div className="fixed inset-0 bg-space-bg">
      <Level4Scene doneIds={doneIds} travel={travel} onSelect={onSelect} onArrive={onArrive} />
      <Hud />
      <ExperimentPanel />
      <JournalPanel />
    </div>
  );
}

export function Level4() {
  return (
    <GameProvider>
      <Level4Inner />
    </GameProvider>
  );
}
