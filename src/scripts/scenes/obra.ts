/**
 * Chapter 3 · "La órbita" (src/components/home/scenes/ObraScene.astro).
 *
 * The scroll draws an arc around the orbit (`--arc`, 0..1) and a satellite
 * dot rides its tip; the dotted ring around the centre turns (`--spin`).
 * The stage whose slice the tip is in is the active one (orbitStage()):
 * its icon lifts and its detail shows on the left (`data-active`); the
 * labels the arc has passed light up (`data-reached`).
 */
import { orbitStage, segment } from "../../lib/motion/scenes";
import { setVar, type SceneFactory } from "./types";

const ARC_FROM = 0.04;
const ARC_TO = 0.92;

const mark = (
  els: HTMLElement[] | SVGElement[],
  test: (i: number) => boolean,
  name: string,
) => {
  els.forEach((el, i) => el.toggleAttribute(name, test(i)));
};

export const obraScene: SceneFactory = (track) => {
  const stage = track.querySelector<HTMLElement>("[data-obra-stage]");
  const items = [...track.querySelectorAll<HTMLElement>("[data-obra-item]")];
  const labels = [...track.querySelectorAll<SVGElement>("[data-obra-label]")];
  const tiles = [...track.querySelectorAll<SVGElement>("[data-obra-tile]")];
  if (!stage || items.length === 0) return null;
  let shown = "";

  return {
    render(progress) {
      const arc = segment(progress, ARC_FROM, ARC_TO);
      setVar(stage, "--arc", arc);
      setVar(stage, "--spin", progress);
      const { active, reached } = orbitStage(arc, items.length);
      const key = `${active}:${reached}`;
      if (key === shown) return;
      shown = key;
      mark(items, (i) => i === active, "data-active");
      mark(tiles, (i) => i === active, "data-active");
      mark(labels, (i) => i === active, "data-active");
      mark(labels, (i) => i < reached, "data-reached");
      mark(tiles, (i) => i < reached, "data-reached");
    },
  };
};
