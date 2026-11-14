"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function IntroExperience() {
  const host = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;

    let dispose = () => {};
    let cancelled = false;

    import("@/src/main.js")
      .then(({ mountIntro }) => {
        if (cancelled || !host.current) return;
        dispose = mountIntro(host.current, {
          onComplete: () => router.push("/play"),
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!host.current) return;
        const message = error instanceof Error ? error.stack || error.message : String(error);
        host.current.textContent = message;
      });

    return () => {
      cancelled = true;
      dispose();
    };
  }, [router]);

  return <div ref={host} className="fixed inset-0 z-40 bg-black" />;
}
