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
  rssFeeds: string[];
};

type RssImportItem = {
  title: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
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

function emptyState(): FeedState {
  return { saved: [], dismissed: [], read: [], inbox: [], rssFeeds: [] };
}

function loadState(): FeedState {
  if (typeof window === 'undefined') {
    return emptyState();
  }
  try {
    const raw = window.localStorage.getItem('good-scroll-state');
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<FeedState>;
    return {
      saved: parsed.saved ?? [],
      dismissed: parsed.dismissed ?? [],
      read: parsed.read ?? [],
      inbox: parsed.inbox ?? [],
      rssFeeds: parsed.rssFeeds ?? []
    };
  } catch {
    return emptyState();
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function inferCategory(item: RssImportItem): ArticleCard['category'] {
  const haystack = `${item.title} ${item.contentSnippet ?? ''}`.toLowerCase();
  if (/(study|trial|pubmed|biology|protein|health|sleep|metabolism|nutrition)/.test(haystack)) return 'Bio';
  if (/(policy|state|election|governance|institution|law|regulation)/.test(haystack)) return 'Policy';
  if (/(paper|journal|arxiv|preprint|doi|research)/.test(haystack)) return 'Paper';
  if (/(essay|culture|attention|internet|mindset|society)/.test(haystack)) return 'Essay';
  return 'Ideas';
}

function sourceLabelFromUrl(input: string) {
  try {
    return new URL(input).hostname.replace(/^www\./, '');
  } catch {
    return 'RSS import';
  }
}

export default function HomePage() {
  const [feedState, setFeedState] = useState<FeedState>(() => loadState());
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<ArticleCard['category']>('Ideas');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedStatus, setFeedStatus] = useState<string>('');
  const [isImportingFeed, setIsImportingFeed] = useState(false);

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

  async function importFeed() {
    const trimmed = feedUrl.trim();
    if (!trimmed || isImportingFeed) return;

    setIsImportingFeed(true);
    setFeedStatus('Importing feed...');

    try {
      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ feedUrl: trimmed })
      });

      const payload = (await response.json()) as { items?: RssImportItem[]; error?: string };

      if (!response.ok || !payload.items?.length) {
        setFeedStatus(payload.error || 'Could not import that feed.');
        return;
      }

      const importedCards = payload.items.map((item, index) => ({
        id: `rss-${slugify(item.link || item.title)}-${Date.now()}-${index}`,
        category: inferCategory(item),
        title: item.title,
        source: sourceLabelFromUrl(trimmed),
        summary: item.contentSnippet || 'Imported from RSS for your reading queue.',
        readMinutes: 8,
        url: item.link,
        createdAt: item.pubDate || new Date().toISOString()
      }));

      const existingUrls = new Set(feedState.inbox.map((card) => card.url).filter(Boolean));
      const deduped = importedCards.filter((card) => !card.url || !existingUrls.has(card.url));

      const next = {
        ...feedState,
        inbox: [...deduped, ...feedState.inbox],
        rssFeeds: feedState.rssFeeds.includes(trimmed) ? feedState.rssFeeds : [trimmed, ...feedState.rssFeeds]
      };

      persist(next);
      setFeedStatus(deduped.length ? `Imported ${deduped.length} items from ${sourceLabelFromUrl(trimmed)}.` : 'That feed imported, but everything was already in your queue.');
      setFeedUrl('');
    } catch {
      setFeedStatus('Could not import that feed right now.');
    } finally {
      setIsImportingFeed(false);
    }
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

      <section className="card inboxCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">rss import</p>
            <h2>Pull a feed into the queue</h2>
            <p className="sub">Bring in the latest few items from any RSS or Atom feed, then skim the good stuff here.</p>
          </div>
        </div>
        <div className="inboxForm">
          <input
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            inputMode="url"
          />
          <button className="primary" onClick={importFeed} disabled={isImportingFeed}>
            {isImportingFeed ? 'Importing...' : 'Import feed'}
          </button>
        </div>
        {feedStatus ? <p className="helperText">{feedStatus}</p> : null}
        {feedState.rssFeeds.length ? (
          <div className="feedList">
            <p className="eyebrow">recent feed sources</p>
            <ul>
              {feedState.rssFeeds.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
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
