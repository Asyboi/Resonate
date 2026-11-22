// Keeps node objects between streamed events, so the map doesn't jump when someone new arrives.
import { toGraph, type GraphLink, type GraphNode } from "./graph";
import type { Lesson, Match, Person } from "./types";

export type LayoutNode = GraphNode & { x?: number; y?: number; fx?: number; fy?: number; alpha?: number };

const SPREAD_X = 230;
const SPREAD_Y = 130;
const SPRING_JITTER = 10;
const SETTLED_DISTANCE = 110;

export class Layout {
  private nodes = new Map<string, LayoutNode>();

  constructor(private reducedMotion: boolean) {}

  sync(lessons: Lesson[], people: Person[], matches: Match[]): { nodes: LayoutNode[]; links: GraphLink[] } {
    const { nodes, links } = toGraph(lessons, people, matches);
    const next = new Map<string, LayoutNode>();
    // toGraph lists lessons first, so a person's lesson always exists by the time they're placed.
    nodes.forEach((node, index) => {
      let placed = this.nodes.get(node.id);
      if (placed) Object.assign(placed, node);
      else {
        placed = { ...node };
        const angle = index * 2.4; // The golden angle, so arrivals fan out.
        if (node.kind === "lesson") {
          const around = (index / lessons.length) * 2 * Math.PI + Math.PI;
          placed.x = lessons.length > 1 ? Math.cos(around) * SPREAD_X : 0;
          placed.y = lessons.length > 1 ? Math.sin(around) * SPREAD_Y : 0;
        } else {
          const link = links.find((item) => item.personId === node.id);
          const home = link && next.get(link.lessonId);
          const distance = this.reducedMotion ? SETTLED_DISTANCE : SPRING_JITTER;
          placed.x = (home?.x ?? 0) + Math.cos(angle) * distance;
          placed.y = (home?.y ?? 0) + Math.sin(angle) * distance;
        }
      }
      next.set(node.id, placed);
    });
    this.nodes = next;
    return { nodes: [...next.values()], links };
  }
}
