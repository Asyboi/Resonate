// Pure. Takes no Person, so it cannot leak a found person's name, quote or link.
const MAX_CHARS = 8000; // Stanley's message limit.

export function buildBrief(args: { lesson: string; situation: string; angle: string; take: string }): string {
  const { lesson, situation, angle, take } = args;
  if (!take.trim()) throw new Error("A brief needs the creator's take");

  const text = [
    "Write a LinkedIn post in my voice.",
    [
      `Who it's for: someone in this situation: ${situation}`,
      `The lesson I've earned: ${lesson}`,
      ...(angle ? [`The angle only I have: ${angle}`] : []),
      `In my words: ${take.trim()}`,
    ].join("\n"),
    "Keep my words and rhythm. Use only facts I gave here or that you already know are true about me. Don't invent moments, numbers or feelings. Speak to the situation without describing a specific person. Open on a concrete moment. No engagement bait and no em dashes.",
    "Save it as an unscheduled draft. Do not schedule it. Do not publish it.",
  ].join("\n\n");

  if (text.length > MAX_CHARS) throw new Error("That brief is too long for Stanley. Shorten your take.");
  return text;
}
