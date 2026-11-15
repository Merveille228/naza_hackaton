import gsap from "gsap";

/**
 * Terre, sortie du vaisseau, virage de 90° en 2 s sans le figer,
 * voyage vers Mars qui rapetisse, puis atterrissage et sortie du pilote.
 */
export function buildIntroTimeline(ctx) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  const { cam, pose } = ctx;
  const er = ctx.earth.radius;

  tl.addLabel("earth", 0);
  tl.fromTo(
    ctx.earthFade,
    { v: 0 },
    {
      v: 1,
      duration: 3.4,
      ease: "power1.out",
      onUpdate: () => ctx.earth.setFade(ctx.earthFade.v),
    },
    "earth",
  );
  tl.to(
    cam,
    {
      x: er * 0.06,
      y: er * 0.32,
      z: er * 2.55,
      lx: 0,
      ly: er * 0.02,
      lz: 0,
      fov: 38,
      duration: 6.5,
      ease: "power1.inOut",
    },
    "earth",
  );

  tl.addLabel("emerge", 6.5);
  tl.add(() => ctx.revealShip(), "emerge");
  tl.fromTo(
    pose,
    { x: 0, y: 5.4, z: er + 2, s: 0.08 },
    { x: 0, y: 6.2, z: er + 48, s: 1, duration: 4.2, ease: "power1.out" },
    "emerge",
  );
  tl.to(
    cam,
    {
      x: 0,
      y: 8.5,
      z: er * 2.45,
      lx: 0,
      ly: 5.2,
      lz: er + 16,
      fov: 40,
      duration: 2.15,
    },
    "emerge",
  );
  tl.to(ctx.ship.params, { engine: 1, duration: 1.3, ease: "power2.out" }, "emerge+=0.4");

  // 2,2 s après la sortie : virage d'environ 90°, le vaisseau continue d'avancer.
  tl.addLabel("turn", 8.7);
  tl.add(() => ctx.startSwing(), "turn");
  tl.to(ctx.rig, { swing: 1, duration: 2, ease: "power2.inOut" }, "turn");

  tl.addLabel("voyage", 10.7);
  tl.add(() => {
    ctx.rig.yaw = 1;
    ctx.setCamLock("fly");
    ctx.revealMars();
  }, "voyage");
  tl.to(ctx.rig, { yaw: 0, duration: 1.4, ease: "power2.inOut" }, "voyage");
  tl.to(pose, { z: 260, y: 8, s: 0.22, duration: 8.5, ease: "power1.in" }, "voyage");
  tl.to(ctx.ship.params, { engine: 0.7, duration: 1.5 }, "voyage+=1");

  tl.addLabel("cut", 19.4);
  tl.to(
    ctx.black,
    {
      v: 1,
      duration: 0.28,
      ease: "power1.in",
      onUpdate: () => ctx.ui.setFade(ctx.black.v),
    },
    "cut",
  );
  tl.add(() => ctx.cutToSurface(), "cut+=0.28");
  tl.to(
    ctx.black,
    {
      v: 0,
      duration: 0.55,
      ease: "power1.out",
      onUpdate: () => ctx.ui.setFade(ctx.black.v),
    },
    "cut+=0.4",
  );

  tl.addLabel("touchdown", 19.9);
  tl.to(ctx.surfaceAlt, { y: 0, duration: 4.2, ease: "power2.inOut" }, "touchdown");
  tl.to(ctx.ship.params, { engine: 0.4, duration: 0.6 }, "touchdown");
  tl.to(ctx.ship.params, { engine: 0, heat: 0, duration: 1.4 }, "touchdown+=2.2");
  tl.fromTo(
    cam,
    { x: 7.2, y: 3.4, z: 5.4, lx: 1.1, ly: 1.6, lz: 0.2, fov: 38 },
    { x: 6.4, y: 2.2, z: 4.6, lx: 1.3, ly: 1.3, lz: 0.2, fov: 34, duration: 4.2, immediateRender: false },
    "touchdown",
  );

  tl.addLabel("grounded", 24.2);
  tl.to(ctx.ship.params, { hatch: 1, duration: 1.6, ease: "power2.inOut" }, "grounded");
  tl.to(
    cam,
    { x: 5.6, y: 1.85, z: 3.6, lx: 1.6, ly: 1.25, lz: 0.35, fov: 32, duration: 1.6 },
    "grounded",
  );

  tl.addLabel("egress", 26);
  tl.add(() => ctx.beginEgress(), "egress");
  tl.to(
    cam,
    { x: 5.1, y: 1.55, z: 2.8, lx: 3.2, ly: 1.15, lz: 0.7, fov: 30, duration: 4.2 },
    "egress",
  );

  tl.addLabel("titles", 30.6);
  tl.add(() => ctx.ui.showFinale(), "titles");
  tl.to({}, { duration: 6.5 }, "titles");
  tl.add(() => ctx.finish());

  return tl;
}
