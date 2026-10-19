/**
 * Chapter 07 · Por qué EMOJ: the small story each card's icon tells once
 * it has drawn itself (src/components/home/chapters/ReasonsChapter.astro).
 * The icons are the Lucide ones; a story only moves, draws or pulses their
 * own strokes (and, for the team, two joining lines added in the markup).
 *
 * - plazos (calendar-check): the page flips twice, the binder rings jump,
 *   then the deadline is ticked.
 * - calidad (badge-check): the check snaps into the seal with a pulse.
 * - equipo (users): the second person steps in and lines join the team.
 * - confianza (handshake): both hands come together and grip.
 *
 * Every tween is authored on the chapter's scrubbed timeline, so a story
 * plays with the scroll and rewinds with it.
 */
import { stagger, svg, utils } from "animejs";
import type { SceneTimeline } from "./scrub";

export interface IconStory {
  /** Strokes the story draws itself, left out of the icon's first draw. */
  late: SVGGeometryElement[];
  /** First frame (only while the scenes play). */
  reset(): void;
  /** The story, between `at` and `at + span` of the timeline. */
  play(timeline: SceneTimeline, at: number, span: number): void;
}

type Story = (icon: SVGSVGElement) => IconStory;

const strokes = (icon: SVGSVGElement) =>
  [...icon.children].filter(
    (node): node is SVGGeometryElement => node instanceof SVGGeometryElement,
  );

const pick = <T>(list: T[], indexes: number[]) =>
  indexes.flatMap((i) => (list[i] === undefined ? [] : [list[i]]));

const pulse = (
  timeline: SceneTimeline,
  icon: SVGSVGElement,
  at: number,
  span: number,
  values: number[],
) =>
  timeline.add(icon, { scale: values, duration: span, ease: "inOutSine" }, at);

const plazos: Story = (icon) => {
  const nodes = strokes(icon);
  // Rings, page (frame and header), check.
  const rings = pick(nodes, [0, 1]);
  const page = pick(nodes, [2, 3]);
  const check = pick(nodes, [4]);
  const tick = svg.createDrawable(check);
  return {
    late: check,
    reset: () => utils.set(tick, { draw: "0 0" }),
    play(timeline, at, span) {
      timeline
        .add(
          page,
          {
            scaleY: [1, 0.15, 1, 0.15, 1],
            duration: span * 0.55,
            ease: "inOutSine",
          },
          at,
        )
        .add(
          rings,
          {
            translateY: [0, -2, 0, -2, 0],
            duration: span * 0.55,
            ease: "inOutSine",
          },
          at,
        )
        .add(
          tick,
          { draw: ["0 0", "0 1"], duration: span * 0.3, ease: "outCubic" },
          at + span * 0.6,
        );
      pulse(timeline, icon, at + span * 0.75, span * 0.25, [1, 1.12, 1]);
    },
  };
};

const calidad: Story = (icon) => {
  const check = pick(strokes(icon), [1]);
  const tick = svg.createDrawable(check);
  return {
    late: check,
    reset: () => utils.set(tick, { draw: "0 0" }),
    play(timeline, at, span) {
      timeline.add(
        tick,
        { draw: ["0 0", "0 1"], duration: span * 0.3, ease: "outExpo" },
        at,
      );
      pulse(timeline, icon, at + span * 0.25, span * 0.45, [1, 1.2, 0.96, 1]);
    },
  };
};

const equipo: Story = (icon) => {
  const nodes = strokes(icon);
  // The second person (head arc and shoulders), and the joining lines.
  const second = pick(nodes, [1, 2]);
  const joins = [...icon.querySelectorAll<SVGGeometryElement>("[data-join]")];
  const lines = svg.createDrawable(joins);
  return {
    late: joins,
    reset() {
      utils.set(second, { translateX: 3 });
      utils.set(lines, { draw: "0 0" });
    },
    play(timeline, at, span) {
      timeline
        .add(
          second,
          { translateX: [3, 0], duration: span * 0.4, ease: "outBack(2)" },
          at,
        )
        .add(
          lines,
          {
            draw: ["0 0", "0 1"],
            duration: span * 0.35,
            delay: stagger(span * 0.15),
            ease: "inOutSine",
          },
          at + span * 0.35,
        );
      pulse(timeline, icon, at + span * 0.7, span * 0.3, [1, 1.1, 1]);
    },
  };
};

const confianza: Story = (icon) => {
  const nodes = strokes(icon);
  const right = pick(nodes, [0, 1, 2]);
  const left = pick(nodes, [3, 4]);
  return {
    late: [],
    reset() {
      utils.set(left, { translateX: -3 });
      utils.set(right, { translateX: 3 });
    },
    play(timeline, at, span) {
      timeline
        .add(
          left,
          { translateX: [-3, 0], duration: span * 0.5, ease: "outBack(1.6)" },
          at,
        )
        .add(
          right,
          { translateX: [3, 0], duration: span * 0.5, ease: "outBack(1.6)" },
          at,
        );
      pulse(timeline, icon, at + span * 0.5, span * 0.45, [1, 0.9, 1.08, 1]);
    },
  };
};

const STORIES: Record<string, Story> = { plazos, calidad, equipo, confianza };

/** The story for a card's icon, or a still icon when it has none. */
export function iconStory(kind: string, icon: SVGSVGElement | null): IconStory {
  const story = icon ? STORIES[kind]?.(icon) : undefined;
  return story ?? { late: [], reset: () => undefined, play: () => undefined };
}
