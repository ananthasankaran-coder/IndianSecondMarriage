/**
 * UI-001 Landing (placeholder for M0). Positioning, principles, safety; no guarantees (handbook §14.2).
 * Registration is intentionally closed: decision D1 (minimum age) is not yet approved for production.
 */
const principles = [
  {
    title: "Trust",
    text: "Clear safety tools and accountable moderation. We explain exactly what each indicator checks.",
  },
  {
    title: "Privacy",
    text: "You choose what to share and when. Your phone number and email are never shown to other members.",
  },
  {
    title: "Understanding",
    text: "Recommendations come with plain-language reasons. We never reduce people to a score.",
  },
  {
    title: "Human decisions",
    text: "AI can help you write and understand. It never messages anyone, or chooses anyone, for you.",
  },
];

export default function LandingPage() {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium tracking-wide text-primary">Closed alpha</p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
          Meet people who are looking for the same kind of relationship.
        </h1>
        <p className="text-lg text-muted">
          An unhurried, private way for adults to discover meaningful long-term relationships. No swiping, no
          popularity contests, no pressure.
        </p>
      </header>

      <section aria-labelledby="principles" className="flex flex-col gap-6">
        <h2 id="principles" className="text-xl font-semibold">
          What we stand for
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {principles.map((p) => (
            <li key={p.title} className="rounded-xl border border-line bg-surface p-5">
              <h3 className="font-medium">{p.title}</h3>
              <p className="mt-2 text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="status" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="status" className="text-lg font-semibold">
          We are not open for registration yet
        </h2>
        <p className="mt-2 text-muted">
          We are testing with a small invited group first so we can get safety and privacy right. We do not
          promise matches or outcomes; we aim to make discovery clearer and more respectful.
        </p>
      </section>
    </main>
  );
}
