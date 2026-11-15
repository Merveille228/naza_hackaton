import Link from "next/link";
import { HeroScene } from "@/components/scene/HeroScene";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 starfield opacity-50" aria-hidden />
      <HeroScene />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="font-display text-sm font-semibold tracking-[0.22em] text-white/90 uppercase">
          ORBITe 3
        </p>
        <p className="font-mono text-[11px] tracking-wide text-nasa-grey uppercase">
          Space Apps Challenge
        </p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-16 sm:px-10 lg:max-w-2xl">
        <p className="animate-rise font-mono text-xs tracking-[0.28em] text-nasa-red uppercase">
          Junior Astronaut Mission Trainer
        </p>

        <h1 className="animate-rise-delay-1 mt-4 font-display text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          ORBITe 3
        </h1>

        <p className="animate-rise-delay-2 mt-5 max-w-md text-lg leading-relaxed text-white/75 sm:text-xl">
          Dirige une colonie lunaire ou martienne. Chaque choix compte : oxygène,
          énergie, nourriture, radiations.
        </p>

        <div className="animate-rise-delay-3 mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/intro"
            className="inline-flex items-center justify-center bg-nasa-red px-7 py-3.5 font-display text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-[#ff5340]"
            style={{ animation: "pulse-cta 2.4s ease-in-out infinite" }}
          >
            Lancer la mission
          </Link>
          <Link
            href="/play"
            className="inline-flex items-center justify-center border border-white/25 bg-nasa-blue/40 px-7 py-3.5 font-display text-sm font-semibold tracking-wide text-white uppercase backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-nasa-blue/60"
          >
            Mode Cadet
          </Link>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 py-4 sm:px-10">
        <p className="max-w-3xl text-xs leading-relaxed text-nasa-grey">
          Projet éducatif indépendant pour le NASA Space Apps Challenge. Non
          affilié officiellement à la NASA. Couleurs inspirées de la charte
          insignia NASA (rouge #FC3D21, bleu #0B3D91).
        </p>
      </footer>
    </div>
  );
}
