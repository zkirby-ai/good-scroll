'use client';

import { KeyboardEvent, ReactNode, useEffect, useMemo, useState } from 'react';

type Category = 'Bio' | 'Policy' | 'Paper' | 'Essay' | 'Ideas';

type ArticleCard = {
  id: string;
  category: Category;
  title: string;
  source: string;
  summary: string;
  readMinutes: number;
  url?: string;
  createdAt?: string;
};

type ImportQueueItem = ArticleCard & { importedFrom: string };

type FeedState = {
  saved: string[];
  dismissed: string[];
  read: string[];
  inbox: ArticleCard[];
  rssFeeds: string[];
  favoriteSources: string[];
  mutedSources: string[];
  importQueue: ImportQueueItem[];
};

type RssImportItem = {
  title: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
};

type RankedArticleCard = ArticleCard & { score: number; reasons: string[] };

type Tab = 'read' | 'saved' | 'sources';

const seedCards: ArticleCard[] = [
  {
    id: 'protein-timing',
    category: 'Bio',
    title: 'Why protein timing probably matters less than total intake',
    source: 'Examine review',
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
    summary: 'Worth opening instead of opening X for the 40th time and learning absolutely nothing.',
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

const categoryWeights: Record<Category, number> = {
  Paper: 20,
  Bio: 18,
  Essay: 15,
  Policy: 14,
  Ideas: 10
};

function emptyState(): FeedState {
  return {
    saved: [],
    dismissed: [],
    read: [],
    inbox: [],
    rssFeeds: [],
    favoriteSources: [],
    mutedSources: [],
    importQueue: []
  };
}

function loadState(): FeedState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem('good-scroll-state');
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<FeedState>;
    return {
      saved: parsed.saved ?? [],
      dismissed: parsed.dismissed ?? [],
      read: parsed.read ?? [],
      inbox: parsed.inbox ?? [],
      rssFeeds: parsed.rssFeeds ?? [],
      favoriteSources: parsed.favoriteSources ?? [],
      mutedSources: parsed.mutedSources ?? [],
      importQueue: parsed.importQueue ?? []
    };
  } catch {
    return emptyState();
  }
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

function inferCategory(item: { title: string; contentSnippet?: string }): Category {
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
    return raw.replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
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
      summary: 'Quick-added.'
    };
  }
  return {
    title: trimmed,
    url: '',
    source: 'Quick capture',
    category: inferCategory({ title: trimmed }),
    summary: 'Quick-added.'
  };
}

function scoreCard(card: ArticleCard, s: FeedState): RankedArticleCard {
  const reasons: string[] = [];
  let score = 0;
  if (!s.read.includes(card.id)) { score += 35; reasons.push('Unread'); }
  if (s.saved.includes(card.id)) { score += 28; reasons.push('Saved'); }
  if (s.favoriteSources.includes(card.source)) { score += 18; reasons.push('Favored source'); }
  score += categoryWeights[card.category];
  if (card.readMinutes <= 12) { score += 12; reasons.push('Quick win'); }
  else if (card.readMinutes <= 20) { score += 6; reasons.push('Worth a session'); }
  if (card.createdAt) {
    const ageHours = (Date.now() - new Date(card.createdAt).getTime()) / 36e5;
    if (ageHours <= 36) { score += 10; reasons.push('Fresh'); }
    else if (ageHours <= 168) score += 4;
  }
  if (/(paper|review|journal|essay|longform|substack|research)/.test(card.source.toLowerCase())) {
    score += 8;
  }
  if (s.read.includes(card.id)) score -= 26;
  return { ...card, score, reasons: reasons.slice(0, 3) };
}

/* ---------- Icons ---------- */

const Icon = {
  bookmark: (filled = false) => (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  star: (filled = false) => (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
};

/* ---------- Component ---------- */

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [feedState, setFeedState] = useState<FeedState>(emptyState);
  const [tab, setTab] = useState<Tab>('read');
  const [composeOpen, setComposeOpen] = useState(false);
  const [quickCapture, setQuickCapture] = useState('');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeUrl, setComposeUrl] = useState('');
  const [composeCategory, setComposeCategory] = useState<Category>('Ideas');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedStatus, setFeedStatus] = useState('');
  const [isImportingFeed, setIsImportingFeed] = useState(false);

  useEffect(() => {
    setFeedState(loadState());
    setMounted(true);
  }, []);

  function persist(next: FeedState) {
    setFeedState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('good-scroll-state', JSON.stringify(next));
    }
  }

  const cards = useMemo(() => [...feedState.inbox, ...seedCards], [feedState.inbox]);

  const visibleCards = useMemo(
    () => cards.filter((c) => !feedState.dismissed.includes(c.id) && !feedState.mutedSources.includes(c.source)),
    [cards, feedState.dismissed, feedState.mutedSources]
  );

  const ranked = useMemo(
    () => visibleCards.map((c) => scoreCard(c, feedState)).sort((a, b) => b.score - a.score),
    [visibleCards, feedState]
  );

  const unread = useMemo(() => ranked.filter((c) => !feedState.read.includes(c.id)), [ranked, feedState.read]);
  const savedRanked = useMemo(
    () => feedState.saved
      .map((id) => ranked.find((c) => c.id === id))
      .filter((c): c is RankedArticleCard => Boolean(c)),
    [feedState.saved, ranked]
  );

  const hero = unread[0] ?? ranked[0] ?? null;
  const restOfFeed = useMemo(() => ranked.filter((c) => c.id !== hero?.id), [ranked, hero?.id]);

  const sourceStats = useMemo(() => {
    const bucket = new Map<string, { name: string; total: number; unread: number; saved: number; favorite: boolean; muted: boolean }>();
    cards.forEach((card) => {
      const cur = bucket.get(card.source) ?? {
        name: card.source,
        total: 0,
        unread: 0,
        saved: 0,
        favorite: feedState.favoriteSources.includes(card.source),
        muted: feedState.mutedSources.includes(card.source)
      };
      cur.total += 1;
      if (!feedState.read.includes(card.id)) cur.unread += 1;
      if (feedState.saved.includes(card.id)) cur.saved += 1;
      bucket.set(card.source, cur);
    });
    return [...bucket.values()].sort((a, b) => {
      if (a.muted !== b.muted) return Number(a.muted) - Number(b.muted);
      if (a.unread !== b.unread) return b.unread - a.unread;
      return a.name.localeCompare(b.name);
    });
  }, [cards, feedState.favoriteSources, feedState.mutedSources, feedState.read, feedState.saved]);

  function toggleSaved(id: string) {
    const isSaved = feedState.saved.includes(id);
    persist({
      ...feedState,
      saved: isSaved ? feedState.saved.filter((s) => s !== id) : [id, ...feedState.saved]
    });
  }

  function markRead(id: string) {
    if (feedState.read.includes(id)) return;
    persist({ ...feedState, read: [...feedState.read, id] });
  }

  function dismiss(id: string) {
    persist({
      ...feedState,
      dismissed: feedState.dismissed.includes(id) ? feedState.dismissed : [...feedState.dismissed, id],
      saved: feedState.saved.filter((s) => s !== id)
    });
  }

  function toggleFavoriteSource(source: string) {
    const isFav = feedState.favoriteSources.includes(source);
    persist({
      ...feedState,
      favoriteSources: isFav ? feedState.favoriteSources.filter((s) => s !== source) : [...feedState.favoriteSources, source],
      mutedSources: feedState.mutedSources.filter((s) => s !== source)
    });
  }

  function toggleMutedSource(source: string) {
    const isMuted = feedState.mutedSources.includes(source);
    persist({
      ...feedState,
      mutedSources: isMuted ? feedState.mutedSources.filter((s) => s !== source) : [...feedState.mutedSources, source],
      favoriteSources: feedState.favoriteSources.filter((s) => s !== source)
    });
  }

  function addLink(overrides?: Partial<ArticleCard>) {
    const t = (overrides?.title ?? composeTitle).trim();
    const u = (overrides?.url ?? composeUrl).trim();
    const c = overrides?.category ?? composeCategory;
    if (!t) return;
    const card: ArticleCard = {
      id: `inbox-${Date.now()}`,
      category: c,
      title: t,
      source: overrides?.source ?? (u ? sourceLabelFromUrl(u) : 'Manual inbox'),
      summary: overrides?.summary ?? 'Saved manually.',
      readMinutes: overrides?.readMinutes ?? 8,
      url: u || undefined,
      createdAt: new Date().toISOString()
    };
    persist({ ...feedState, inbox: [card, ...feedState.inbox] });
    setQuickCapture('');
    setComposeTitle('');
    setComposeUrl('');
    setComposeCategory('Ideas');
    setComposeOpen(false);
  }

  function submitQuickCapture() {
    const parsed = parseQuickAddInput(quickCapture);
    if (!parsed) return;
    addLink(parsed);
  }

  function onQuickKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    submitQuickCapture();
  }

  function acceptImport(id: string, opts?: { save?: boolean }) {
    const item = feedState.importQueue.find((x) => x.id === id);
    if (!item) return;
    persist({
      ...feedState,
      inbox: [item, ...feedState.inbox],
      importQueue: feedState.importQueue.filter((x) => x.id !== id),
      saved: opts?.save && !feedState.saved.includes(item.id) ? [item.id, ...feedState.saved] : feedState.saved
    });
  }

  function dismissImport(id: string) {
    persist({ ...feedState, importQueue: feedState.importQueue.filter((x) => x.id !== id) });
  }

  function admitAll() {
    if (!feedState.importQueue.length) return;
    persist({ ...feedState, inbox: [...feedState.importQueue, ...feedState.inbox], importQueue: [] });
  }

  async function importFeed() {
    const trimmed = feedUrl.trim();
    if (!trimmed || isImportingFeed) return;
    setIsImportingFeed(true);
    setFeedStatus('Importing…');
    try {
      const res = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ feedUrl: trimmed })
      });
      const payload = (await res.json()) as { items?: RssImportItem[]; error?: string };
      if (!res.ok || !payload.items?.length) {
        setFeedStatus(payload.error || 'Could not import that feed.');
        return;
      }
      const source = sourceLabelFromUrl(trimmed);
      const known = new Set([
        ...feedState.inbox.map((c) => c.url).filter(Boolean),
        ...feedState.importQueue.map((c) => c.url).filter(Boolean)
      ]);
      const staged = payload.items
        .map((item, i) => ({
          id: `rss-${slugify(item.link || item.title)}-${Date.now()}-${i}`,
          category: inferCategory(item),
          title: item.title,
          source,
          summary: item.contentSnippet || 'Imported from RSS.',
          readMinutes: 8,
          url: item.link,
          createdAt: item.pubDate || new Date().toISOString(),
          importedFrom: source
        }))
        .filter((c) => !c.url || !known.has(c.url));
      persist({
        ...feedState,
        importQueue: [...staged, ...feedState.importQueue],
        rssFeeds: feedState.rssFeeds.includes(trimmed) ? feedState.rssFeeds : [trimmed, ...feedState.rssFeeds]
      });
      setFeedStatus(staged.length ? `Staged ${staged.length} from ${source}.` : 'Already up to date.');
      setFeedUrl('');
    } catch {
      setFeedStatus('Could not import that feed right now.');
    } finally {
      setIsImportingFeed(false);
    }
  }

  function openCard(card: ArticleCard) {
    if (card.url) {
      window.open(card.url, '_blank', 'noopener,noreferrer');
    }
    markRead(card.id);
  }

  /* ---------- Render parts ---------- */

  function renderArticleCard(card: RankedArticleCard, opts?: { showRead?: boolean }) {
    const isSaved = feedState.saved.includes(card.id);
    const isRead = feedState.read.includes(card.id);
    return (
      <article
        className={`articleCard ${opts?.showRead && isRead ? 'read' : ''}`}
        key={card.id}
        onClick={() => openCard(card)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') openCard(card); }}
      >
        <div className="articleHead">
          <span className="cat">{card.category}</span>
          <span>{card.readMinutes} min · {card.reasons[0] ?? ''}</span>
        </div>
        <h3>{card.title}</h3>
        <p className="summary">{card.summary}</p>
        <div className="footRow">
          <span className="source">{card.source}</span>
          <div className="actionBar" onClick={(e) => e.stopPropagation()}>
            <button
              className={`iconBtn ${isSaved ? 'active' : ''}`}
              aria-label={isSaved ? 'Unsave' : 'Save'}
              onClick={() => toggleSaved(card.id)}
            >{Icon.bookmark(isSaved)}</button>
            <button
              className="iconBtn"
              aria-label="Mark read"
              onClick={() => isRead ? null : markRead(card.id)}
              style={isRead ? { color: 'var(--good)' } : undefined}
            >{Icon.check}</button>
            <button className="iconBtn" aria-label="Dismiss" onClick={() => dismiss(card.id)}>{Icon.x}</button>
          </div>
        </div>
      </article>
    );
  }

  const todayStr = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  /* ---------- Tab views ---------- */

  function ReadTab() {
    return (
      <>
        {hero ? (
          <section
            className="heroCard"
            onClick={() => openCard(hero)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') openCard(hero); }}
          >
            <div className="nowRow">
              <span className="nowDot" />
              <span className="eyebrow">Open this first</span>
            </div>
            <h1>{hero.title}</h1>
            <p className="heroSummary">{hero.summary}</p>
            <div className="heroFoot">
              <span className="byline">{hero.source} · {hero.readMinutes} min · {hero.category}</span>
              <span className="heroAction">Read {Icon.arrowRight}</span>
            </div>
          </section>
        ) : (
          <Empty
            title="Nothing in the feed yet."
            body="Drop a link with the + button below, or pull in an RSS feed under Sources."
          />
        )}

        {restOfFeed.length ? (
          <>
            <div className="sectionHead">
              <div>
                <p className="eyebrow">Up next</p>
                <h2>Worth your scroll</h2>
              </div>
              <span className="metaChip">{restOfFeed.length}</span>
            </div>
            <div className="feed">
              {restOfFeed.map((c) => renderArticleCard(c, { showRead: true }))}
            </div>
          </>
        ) : null}
      </>
    );
  }

  function SavedTab() {
    if (!savedRanked.length) {
      return (
        <Empty
          title="No saved reads yet."
          body="Tap the bookmark on anything worth returning to. It’ll wait here, calmly."
        />
      );
    }
    return (
      <>
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Saved queue</p>
            <h2>Read when you’re ready</h2>
          </div>
          <span className="metaChip">{savedRanked.length}</span>
        </div>
        <div className="feed">{savedRanked.map((c) => renderArticleCard(c))}</div>
      </>
    );
  }

  function SourcesTab() {
    return (
      <div className="section">
        {/* RSS */}
        <div className="panel">
          <div className="sectionHead" style={{ margin: 0 }}>
            <div>
              <p className="eyebrow">RSS</p>
              <h2>Pull in feeds</h2>
            </div>
          </div>
          <p className="helper">Imports stage in a review queue first so the main feed stays intentional.</p>
          <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
            <input
              className="input"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              inputMode="url"
            />
            <button className="btn primary" onClick={importFeed} disabled={isImportingFeed}>
              {isImportingFeed ? 'Importing…' : 'Import'}
            </button>
          </div>
          {feedStatus ? <div className="statusLine">{feedStatus}</div> : null}
          {feedState.rssFeeds.length ? (
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Recently added</p>
              <ul className="feedListUL">
                {feedState.rssFeeds.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Import queue */}
        {feedState.importQueue.length ? (
          <div className="panel">
            <div className="sectionHead" style={{ margin: 0 }}>
              <div>
                <p className="eyebrow">Review queue</p>
                <h2>{feedState.importQueue.length} staged</h2>
              </div>
              <button className="btn ghost" onClick={admitAll}>Admit all</button>
            </div>
            {feedState.importQueue.map((item) => (
              <div className="queueRow" key={item.id}>
                <div className="qHead">
                  <span>{item.category} · {item.readMinutes} min</span>
                  <span>{item.importedFrom}</span>
                </div>
                <h4>{item.title}</h4>
                {item.summary ? <p className="helper">{item.summary}</p> : null}
                <div className="qActions">
                  <button className="btn primary" onClick={() => acceptImport(item.id)}>Admit</button>
                  <button className="btn ghost" onClick={() => acceptImport(item.id, { save: true })}>Save</button>
                  <button className="btn ghost" onClick={() => dismissImport(item.id)}>Skip</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Source curation */}
        {sourceStats.length ? (
          <div className="panel">
            <div className="sectionHead" style={{ margin: 0 }}>
              <div>
                <p className="eyebrow">Curation</p>
                <h2>Teach the feed</h2>
              </div>
            </div>
            <p className="helper">Favor sources that consistently land. Mute ones that start to feel like sludge.</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {sourceStats.map((s) => (
                <div className={`sourceRow ${s.muted ? 'muted' : ''}`} key={s.name}>
                  <div className="sm">
                    <strong>{s.name}</strong>
                    <span>{s.unread} unread · {s.saved} saved · {s.total} total</span>
                  </div>
                  <div className="sActions">
                    <button
                      className={`iconBtn ${s.favorite ? 'active' : ''}`}
                      aria-label={s.favorite ? 'Unfavor' : 'Favor'}
                      onClick={() => toggleFavoriteSource(s.name)}
                    >{Icon.star(s.favorite)}</button>
                    <button
                      className={`iconBtn ${s.muted ? 'active' : ''}`}
                      aria-label={s.muted ? 'Unmute' : 'Mute'}
                      onClick={() => toggleMutedSource(s.name)}
                    >{Icon.mute}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  /* ---------- Shell ---------- */

  return (
    <main className="shell">
      <div className="topBar">
        <div className="brand">
          <span className="dot" />
          <span>Good <em>Scroll</em></span>
        </div>
        <div className="topMeta">{todayStr}</div>
      </div>

      {!mounted ? null : (
        <>
          {tab === 'read' && <ReadTab />}
          {tab === 'saved' && <SavedTab />}
          {tab === 'sources' && <SourcesTab />}
        </>
      )}

      <button className="fab" aria-label="Quick add" onClick={() => setComposeOpen(true)}>
        {Icon.plus}
      </button>

      <nav className="tabBar" aria-label="Sections">
        <button className={`tab ${tab === 'read' ? 'active' : ''}`} onClick={() => setTab('read')}>
          Read <span className="count">{unread.length}</span>
        </button>
        <button className={`tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
          Saved <span className="count">{savedRanked.length}</span>
        </button>
        <button className={`tab ${tab === 'sources' ? 'active' : ''}`} onClick={() => setTab('sources')}>
          Sources {feedState.importQueue.length ? <span className="count">{feedState.importQueue.length}</span> : null}
        </button>
      </nav>

      {composeOpen ? (
        <>
          <div className="sheetBackdrop" onClick={() => setComposeOpen(false)} />
          <div className="sheet" role="dialog" aria-label="Quick add">
            <span className="grabber" />
            <h2>Drop in something good</h2>
            <div className="field">
              <label>Paste a URL or title + URL</label>
              <input
                className="input"
                autoFocus
                value={quickCapture}
                onChange={(e) => setQuickCapture(e.target.value)}
                onKeyDown={onQuickKey}
                placeholder="https://… or 'Title — https://…'"
                inputMode="url"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn primary" onClick={submitQuickCapture} disabled={!quickCapture.trim()}>
                Quick add
              </button>
              <button className="btn ghost" onClick={() => setComposeOpen(false)}>Close</button>
            </div>

            <details style={{ marginTop: 4 }}>
              <summary style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Add with details
              </summary>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <div className="field">
                  <label>Title</label>
                  <input className="input" value={composeTitle} onChange={(e) => setComposeTitle(e.target.value)} placeholder="Title" />
                </div>
                <div className="field">
                  <label>URL (optional)</label>
                  <input className="input" value={composeUrl} onChange={(e) => setComposeUrl(e.target.value)} placeholder="https://…" inputMode="url" />
                </div>
                <div className="field">
                  <label>Category</label>
                  <div className="segments">
                    {(['Ideas', 'Bio', 'Policy', 'Paper', 'Essay'] as Category[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={composeCategory === c ? 'active' : ''}
                        onClick={() => setComposeCategory(c)}
                      >{c}</button>
                    ))}
                  </div>
                </div>
                <button className="btn primary" onClick={() => addLink()} disabled={!composeTitle.trim()}>
                  Add to feed
                </button>
              </div>
            </details>
          </div>
        </>
      ) : null}
    </main>
  );
}

function Empty({ title, body }: { title: string; body: ReactNode }) {
  return (
    <section className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
    </section>
  );
}
