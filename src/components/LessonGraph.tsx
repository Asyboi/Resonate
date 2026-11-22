"use client";

import { forceCollide, forceX, forceY } from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph, { type ForceGraphMethods } from "react-force-graph-2d";
import { rankFor, type GraphLink, type Selection } from "@/lib/graph";
import { Layout, type LayoutNode } from "@/lib/layout";
import type { Lesson, Match, Person } from "@/lib/types";

// The canvas can't read theme variables.
const COLOR = {
  navy: "#0b2559",
  blue: "#1d5fe0",
  sky: "#86b4f3",
  cyan: "#00aeef",
  muted: "#4d6285",
  empty: "#bdc7d6",
  link: "#9db8de",
  white: "#ffffff",
};

const MAX_FIT_ZOOM = 1.5;
const LABEL_ROOM = { x: 130, top: 40, bottom: 84 }; // Screen px the labels need around the dots.
const ALL_LABELS_AT = 1.6; // Times the fitted zoom.
const PULSE_MS = 700;
const PULSE_GAP_MS = 250;
const FADE_PER_FRAME = 0.22;
const LINE_HEIGHT = 22;

type Rect = { x: number; y: number; w: number; h: number; id: string };

export type Pulse = { lessonId: string; at: number };

type End = string | number | { id?: string | number; x?: number; y?: number } | undefined;
const endId = (end: End) => (typeof end === "object" ? String(end.id) : String(end));

const radiusOfLesson = (connections: number) => (connections ? Math.min(26, 12 + 3 * Math.sqrt(connections)) : 12);

function wrap(text: string): string[] {
  if (text.length <= 22) return [text];
  const middle = text.length / 2;
  let cut = -1;
  for (let i = text.indexOf(" "); i >= 0; i = text.indexOf(" ", i + 1)) {
    if (cut < 0 || Math.abs(i - middle) < Math.abs(cut - middle)) cut = i;
  }
  return cut < 0 ? [text] : [text.slice(0, cut), text.slice(cut + 1)];
}

export default function LessonGraph({
  lessons,
  people,
  matches,
  selection,
  highlight,
  pulse,
  emptyText,
  onSelect,
}: {
  lessons: Lesson[];
  people: Person[];
  matches: Match[];
  selection: Selection | null;
  /** People just found through resonance: their labels show and their lesson is lit. */
  highlight: { lessonId: string; personIds: string[] } | null;
  pulse: Pulse | null;
  emptyText: (lessonId: string) => string;
  onSelect: (selection: Selection) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const graph = useRef<ForceGraphMethods<LayoutNode, GraphLink>>(undefined);
  const fittedZoom = useRef(1);
  const touched = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [font] = useState(() => getComputedStyle(document.body).fontFamily);
  const [layout] = useState(() => new Layout(reducedMotion));

  const data = useMemo(() => layout.sync(lessons, people, matches), [layout, lessons, people, matches]);

  const activeLesson = highlight?.lessonId ?? selection?.lessonId ?? null;
  const selectedId = highlight ? null : (selection?.personId ?? null);

  const view = useMemo(() => {
    const topOf = (lessonId: string | null) =>
      new Set(lessonId ? rankFor(lessonId, matches).slice(0, 3).map((match) => match.personId) : []);
    const neighborsOf = (id: string | null) => {
      const near = new Set<string>(id ? [id] : []);
      for (const match of matches) {
        if (match.lessonId === id) near.add(match.personId);
        if (match.personId === id) near.add(match.lessonId);
      }
      return near;
    };
    const top = topOf(activeLesson);
    const focus = neighborsOf(hovered ?? activeLesson);
    const labeled = new Set(hovered ? topOf(hovered) : highlight?.personIds.length ? highlight.personIds : top);
    if (hovered) labeled.add(hovered);
    if (selectedId) labeled.add(selectedId);
    return { top, focus, labeled, dim: hovered ? 0.2 : 0.45, anyLit: Boolean(hovered ?? activeLesson) };
  }, [matches, activeLesson, hovered, highlight, selectedId]);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ready = size.width > 0;
  useEffect(() => {
    const instance = graph.current;
    if (!ready || !instance) return;
    instance.d3Force("charge")?.strength(-420);
    instance.d3Force("link")?.distance(110);
    instance.d3Force(
      "collide",
      forceCollide<LayoutNode>((node) => (node.kind === "lesson" ? radiusOfLesson(node.connections) + 62 : 8 + 22)) as never,
    );
    // A little stronger vertically, because the canvas is wider than it is tall.
    instance.d3Force("x", forceX<LayoutNode>(0).strength(0.04) as never);
    instance.d3Force("y", forceY<LayoutNode>(0).strength(0.055) as never);
    instance.d3ReheatSimulation();
  }, [ready]);

  function fit() {
    const instance = graph.current;
    if (!instance || touched.current || !ready) return;
    const nodes = data.nodes.filter((node) => node.x !== undefined && node.y !== undefined);
    if (!nodes.length) return;
    const xs = nodes.map((node) => node.x!);
    const ys = nodes.map((node) => node.y!);
    const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const zoom = Math.min(
      MAX_FIT_ZOOM,
      Math.max(80, size.width - 2 * LABEL_ROOM.x) / Math.max(1, right - left),
      Math.max(80, size.height - LABEL_ROOM.top - LABEL_ROOM.bottom) / Math.max(1, bottom - top),
    );
    fittedZoom.current = zoom;
    instance.zoom(zoom);
    instance.centerAt((left + right) / 2, (top + bottom) / 2 + (LABEL_ROOM.bottom - LABEL_ROOM.top) / 2 / zoom);
  }

  useEffect(() => {
    // Stretching the window refits. Dragging or zooming by the creator is left alone.
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  function radiusOf(node: LayoutNode): number {
    if (node.kind === "lesson") return radiusOfLesson(node.connections);
    if (node.id === selectedId) return 11;
    if (node.origin === "resonance") return 9;
    return view.top.has(node.id) ? 10 : 8;
  }

  function drawNode(node: LayoutNode, ctx: CanvasRenderingContext2D, scale: number) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const px = 1 / scale;
    const target = !view.anyLit || view.focus.has(node.id) ? 1 : view.dim;
    const alpha = reducedMotion ? target : (node.alpha ?? 1) + (target - (node.alpha ?? 1)) * FADE_PER_FRAME;
    node.alpha = alpha;
    const r = radiusOf(node) * px;
    const selected = node.id === selectedId;
    const resonant = node.kind === "person" && node.origin === "resonance";

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle =
      node.kind === "lesson" ? (node.connections ? COLOR.navy : COLOR.empty) : selected ? COLOR.blue : resonant ? COLOR.cyan : COLOR.sky;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();

    if (selected || resonant) {
      ctx.strokeStyle = resonant ? COLOR.cyan : COLOR.blue;
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.arc(x, y, r + 5 * px, 0, 2 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Labels are drawn last, in screen pixels, so they never overlap each other or a dot.
   * Lesson names are placed first and always drawn. A person's label gives way if there's no room.
   */
  function drawLabels(ctx: CanvasRenderingContext2D, scale: number) {
    const placed: Rect[] = data.nodes.map((node) => {
      const r = radiusOf(node) + 3;
      return { x: (node.x ?? 0) * scale - r, y: (node.y ?? 0) * scale - r, w: 2 * r, h: 2 * r, id: node.id };
    });
    const corner = graph.current?.screen2GraphCoords(0, 0) ?? { x: 0, y: 0 };
    const edge = { left: corner.x * scale + 4, top: corner.y * scale + 4, right: 0, bottom: 0 };
    edge.right = edge.left + size.width - 8;
    edge.bottom = edge.top + size.height - 8;
    const clipped = (rect: Rect) =>
      Math.max(0, edge.left - rect.x, rect.x + rect.w - edge.right, edge.top - rect.y, rect.y + rect.h - edge.bottom);
    const overlap = (rect: Rect) =>
      placed.reduce((total, other) => {
        if (other.id === rect.id) return total;
        const w = Math.min(rect.x + rect.w, other.x + other.w) - Math.max(rect.x, other.x);
        const h = Math.min(rect.y + rect.h, other.y + other.h) - Math.max(rect.y, other.y);
        return w > 0 && h > 0 ? total + w * h : total;
      }, 0);

    const showAll = scale >= fittedZoom.current * ALL_LABELS_AT;
    const priority = (node: LayoutNode) =>
      node.kind === "lesson" ? (node.id === activeLesson ? 0 : 1) : node.id === selectedId || node.id === hovered ? 2 : 3;
    const ordered = data.nodes
      .filter((node) => node.kind === "lesson" || showAll || view.labeled.has(node.id))
      .sort((a, b) => priority(a) - priority(b));

    ctx.save();
    ctx.scale(1 / scale, 1 / scale);
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLOR.white;
    ctx.textBaseline = "middle";

    for (const node of ordered) {
      const x = (node.x ?? 0) * scale;
      const y = (node.y ?? 0) * scale;
      const r = radiusOf(node);
      const isLesson = node.kind === "lesson";
      const empty = node.kind === "lesson" && node.connections === 0;
      const selected = node.id === selectedId;
      const bold = isLesson || selected || Boolean(highlight?.personIds.includes(node.id));

      const lines = (isLesson ? wrap(node.text) : [node.text]).map((text) => ({
        text,
        font: `${bold ? 700 : 400} ${isLesson ? 18 : 17}px ${font}`,
        color: empty ? COLOR.muted : selected ? COLOR.blue : COLOR.navy,
      }));
      if (empty) lines.push({ text: emptyText(node.id), font: `400 15px ${font}`, color: COLOR.muted });

      const w = Math.max(
        ...lines.map((line) => {
          ctx.font = line.font;
          return ctx.measureText(line.text).width;
        }),
      );
      const h = lines.length * LINE_HEIGHT;
      const ring = selected || (node.kind === "person" && node.origin === "resonance");
      const gap = r + (isLesson ? 9 : ring ? 13 : 8);

      const below = { x: x - w / 2, y: y + gap, w, h, id: node.id };
      const above = { x: x - w / 2, y: y - gap - h, w, h, id: node.id };
      const right = { x: x + gap, y: y - h / 2, w, h, id: node.id };
      const left = { x: x - gap - w, y: y - h / 2, w, h, id: node.id };
      const link = data.links.find((item) => item.personId === node.id);
      const home = link && data.nodes.find((item) => item.id === link.lessonId);
      const away = (node.x ?? 0) >= (home?.x ?? 0);
      const options = isLesson ? [below, above, right, left] : away ? [right, left, above, below] : [left, right, above, below];

      const scored = options.map((rect) => ({ rect, cost: overlap(rect) + clipped(rect) * LINE_HEIGHT }));
      const free = scored.find((option) => option.cost === 0);
      // New resonance people are the point of the loop, so theirs always show.
      if (!free && priority(node) === 3 && !highlight?.personIds.includes(node.id)) continue;
      const { rect } = free ?? scored.reduce((best, option) => (option.cost < best.cost ? option : best));
      placed.push({ ...rect, id: `${node.id}:label` });

      const alpha = node.alpha ?? 1;
      ctx.globalAlpha = isLesson ? Math.max(alpha, 0.55) : alpha;
      ctx.textAlign = isLesson ? "center" : "left";
      const at = isLesson ? rect.x + rect.w / 2 : rect.x;
      lines.forEach((line, index) => {
        const middle = rect.y + (index + 0.5) * LINE_HEIGHT;
        ctx.font = line.font;
        ctx.fillStyle = line.color;
        ctx.strokeText(line.text, at, middle);
        ctx.fillText(line.text, at, middle);
      });
    }
    ctx.restore();
  }

  function drawLink(link: GraphLink, ctx: CanvasRenderingContext2D, scale: number) {
    const from = link.source as unknown as LayoutNode;
    const to = link.target as unknown as LayoutNode;
    if (from.x === undefined || to.x === undefined) return;
    const resonant = to.kind === "person" && to.origin === "resonance";
    const lit = hovered ? hovered === endId(link.source) || hovered === endId(link.target) : link.lessonId === activeLesson;
    const strong = link.strength >= 4;
    ctx.save();
    ctx.globalAlpha = !view.anyLit || lit ? 1 : view.dim;
    ctx.strokeStyle = resonant ? COLOR.cyan : lit ? COLOR.blue : COLOR.link;
    ctx.lineWidth = (lit ? (strong ? 2 : 1.25) : strong ? 1.75 : 1) / scale;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y ?? 0);
    ctx.lineTo(to.x, to.y ?? 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawPulse(ctx: CanvasRenderingContext2D, scale: number) {
    if (!pulse || reducedMotion) return;
    const node = data.nodes.find((item) => item.id === pulse.lessonId);
    if (node?.x === undefined) return;
    for (const delay of [0, PULSE_GAP_MS]) {
      const t = (Date.now() - pulse.at - delay) / PULSE_MS;
      if (t < 0 || t > 1) continue;
      ctx.save();
      ctx.globalAlpha = 0.8 * (1 - t);
      ctx.strokeStyle = COLOR.cyan;
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.arc(node.x, node.y ?? 0, (radiusOf(node) + 80 * t) / scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  function select(node: LayoutNode) {
    if (node.kind === "lesson") {
      const best = rankFor(node.id, matches)[0];
      if (best) onSelect({ lessonId: node.id, personId: best.personId });
      return;
    }
    const own = matches.filter((match) => match.personId === node.id).sort((a, b) => b.strength - a.strength);
    const match = own.find((item) => item.lessonId === activeLesson) ?? own[0];
    if (match) onSelect({ lessonId: match.lessonId, personId: node.id });
  }

  return (
    <div
      ref={box}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      onWheel={() => (touched.current = true)}
      onPointerMove={(event) => {
        if (event.buttons) touched.current = true;
      }}
    >
      {ready && (
        <ForceGraph<LayoutNode, GraphLink>
          ref={graph}
          width={size.width}
          height={size.height}
          graphData={data}
          nodeLabel={() => ""}
          linkLabel={() => ""}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node, color, ctx, scale) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, Math.max(16, radiusOf(node)) / scale, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkCanvasObject={drawLink}
          linkPointerAreaPaint={() => {}}
          onRenderFramePre={drawPulse}
          onRenderFramePost={drawLabels}
          autoPauseRedraw={false}
          minZoom={0.2}
          maxZoom={5}
          d3VelocityDecay={0.3}
          warmupTicks={reducedMotion ? 120 : 0}
          cooldownTime={5000}
          onEngineTick={fit}
          onEngineStop={fit}
          onNodeHover={(node) => setHovered(node ? node.id : null)}
          onNodeClick={select}
          onNodeDrag={() => (touched.current = true)}
        />
      )}
    </div>
  );
}
