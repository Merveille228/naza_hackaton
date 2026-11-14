import Link from "next/link";

export default function PlayPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-space-bg">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-10">
        <Link
          href="/"
          className="font-display text-sm font-semibold tracking-[0.22em] text-white uppercase"
        >
          AstroBase
        </Link>
        <span className="font-mono text-[11px] tracking-wide text-nasa-grey uppercase">
          Mission en préparation
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="font-mono text-xs tracking-[0.28em] text-nasa-red uppercase">
          Sol martien
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Votre mission commence
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/70">
          L&apos;atterrissage est terminé. Le simulateur de colonie — oxygène,
          énergie, nourriture, radiations — prend le relais ici.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center self-center bg-nasa-red px-7 py-3.5 font-display text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-[#ff5340]"
        >
          Retour
        </Link>
      </main>
    </div>
  );
}
