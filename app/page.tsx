'use client';

import { useMemo, useState } from 'react';

type ArticleCard = {
  id: string;
  category: 'Bio' | 'Policy' | 'Paper' | 'Essay' | 'Ideas';
  title: string;
  source: string;
  summary: string;
  readMinutes: number;
};

type FeedState = {
  saved: string[];
  dismissed: string[];
  read: string[];
};

const seedCards: ArticleCard[] = [
  {
    id: 'protein-timing',
    category: 'Bio',
    title: 'Why protein timing probably matters less than total intake',
    source: 'Examine / review article',
    summary: 'A high-signal, non-hysterical piece on what actually matters for muscle growth and what mostly turns into noise.',
    readMinutes: 9
  },
  {
    id: 'representation-geometry',
    category: 'Policy',
    title: 'The hidden geometry of representation in large democracies',
    source: 'Longform essay',
    summary: 'A readable deep dive into why institutional scaling quietly changes political power and personal agency.',
    readMinutes: 14
  },
  {
    id: 'aging-clocks',
    category: 'Paper',
    title: 'Aging clocks and what they really measure',
    source: 'Research paper',
    summary: 'The kind of paper worth opening instead of opening X for the 40th time and learning absolutely nothing.',
    readMinutes: 18
  },
  {
    id: 'attention-rituals',
    category: 'Essay',
    title: 'Attention rituals for people who live on the internet',
    source: 'Essay',
    summary: 'Practical thinking about replacing default stimulation loops with higher-signal habits that still feel good.',
    readMinutes: 7
  }
];

function loadState(): FeedState {
  if (typeof window === 'undefined') {
    return { saved: [], dismissed: [], read: [] };
  }
  try {
    const raw = window.localStorage.getItem('good-scroll-state');
    return raw ? (JSON.parse(raw) as FeedState) : { saved: [], dismissed: [], read: [] };
  } catch {
    return { saved: [], dismissed: [], read: [] };
  }
}

export default function HomePage() {
  const [feedState, setFeedState] = useState<FeedState>(() => loadState());
  const [cursor, setCursor] = useState(0);

  function persist(next: FeedState) {
    setFeedState(next);
    window.localStorage.setItem('good-scroll-state', JSON.stringify(next));
  }

  const availableCards = useMemo(
    () => seedCards.filter((card) => !feedState.dismissed.includes(card.id)),
    [feedState.dismissed]
  );

  const currentCard = availableCards[Math.min(cursor, Math.max(availableCards.length - 1, 0))] ?? null;
  const savedCount = feedState.saved.length;
  const readCount = feedState.read.length;

  function markSaved() {
    if (!currentCard) return;
    const next = {
      ...feedState,
      saved: feedState.saved.includes(currentCard.id) ? feedState.saved : [...feedState.saved, currentCard.id]
    };
    persist(next);
  }

  function markRead() {
    if (!currentCard) return;
    const next = {
      ...feedState,
      read: feedState.read.includes(currentCard.id) ? feedState.read : [...feedState.read, currentCard.id]
    };
    persist(next);
  }

  function dismissCard() {
    if (!currentCard) return;
    const next = {
      ...feedState,
      dismissed: feedState.dismissed.includes(currentCard.id) ? feedState.dismissed : [...feedState.dismissed, currentCard.id]
    };
    persist(next);
    setCursor(0);
  }

  function nextCard() {
    if (!availableCards.length) return;
    setCursor((current) => (current + 1) % availableCards.length);
  }

  return (
    <main className="shell">
      <section className="hero card">
        <p className="eyebrow">good scroll</p>
        <h1>Your private anti-sludge feed.</h1>
        <p className="sub">One good thing at a time. No junk, no infinite-scroll brain melt.</p>
      </section>

      <section className="statsGrid">
        <article className="card statCard">
          <span>Saved</span>
          <strong>{savedCount}</strong>
        </article>
        <article className="card statCard">
          <span>Read</span>
          <strong>{readCount}</strong>
        </article>
      </section>

      {currentCard ? (
        <section className="card focusCard">
          <div className="focusTop">
            <span className="pill">{currentCard.category}</span>
            <span className="metaChip">{currentCard.readMinutes} min</span>
          </div>

          <h2>{currentCard.title}</h2>
          <p className="summary">{currentCard.summary}</p>

          <div className="sourceRow">
            <span>{currentCard.source}</span>
          </div>

          <div className="actionGrid">
            <button className="secondary" onClick={markSaved}>Save</button>
            <button className="secondary" onClick={markRead}>Mark read</button>
            <button className="secondary" onClick={dismissCard}>Dismiss</button>
            <button className="primary" onClick={nextCard}>Next good thing</button>
          </div>
        </section>
      ) : (
        <section className="card emptyCard">
          <p className="eyebrow">feed cleared</p>
          <h2>No more good things queued.</h2>
          <p className="sub">That’s a good problem. Time to seed more signal.</p>
        </section>
      )}
    </main>
  );
}
