'use client';

import { useMemo, useState } from 'react';

type ArticleCard = {
  id: string;
  category: 'Bio' | 'Policy' | 'Paper' | 'Essay' | 'Ideas';
  title: string;
  source: string;
  summary: string;
  readMinutes: number;
  url?: string;
  createdAt?: string;
};

type FeedState = {
  saved: string[];
  dismissed: string[];
  read: string[];
  inbox: ArticleCard[];
};

const seedCards: ArticleCard[] = [
  {
    id: 'protein-timing',
    category: 'Bio',
    title: 'Why protein timing probably matters less than total intake',
    source: 'Examine / review article',
    summary: 'A high-signal, non-hysterical piece on what actually matters for muscle growth and what mostly turns into noise.',
    readMinutes: 9,
    url: 'https://example.com/protein-timing'
  },
  {
    id: 'representation-geometry',
    category: 'Policy',
    title: 'The hidden geometry of representation in large democracies',
    source: 'Longform essay',
    summary: 'A readable deep dive into why institutional scaling quietly changes political power and personal agency.',
    readMinutes: 14,
    url: 'https://example.com/representation-geometry'
  },
  {
    id: 'aging-clocks',
    category: 'Paper',
    title: 'Aging clocks and what they really measure',
    source: 'Research paper',
    summary: 'The kind of paper worth opening instead of opening X for the 40th time and learning absolutely nothing.',
    readMinutes: 18,
    url: 'https://example.com/aging-clocks'
  },
  {
    id: 'attention-rituals',
    category: 'Essay',
    title: 'Attention rituals for people who live on the internet',
    source: 'Essay',
    summary: 'Practical thinking about replacing default stimulation loops with higher-signal habits that still feel good.',
    readMinutes: 7,
    url: 'https://example.com/attention-rituals'
  }
];

function loadState(): FeedState {
  if (typeof window === 'undefined') {
    return { saved: [], dismissed: [], read: [], inbox: [] };
  }
  try {
    const raw = window.localStorage.getItem('good-scroll-state');
    return raw ? (JSON.parse(raw) as FeedState) : { saved: [], dismissed: [], read: [], inbox: [] };
  } catch {
    return { saved: [], dismissed: [], read: [], inbox: [] };
  }
}

export default function HomePage() {
  const [feedState, setFeedState] = useState<FeedState>(() => loadState());
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<ArticleCard['category']>('Ideas');

  function persist(next: FeedState) {
    setFeedState(next);
    window.localStorage.setItem('good-scroll-state', JSON.stringify(next));
  }

  const cards = useMemo(() => [...feedState.inbox, ...seedCards], [feedState.inbox]);
  const visibleCards = useMemo(
    () => cards.filter((card) => !feedState.dismissed.includes(card.id)),
    [cards, feedState.dismissed]
  );

  const savedCount = feedState.saved.length;
  const readCount = feedState.read.length;

  function markSaved(id: string) {
    const next = {
      ...feedState,
      saved: feedState.saved.includes(id) ? feedState.saved : [...feedState.saved, id]
    };
    persist(next);
  }

  function markRead(id: string) {
    const next = {
      ...feedState,
      read: feedState.read.includes(id) ? feedState.read : [...feedState.read, id]
    };
    persist(next);
  }

  function dismissCard(id: string) {
    const next = {
      ...feedState,
      dismissed: feedState.dismissed.includes(id) ? feedState.dismissed : [...feedState.dismissed, id]
    };
    persist(next);
  }

  function addLink() {
    if (!title.trim()) return;
    const nextCard: ArticleCard = {
      id: `inbox-${Date.now()}`,
      category,
      title: title.trim(),
      source: url.trim() || 'Manual inbox',
      summary: 'Saved manually to your private good-scroll feed.',
      readMinutes: 8,
      url: url.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    persist({
      ...feedState,
      inbox: [nextCard, ...feedState.inbox]
    });

    setTitle('');
    setUrl('');
    setCategory('Ideas');
  }

  return (
    <main className="shell">
      <section className="hero card">
        <p className="eyebrow">good scroll</p>
        <h1>Your private anti-sludge feed.</h1>
        <p className="sub">Actually scrollable now — but only with things that are worth your attention.</p>
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

      <section className="card inboxCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">saved-link inbox</p>
            <h2>Drop something good in</h2>
          </div>
        </div>
        <div className="inboxForm">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" />
          <select value={category} onChange={(e) => setCategory(e.target.value as ArticleCard['category'])}>
            <option>Ideas</option>
            <option>Bio</option>
            <option>Policy</option>
            <option>Paper</option>
            <option>Essay</option>
          </select>
          <button className="primary" onClick={addLink}>Add to feed</button>
        </div>
      </section>

      <section className="feed">
        {visibleCards.length ? (
          visibleCards.map((card) => {
            const isSaved = feedState.saved.includes(card.id);
            const isRead = feedState.read.includes(card.id);
            return (
              <article className="card articleCard" key={card.id}>
                <div className="cardTop">
                  <span className="pill">{card.category}</span>
                  <span className="metaChip">{card.readMinutes} min</span>
                </div>
                <h2>{card.title}</h2>
                <p className="summary">{card.summary}</p>
                <div className="sourceRow">
                  <span>{card.source}</span>
                  {card.url ? <a href={card.url} target="_blank" rel="noreferrer">Open</a> : null}
                </div>
                <div className="actionGrid">
                  <button className={isSaved ? 'secondary active' : 'secondary'} onClick={() => markSaved(card.id)}>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <button className={isRead ? 'secondary active' : 'secondary'} onClick={() => markRead(card.id)}>
                    {isRead ? 'Read' : 'Mark read'}
                  </button>
                  <button className="secondary" onClick={() => dismissCard(card.id)}>Dismiss</button>
                </div>
              </article>
            );
          })
        ) : (
          <section className="card emptyCard">
            <p className="eyebrow">feed cleared</p>
            <h2>No more good things queued.</h2>
            <p className="sub">That’s a good problem. Drop another link into the inbox.</p>
          </section>
        )}
      </section>
    </main>
  );
}
