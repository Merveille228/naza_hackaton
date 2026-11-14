import gsap from "gsap";

/**
 * Découpage des cinq séquences. La caméra manuelle est pilotée par GSAP ;
 * le suivi du vaisseau ne fait qu'animer un offset local, appliqué chaque frame.
 */
export function buildIntroTimeline(ctx) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  const { cam, follow } = ctx;
  const er = ctx.earth.radius;
  const orbit = ctx.orbitPoint;

  tl.addLabel("earth", 0);
  tl.fromTo(
    ctx.earthFade,
    { v: 0 },
    {
      v: 1,
      duration: 3.6,
      ease: "power1.out",
      onUpdate: () => ctx.earth.setFade(ctx.earthFade.v),
    },
    "earth",
  );
  tl.to(
    cam,
    {
      x: er * 0.35,
      y: er * 0.48,
      z: er * 3.05,
      lx: 0,
      ly: er * 0.04,
      lz: 0,
      fov: 40,
      duration: 8.2,
      ease: "power1.inOut",
    },
    "earth",
  );
  tl.to(
    cam,
    {
      x: orbit.x + 16,
      y: orbit.y + 6,
      z: orbit.z + 12,
      lx: orbit.x,
      ly: orbit.y + 1.2,
      lz: orbit.z,
      fov: 35,
      duration: 5.6,
    },
    "earth+=7.4",
  );
  tl.add(() => ctx.revealShip(), "earth+=8.2");

  tl.addLabel("depart", 13.2);
  const spin = { a: -0.4 };
  tl.to(
    spin,
    {
      a: Math.PI * 1.15,
      duration: 7,
      ease: "power1.inOut",
      onUpdate: () => {
        if (ctx.mode !== "manual") return;
        const radius = 15;
        cam.x = orbit.x + Math.cos(spin.a) * radius;
        cam.y = orbit.y + 2.8 + Math.sin(spin.a * 0.65) * 1.5;
        cam.z = orbit.z + Math.sin(spin.a) * radius;
        cam.lx = orbit.x;
        cam.ly = orbit.y + 1.35;
        cam.lz = orbit.z;
      },
    },
    "depart",
  );

  tl.addLabel("burn", 20.2);
  tl.add(() => ctx.setMode("follow"), "burn");
  tl.to(ctx.flight, { t: 0.18, duration: 7.4, ease: "power2.in" }, "burn");
  tl.to(ctx.ship.params, { engine: 1, duration: 2.2, ease: "power2.out" }, "burn");
  tl.to(follow, { x: 0.6, y: 3.3, z: 16, lx: 0, ly: 1.45, lz: -8, duration: 7.4 }, "burn");
  tl.to(cam, { fov: 48, duration: 6, ease: "power1.in" }, "burn");

  tl.addLabel("voyage", 27.6);
  tl.to(ctx.flight, { t: 0.78, duration: 12.5, ease: "power1.inOut" }, "voyage");
  tl.to(ctx.stars.streak, { value: 1.7, duration: 5.5, ease: "power1.in" }, "voyage");
  tl.to(follow, { x: 0.2, y: 2.8, z: 17, lx: 0, ly: 1.4, lz: -10, duration: 6 }, "voyage");
  tl.to(follow, { x: 9, y: 3.6, z: -15, lx: 0, ly: 1.5, lz: 12, duration: 6.5 }, "voyage+=6");
  tl.to(cam, { fov: 42, duration: 6 }, "voyage+=5");
  tl.fromTo(
    ctx.marsFade,
    { v: 0 },
    {
      v: 1,
      duration: 4.5,
      ease: "power1.out",
      onUpdate: () => ctx.mars.setFade(ctx.marsFade.v),
    },
    "voyage+=1.2",
  );

  tl.addLabel("approach", 40.1);
  tl.to(ctx.flight, { t: 1, duration: 9.5, ease: "power2.out" }, "approach");
  tl.to(ctx.stars.streak, { value: 0, duration: 4.5 }, "approach");
  tl.to(ctx.ship.params, { engine: 0.42, duration: 3.5 }, "approach");
  tl.to(follow, { x: 12, y: 5, z: -6, lx: 0, ly: 1.4, lz: 14, duration: 9.5 }, "approach");
  tl.to(cam, { fov: 36, duration: 7 }, "approach");

  tl.addLabel("entry", 49.6);
  tl.to(ctx.descent, { t: 1, duration: 5.2, ease: "power1.in" }, "entry");
  tl.to(ctx.ship.params, { engine: 1, heat: 1, duration: 3.8, ease: "power1.in" }, "entry");
  tl.to(follow, { x: 5, y: 3.4, z: -12, lx: 0, ly: 1.5, lz: 6, duration: 5.2 }, "entry");

  tl.addLabel("touchdown", 54.8);
  tl.add(() => ctx.cutToSurface(), "touchdown");
  tl.to(ctx.surfaceAlt, { y: 0, duration: 6.2, ease: "power2.inOut" }, "touchdown");
  tl.to(ctx.ship.params, { heat: 0.12, engine: 0.62, duration: 1.8 }, "touchdown");
  tl.to(ctx.ship.params, { heat: 0, engine: 0, duration: 2.4 }, "touchdown+=3.4");
  tl.to(follow, { x: 9, y: 5.2, z: 8, lx: 0.2, ly: 1.6, lz: 0.4, duration: 6.2 }, "touchdown");

  tl.addLabel("grounded", 61);
  tl.add(() => ctx.setMode("manual"), "grounded");
  tl.to(
    cam,
    { x: 6.8, y: 2.2, z: 5.2, lx: 0.4, ly: 1.4, lz: 0.2, fov: 33, duration: 2.6 },
    "grounded",
  );
  tl.to(ctx.ship.params, { hatch: 1, duration: 2.4, ease: "power2.inOut" }, "grounded+=0.6");

  tl.addLabel("egress", 63.8);
  tl.add(() => ctx.beginEgress(), "egress");
  tl.to(
    cam,
    {
      x: -2.8,
      y: 1.48,
      z: 6.4,
      lx: 2.05,
      ly: 1.4,
      lz: 0.3,
      fov: 30,
      duration: 5.2,
    },
    "egress",
  );

  tl.addLabel("titles", 68.4);
  tl.add(() => ctx.ui.showFinale(), "titles");
  tl.to({}, { duration: 7 }, "titles");
  tl.add(() => ctx.finish());

  return tl;
}
