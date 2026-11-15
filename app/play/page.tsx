import type { Metadata } from "next";
import { Level4 } from "@/components/level4/Level4";

export const metadata: Metadata = {
  title: "ORBITE 3 — Niveau 4 : Découvrir et créer",
  description:
    "Explorez le terrain martien, faites des expériences et découvrez comment l'énergie, l'eau, l'air, la nourriture et les radiations sont liés.",
};

export default function PlayPage() {
  return <Level4 />;
}
