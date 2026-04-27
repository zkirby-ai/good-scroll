'use client';

import { KeyboardEvent, useMemo, useState } from 'react';

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

type RankedArticleCard = ArticleCard & {
  score: number;
  reasons: string[];
};

type ViewMode = 'feed' | 'queue' | 'focus';
type FeedFilter = 'all' | 'unread' | 'saved';

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

const categoryWeights: Record<ArticleCard['category'], number> = {
  Paper: 20,
  Bio: 18,
  Essay: 15,
  Policy: 14,
  Ideas: 10
};

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

function titleFromUrl(input: string) {
  try {
    const parsed = new URL(input);
    const raw = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname.replace(/^www\./, '');
    return raw
      .replace(/[-_]+/g, ' ')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .slice(0, 80);
  } catch {
    return '';
  }
}

function parseQuickAddInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (urlMatch) {
    const parsedUrl = urlMatch[0].replace(/[),.;]+$/, '');
    const titleOnly = trimmed.replace(urlMatch[0], '').replace(/[—–|-]+/g, ' ').trim();
    return {
      title: titleOnly || titleFromUrl(parsedUrl) || 'Untitled link',
      url: parsedUrl,
      source: sourceLabelFromUrl(parsedUrl),
      category: inferCategory({ title: titleOnly || parsedUrl }),
      summary: 'Quick-added from the capture field so good stuff gets into the feed with almost no friction.'
    };
  }

  return {
    title: trimmed,
    url: '',
    source: 'Quick capture',
    category: inferCategory({ title: trimmed }),
    summary: 'Quick-added manually to your private feed.'
  };
}

function scoreCard(card: ArticleCard, feedState: FeedState): RankedArticleCard {
  const reasons: string[] = [];
  let score = 0;

  if (!feedState.read.includes(card.id)) {
    score += 35;
    reasons.push('Unread');
  }

  if (feedState.saved.includes(card.id)) {
    score += 28;
    reasons.push('You saved it');
  }

  score += categoryWeights[card.category];
  reasons.push(`${card.category} signal`);

  if (card.readMinutes <= 12) {
    score += 12;
    reasons.push('Quick win');
  } else if (card.readMinutes <= 20) {
    score += 6;
    reasons.push('Worth a session');
  }

  if (card.createdAt) {
    const ageHours = (Date.now() - new Date(card.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 36) {
      score += 10;
      reasons.push('Fresh');
    } else if (ageHours <= 168) {
      score += 4;
    }
  }

  const source = card.source.toLowerCase();
  if (/(paper|review|journal|essay|longform|substack|research)/.test(source)) {
    score += 8;
    reasons.push('High-signal source');
  }

  if (feedState.read.includes(card.id)) {
    score -= 26;
  }

  return {
    ...card,
    score,
    reasons: reasons.slice(0, 3)
  };
}

export default function HomePage() {
  const [feedState, setFeedState] = useState<FeedState>(() => loadState());
  const [quickCapture, setQuickCapture] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<ArticleCard['category']>('Ideas');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedStatus, setFeedStatus] = useState<string>('');
  const [isImportingFeed, setIsImportingFeed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  function persist(next: FeedState) {
    setFeedState(next);
    window.localStorage.setItem('good-scroll-state', JSON.stringify(next));
  }

  const cards = useMemo(() => [...feedState.inbox, ...seedCards], [feedState.inbox]);
  const visibleCards = useMemo(
    () => cards.filter((card) => !feedState.dismissed.includes(card.id)),
    [cards, feedState.dismissed]
  );
  const rankedCards = useMemo(
    () => visibleCards
      .map((card) => scoreCard(card, feedState))
      .sort((a, b) => b.score - a.score),
    [visibleCards, feedState]
  );
  const unreadCards = useMemo(
    () => rankedCards.filter((card) => !feedState.read.includes(card.id)),
    [rankedCards, feedState.read]
  );
  const savedCards = useMemo(
    () => feedState.saved
      .map((id) => rankedCards.find((card) => card.id === id))
      .filter((card): card is RankedArticleCard => Boolean(card))
      .sort((a, b) => b.score - a.score),
    [feedState.saved, rankedCards]
  );
  const filteredFeedCards = useMemo(() => {
    if (feedFilter === 'saved') return savedCards;
    if (feedFilter === 'unread') return unreadCards;
    return rankedCards;
  }, [feedFilter, savedCards, unreadCards, rankedCards]);
  const unreadSavedCards = useMemo(
    () => savedCards.filter((card) => !feedState.read.includes(card.id)),
    [savedCards, feedState.read]
  );
  const focusedCard = unreadSavedCards[0] ?? savedCards[0] ?? null;
  const topCard = rankedCards[0] ?? null;

  const savedCount = feedState.saved.length;
  const readCount = feedState.read.length;
  const unreadCount = unreadCards.length;

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
      dismissed: feedState.dismissed.includes(id) ? feedState.dismissed : [...feedState.dismissed, id],
      saved: feedState.saved.filter((savedId) => savedId !== id)
    };
    persist(next);
  }

  function addLink(overrides?: Partial<ArticleCard>) {
    const nextTitle = overrides?.title ?? title.trim();
    const nextUrl = overrides?.url ?? url.trim();
    const nextCategory = overrides?.category ?? category;

    if (!nextTitle) return;

    const nextCard: ArticleCard = {
      id: `inbox-${Date.now()}`,
      category: nextCategory,
      title: nextTitle,
      source: overrides?.source ?? (nextUrl || 'Manual inbox'),
      summary: overrides?.summary ?? 'Saved manually to your private good-scroll feed.',
      readMinutes: overrides?.readMinutes ?? 8,
      url: nextUrl || undefined,
      createdAt: new Date().toISOString()
    };

    persist({
      ...feedState,
      inbox: [nextCard, ...feedState.inbox]
    });

    setQuickCapture('');
    setTitle('');
    setUrl('');
    setCategory('Ideas');
  }

  function submitQuickCapture() {
    const parsed = parseQuickAddInput(quickCapture);
    if (!parsed) return;
    addLink(parsed);
  }

  function onQuickCaptureKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitQuickCapture();
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

  function renderArticleCard(card: RankedArticleCard) {
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
        <div className="cardReasonRow">
          <span className="rankChip">Score {card.score}</span>
          <span className="reasonText">{card.reasons.join(' • ')}</span>
        </div>
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
  }

  return (
    <main className="shell">
      <section className="hero card">
        <p className="eyebrow">good scroll</p>
        <h1>Your private anti-sludge feed.</h1>
        <p className="sub">Actually scrollable now — but only with things that are worth your attention.</p>
      </section>

      <section className="statsGrid statsGridTriple">
        <article className="card statCard">
          <span>Unread</span>
          <strong>{unreadCount}</strong>
        </article>
        <article className="card statCard">
          <span>Saved</span>
          <strong>{savedCount}</strong>
        </article>
        <article className="card statCard">
          <span>Read</span>
          <strong>{readCount}</strong>
        </article>
      </section>

      {topCard ? (
        <section className="card bestNowCard">
          <div>
            <p className="eyebrow">best now</p>
            <h2>{topCard.title}</h2>
            <p className="sub">{topCard.reasons.join(' • ')}</p>
          </div>
          <div className="bestNowActions">
            {topCard.url ? <a className="primaryLink" href={topCard.url} target="_blank" rel="noreferrer">Open top pick</a> : null}
            <button className={feedState.saved.includes(topCard.id) ? 'secondary active' : 'secondary'} onClick={() => markSaved(topCard.id)}>
              {feedState.saved.includes(topCard.id) ? 'Saved already' : 'Save top pick'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="card focusSummaryCard">
        <div>
          <p className="eyebrow">focused reading</p>
          <h2>Turn saved links into an actual queue.</h2>
          <p className="sub">
            {unreadSavedCards.length
              ? `${unreadSavedCards.length} unread saved ${unreadSavedCards.length === 1 ? 'item is' : 'items are'} ready for focused reading.`
              : savedCards.length
                ? 'Your saved queue is fully read. Keep it around for reference or add something new.'
                : 'Save a few strong links, then use focus mode instead of drifting back to sludge.'}
          </p>
        </div>
        <div className="viewToggle" role="tablist" aria-label="Reading views">
          <button className={viewMode === 'feed' ? 'toggleButton active' : 'toggleButton'} onClick={() => setViewMode('feed')}>Feed</button>
          <button className={viewMode === 'queue' ? 'toggleButton active' : 'toggleButton'} onClick={() => setViewMode('queue')}>Queue</button>
          <button className={viewMode === 'focus' ? 'toggleButton active' : 'toggleButton'} onClick={() => setViewMode('focus')}>Focus</button>
        </div>
      </section>

      <section className="card inboxCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">saved-link inbox</p>
            <h2>Drop something good in</h2>
            <p className="sub">Quick capture first, full edit only when you actually need it.</p>
          </div>
        </div>

        <div className="quickCaptureRow">
          <input
            value={quickCapture}
            onChange={(e) => setQuickCapture(e.target.value)}
            onKeyDown={onQuickCaptureKeyDown}
            placeholder="Paste a URL or write title + URL"
            inputMode="url"
          />
          <button className="primary" onClick={submitQuickCapture}>Quick add</button>
        </div>

        <p className="helperText helperTight">Paste a raw link and Good Scroll will infer a title, source, and likely category for you.</p>

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
          <button className="primary" onClick={() => addLink()}>Add with details</button>
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

      {viewMode === 'focus' ? (
        <section className="focusLayout">
          {focusedCard ? (
            <article className="card focusCard">
              <div className="cardTop">
                <span className="pill">{focusedCard.category}</span>
                <span className="metaChip">{focusedCard.readMinutes} min</span>
              </div>
              <p className="eyebrow">up next</p>
              <h2>{focusedCard.title}</h2>
              <p className="summary">{focusedCard.summary}</p>
              <div className="cardReasonRow">
                <span className="rankChip">Score {focusedCard.score}</span>
                <span className="reasonText">{focusedCard.reasons.join(' • ')}</span>
              </div>
              <div className="focusMeta">
                <span>{focusedCard.source}</span>
                <span>{feedState.read.includes(focusedCard.id) ? 'Already read' : 'Unread and queued'}</span>
              </div>
              <div className="focusActions">
                {focusedCard.url ? (
                  <a className="primaryLink" href={focusedCard.url} target="_blank" rel="noreferrer">Open article</a>
                ) : null}
                <button className={feedState.read.includes(focusedCard.id) ? 'secondary active' : 'secondary'} onClick={() => markRead(focusedCard.id)}>
                  {feedState.read.includes(focusedCard.id) ? 'Read' : 'Mark read'}
                </button>
                <button className="secondary" onClick={() => dismissCard(focusedCard.id)}>Remove from queue</button>
              </div>
            </article>
          ) : (
            <section className="card emptyCard">
              <p className="eyebrow">focus mode</p>
              <h2>No saved items queued yet.</h2>
              <p className="sub">Save a few links from the feed, then come back here for a calmer one-at-a-time reading pass.</p>
            </section>
          )}
        </section>
      ) : null}

      {viewMode === 'queue' ? (
        <section className="feed">
          {savedCards.length ? savedCards.map((card) => renderArticleCard(card)) : (
            <section className="card emptyCard">
              <p className="eyebrow">saved queue</p>
              <h2>Nothing saved yet.</h2>
              <p className="sub">Tap save on anything genuinely worth returning to. That becomes the calm reading queue.</p>
            </section>
          )}
        </section>
      ) : null}

      {viewMode === 'feed' ? (
        <section className="feedSection">
          <div className="feedSectionHeader">
            <div>
              <p className="eyebrow">feed filters</p>
              <h2>Skim by intent, not just by whatever is next.</h2>
              <p className="sub">The feed now auto-ranks for signal, freshness, and likely usefulness so the best stuff rises first.</p>
            </div>
            <div className="viewToggle compact" role="tablist" aria-label="Feed filters">
              <button className={feedFilter === 'all' ? 'toggleButton active' : 'toggleButton'} onClick={() => setFeedFilter('all')}>
                All <span>{rankedCards.length}</span>
              </button>
              <button className={feedFilter === 'unread' ? 'toggleButton active' : 'toggleButton'} onClick={() => setFeedFilter('unread')}>
                Unread <span>{unreadCount}</span>
              </button>
              <button className={feedFilter === 'saved' ? 'toggleButton active' : 'toggleButton'} onClick={() => setFeedFilter('saved')}>
                Saved <span>{savedCount}</span>
              </button>
            </div>
          </div>

          <section className="feed">
            {filteredFeedCards.length ? (
              filteredFeedCards.map((card) => renderArticleCard(card))
            ) : (
              <section className="card emptyCard">
                <p className="eyebrow">{feedFilter === 'saved' ? 'saved queue' : feedFilter === 'unread' ? 'unread cleared' : 'feed cleared'}</p>
                <h2>
                  {feedFilter === 'saved'
                    ? 'Nothing saved yet.'
                    : feedFilter === 'unread'
                      ? 'No unread items left in the feed.'
                      : 'No more good things queued.'}
                </h2>
                <p className="sub">
                  {feedFilter === 'saved'
                    ? 'Save anything genuinely worth returning to and it will stay easy to find.'
                    : feedFilter === 'unread'
                      ? 'That’s the dream. Import a feed or drop in another good link.'
                      : 'That’s a good problem. Drop another link into the inbox.'}
                </p>
              </section>
            )}
          </section>
        </section>
      ) : null}
    </main>
  );
}
