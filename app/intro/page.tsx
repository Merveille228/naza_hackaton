import type { Metadata } from "next";
import { IntroExperience } from "./IntroExperience";

export const metadata: Metadata = {
  title: "ORBITe 3 — Introduction",
  description: "Introduction cinématique : départ de la Terre, transit, atterrissage sur Mars.",
};

export default function IntroPage() {
  return <IntroExperience />;
}
