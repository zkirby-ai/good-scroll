const cards = [
  {
    category: 'Bio',
    title: 'Why protein timing probably matters less than total intake',
    source: 'Examine / review article',
    summary: 'A high-signal, non-hysterical piece on what actually matters for muscle growth.'
  },
  {
    category: 'Policy',
    title: 'The hidden geometry of representation in large democracies',
    source: 'Longform essay',
    summary: 'A readable deep dive into why institutional scaling quietly changes political power.'
  },
  {
    category: 'Paper',
    title: 'Aging clocks and what they really measure',
    source: 'Research paper',
    summary: 'The kind of thing worth reading twice instead of opening X for the 40th time.'
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero card">
        <p className="eyebrow">good scroll</p>
        <h1>Your private anti-sludge feed.</h1>
        <p className="sub">Scroll things that make you smarter, calmer, or more interesting — not vaguely worse.</p>
      </section>

      <section className="feed">
        {cards.map((card) => (
          <article className="card articleCard" key={card.title}>
            <span className="pill">{card.category}</span>
            <h2>{card.title}</h2>
            <p>{card.summary}</p>
            <div className="metaRow">
              <span>{card.source}</span>
              <button>Save</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
