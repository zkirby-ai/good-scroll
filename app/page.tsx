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

type ImportQueueItem = ArticleCard & {
  importedFrom: string;
};

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

type RankedArticleCard = ArticleCard & {
  score: number;
  reasons: string[];
};

type ViewMode = 'feed' | 'digest' | 'queue' | 'focus';
type FeedFilter = 'all' | 'unread' | 'saved';

type SourceStats = {
  name: string;
  total: number;
  unread: number;
  saved: number;
  isFavorite: boolean;
  isMuted: boolean;
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

const categoryWeights: Record<ArticleCard['category'], number> = {
  Paper: 20,
  Bio: 18,
  Essay: 15,
  Policy: 14,
  Ideas: 10
};

function emptyState(): FeedState {
  return { saved: [], dismissed: [], read: [], inbox: [], rssFeeds: [], favoriteSources: [], mutedSources: [], importQueue: [] };
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
    return raw.replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '').replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 80);
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

  if (feedState.favoriteSources.includes(card.source)) {
    score += 18;
    reasons.push('Favored source');
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

  if (feedState.read.includes(card.id)) score -= 26;

  return { ...card, score, reasons: reasons.slice(0, 3) };
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
  const sourceStats = useMemo<SourceStats[]>(() => {
    const bucket = new Map<string, SourceStats>();

    cards.forEach((card) => {
      const current = bucket.get(card.source) ?? {
        name: card.source,
        total: 0,
        unread: 0,
        saved: 0,
        isFavorite: feedState.favoriteSources.includes(card.source),
        isMuted: feedState.mutedSources.includes(card.source)
      };

      current.total += 1;
      if (!feedState.read.includes(card.id)) current.unread += 1;
      if (feedState.saved.includes(card.id)) current.saved += 1;
      current.isFavorite = feedState.favoriteSources.includes(card.source);
      current.isMuted = feedState.mutedSources.includes(card.source);
      bucket.set(card.source, current);
    });

    return [...bucket.values()].sort((a, b) => {
      if (a.isMuted !== b.isMuted) return Number(a.isMuted) - Number(b.isMuted);
      if (a.unread !== b.unread) return b.unread - a.unread;
      return a.name.localeCompare(b.name);
    });
  }, [cards, feedState.favoriteSources, feedState.mutedSources, feedState.read, feedState.saved]);

  const visibleCards = useMemo(
    () => cards.filter((card) => !feedState.dismissed.includes(card.id) && !feedState.mutedSources.includes(card.source)),
    [cards, feedState.dismissed, feedState.mutedSources]
  );
  const rankedCards = useMemo(() => visibleCards.map((card) => scoreCard(card, feedState)).sort((a, b) => b.score - a.score), [visibleCards, feedState]);
  const unreadCards = useMemo(() => rankedCards.filter((card) => !feedState.read.includes(card.id)), [rankedCards, feedState.read]);
  const savedCards = useMemo(
    () => feedState.saved.map((id) => rankedCards.find((card) => card.id === id)).filter((card): card is RankedArticleCard => Boolean(card)).sort((a, b) => b.score - a.score),
    [feedState.saved, rankedCards]
  );
  const filteredFeedCards = useMemo(() => {
    if (feedFilter === 'saved') return savedCards;
    if (feedFilter === 'unread') return unreadCards;
    return rankedCards;
  }, [feedFilter, rankedCards, savedCards, unreadCards]);
  const unreadSavedCards = useMemo(() => savedCards.filter((card) => !feedState.read.includes(card.id)), [savedCards, feedState.read]);
  const dailyDigestCards = useMemo(() => {
    const picked = new Set<string>();
    const digest: RankedArticleCard[] = [];

    const quickWin = unreadCards.find((card) => card.readMinutes <= 10);
    if (quickWin) {
      digest.push(quickWin);
      picked.add(quickWin.id);
    }

    const deeperRead = unreadCards.find((card) => !picked.has(card.id) && card.readMinutes > 10);
    if (deeperRead) {
      digest.push(deeperRead);
      picked.add(deeperRead.id);
    }

    const serendipityCard = unreadCards.find((card) => !picked.has(card.id) && card.category === 'Ideas');
    if (serendipityCard) {
      digest.push(serendipityCard);
      picked.add(serendipityCard.id);
    }

    unreadCards.forEach((card) => {
      if (digest.length >= 4 || picked.has(card.id)) return;
      digest.push(card);
      picked.add(card.id);
    });

    return digest;
  }, [unreadCards]);

  const digestMinutes = useMemo(() => dailyDigestCards.reduce((total, card) => total + card.readMinutes, 0), [dailyDigestCards]);
  const digestLead = dailyDigestCards[0] ?? null;
  const focusedCard = unreadSavedCards[0] ?? savedCards[0] ?? null;
  const topCard = rankedCards[0] ?? null;
  const savedCount = feedState.saved.length;
  const readCount = feedState.read.length;
  const unreadCount = unreadCards.length;
  const importQueueCount = feedState.importQueue.length;

  function markSaved(id: string) {
    persist({ ...feedState, saved: feedState.saved.includes(id) ? feedState.saved : [...feedState.saved, id] });
  }

  function markRead(id: string) {
    persist({ ...feedState, read: feedState.read.includes(id) ? feedState.read : [...feedState.read, id] });
  }

  function dismissCard(id: string) {
    persist({
      ...feedState,
      dismissed: feedState.dismissed.includes(id) ? feedState.dismissed : [...feedState.dismissed, id],
      saved: feedState.saved.filter((savedId) => savedId !== id)
    });
  }

  function toggleFavoriteSource(source: string) {
    const isFavorite = feedState.favoriteSources.includes(source);
    persist({
      ...feedState,
      favoriteSources: isFavorite ? feedState.favoriteSources.filter((item) => item !== source) : [...feedState.favoriteSources, source],
      mutedSources: feedState.mutedSources.filter((item) => item !== source)
    });
  }

  function toggleMutedSource(source: string) {
    const isMuted = feedState.mutedSources.includes(source);
    persist({
      ...feedState,
      mutedSources: isMuted ? feedState.mutedSources.filter((item) => item !== source) : [...feedState.mutedSources, source],
      favoriteSources: feedState.favoriteSources.filter((item) => item !== source)
    });
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

    persist({ ...feedState, inbox: [nextCard, ...feedState.inbox] });
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

  function acceptImport(itemId: string, options?: { save?: boolean }) {
    const item = feedState.importQueue.find((entry) => entry.id === itemId);
    if (!item) return;

    persist({
      ...feedState,
      inbox: [item, ...feedState.inbox],
      importQueue: feedState.importQueue.filter((entry) => entry.id !== itemId),
      saved: options?.save && !feedState.saved.includes(item.id) ? [item.id, ...feedState.saved] : feedState.saved
    });
  }

  function dismissImport(itemId: string) {
    persist({ ...feedState, importQueue: feedState.importQueue.filter((entry) => entry.id !== itemId) });
  }

  function acceptAllImports() {
    if (!feedState.importQueue.length) return;
    persist({
      ...feedState,
      inbox: [...feedState.importQueue, ...feedState.inbox],
      importQueue: []
    });
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

      const source = sourceLabelFromUrl(trimmed);
      const knownUrls = new Set([
        ...feedState.inbox.map((card) => card.url).filter(Boolean),
        ...feedState.importQueue.map((card) => card.url).filter(Boolean)
      ]);

      const staged = payload.items
        .map((item, index) => ({
          id: `rss-${slugify(item.link || item.title)}-${Date.now()}-${index}`,
          category: inferCategory(item),
          title: item.title,
          source,
          summary: item.contentSnippet || 'Imported from RSS for your reading queue.',
          readMinutes: 8,
          url: item.link,
          createdAt: item.pubDate || new Date().toISOString(),
          importedFrom: source
        }))
        .filter((card) => !card.url || !knownUrls.has(card.url));

      persist({
        ...feedState,
        importQueue: [...staged, ...feedState.importQueue],
        rssFeeds: feedState.rssFeeds.includes(trimmed) ? feedState.rssFeeds : [trimmed, ...feedState.rssFeeds]
      });

      setFeedStatus(staged.length ? `Staged ${staged.length} items from ${source}. Review the queue, then admit the keepers.` : 'That feed imported, but everything was already in your queue.');
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
    const isFavoriteSource = feedState.favoriteSources.includes(card.source);
    const isMutedSource = feedState.mutedSources.includes(card.source);

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
        <div className="sourceActionRow">
          <button className={isFavoriteSource ? 'secondary active' : 'secondary'} onClick={() => toggleFavoriteSource(card.source)}>
            {isFavoriteSource ? 'Favored source' : 'Favor source'}
          </button>
          <button className={isMutedSource ? 'secondary active' : 'secondary'} onClick={() => toggleMutedSource(card.source)}>
            {isMutedSource ? 'Unmute source' : 'Mute source'}
          </button>
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

      <section className="statsGrid statsGridQuad">
        <article className="card statCard"><span>Unread</span><strong>{unreadCount}</strong></article>
        <article className="card statCard"><span>Saved</span><strong>{savedCount}</strong></article>
        <article className="card statCard"><span>Read</span><strong>{readCount}</strong></article>
        <article className="card statCard"><span>Import queue</span><strong>{importQueueCount}</strong></article>
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

      <section className="card sourceBoardCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">source curation</p>
            <h2>Teach the feed what keeps earning attention.</h2>
            <p className="sub">Favor sources that consistently hit. Mute the ones that start feeling like sludge, even if they technically fit the category.</p>
          </div>
        </div>
        {sourceStats.length ? (
          <div className="sourceBoardList">
            {sourceStats.map((source) => (
              <article className="sourceBoardItem" key={source.name}>
                <div>
                  <h3>{source.name}</h3>
                  <p>{source.unread} unread • {source.saved} saved • {source.total} total</p>
                </div>
                <div className="sourceBoardActions">
                  <button className={source.isFavorite ? 'secondary active' : 'secondary'} onClick={() => toggleFavoriteSource(source.name)}>
                    {source.isFavorite ? 'Favored' : 'Favor'}
                  </button>
                  <button className={source.isMuted ? 'secondary active' : 'secondary'} onClick={() => toggleMutedSource(source.name)}>
                    {source.isMuted ? 'Muted' : 'Mute'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="helperText">Add or import a few links and source controls will show up here.</p>}
      </section>

      <section className="card focusSummaryCard">
        <div>
          <p className="eyebrow">focused reading</p>
          <h2>Turn saved links into an actual queue.</h2>
          <p className="sub">{unreadSavedCards.length ? `${unreadSavedCards.length} unread saved ${unreadSavedCards.length === 1 ? 'item is' : 'items are'} ready for focused reading.` : savedCards.length ? 'Your saved queue is fully read. Keep it around for reference or add something new.' : 'Save a few strong links, then use focus mode instead of drifting back to sludge.'}</p>
        </div>
        <div className="viewToggle" role="tablist" aria-label="Reading views">
          <button className={viewMode === 'feed' ? 'toggleButton active' : 'toggleButton'} onClick={() => setViewMode('feed')}>Feed</button>
          <button className={viewMode === 'digest' ? 'toggleButton active' : 'toggleButton'} onClick={() => setViewMode('digest')}>Digest</button>
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
          <input value={quickCapture} onChange={(e) => setQuickCapture(e.target.value)} onKeyDown={onQuickCaptureKeyDown} placeholder="Paste a URL or write title + URL" inputMode="url" />
          <button className="primary" onClick={submitQuickCapture}>Quick add</button>
        </div>
        <p className="helperText helperTight">Paste a raw link and Good Scroll will infer a title, source, and likely category for you.</p>
        <div className="inboxForm">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" />
          <select value={category} onChange={(e) => setCategory(e.target.value as ArticleCard['category'])}>
            <option>Ideas</option><option>Bio</option><option>Policy</option><option>Paper</option><option>Essay</option>
          </select>
          <button className="primary" onClick={() => addLink()}>Add with details</button>
        </div>
      </section>

      <section className="card inboxCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">rss import</p>
            <h2>Stage feeds before they touch the main feed.</h2>
            <p className="sub">RSS is now the first path after manual saves — but imported items land in a review queue first so the feed stays intentional.</p>
          </div>
        </div>
        <div className="inboxForm">
          <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://example.com/feed.xml" inputMode="url" />
          <button className="primary" onClick={importFeed} disabled={isImportingFeed}>{isImportingFeed ? 'Importing...' : 'Import feed'}</button>
        </div>
        {feedStatus ? <p className="helperText">{feedStatus}</p> : null}
        {feedState.rssFeeds.length ? (
          <div className="feedList">
            <p className="eyebrow">recent feed sources</p>
            <ul>{feedState.rssFeeds.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ) : null}
      </section>

      <section className="card sourceBoardCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">import queue</p>
            <h2>Review imported items before admitting them.</h2>
            <p className="sub">This keeps RSS useful without turning the main feed into another firehose.</p>
          </div>
          {importQueueCount ? <button className="primaryLink" onClick={acceptAllImports}>Admit all {importQueueCount}</button> : null}
        </div>
        {feedState.importQueue.length ? (
          <div className="feed">
            {feedState.importQueue.map((item) => (
              <article className="card articleCard" key={item.id}>
                <div className="cardTop">
                  <span className="pill">{item.category}</span>
                  <span className="metaChip">{item.readMinutes} min</span>
                </div>
                <h2>{item.title}</h2>
                <p className="summary">{item.summary}</p>
                <div className="cardReasonRow">
                  <span className="rankChip">Staged</span>
                  <span className="reasonText">Imported from {item.importedFrom} • waiting for triage</span>
                </div>
                <div className="sourceRow">
                  <span>{item.source}</span>
                  {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Preview</a> : null}
                </div>
                <div className="actionGrid">
                  <button className="secondary active" onClick={() => acceptImport(item.id)}>Admit to feed</button>
                  <button className="secondary" onClick={() => acceptImport(item.id, { save: true })}>Save later</button>
                  <button className="secondary" onClick={() => dismissImport(item.id)}>Skip</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="helperText">No staged imports right now. Pull a feed, skim the candidates, then only admit the keepers.</p>}
      </section>

      {viewMode === 'digest' ? (
        <section className="feed digestSection">
          <section className="card digestHero">
            <div>
              <p className="eyebrow">daily digest</p>
              <h2>A calmer handful for right now.</h2>
              <p className="sub">{dailyDigestCards.length ? `${dailyDigestCards.length} hand-picked unread ${dailyDigestCards.length === 1 ? 'item' : 'items'} for about ${digestMinutes} min of better internet.` : 'Nothing unread is waiting right now. Import a feed or drop in another good link.'}</p>
            </div>
            {digestLead ? <div className="digestHeroMeta"><span className="rankChip">Lead pick</span><span className="reasonText">{digestLead.reasons.join(' • ')}</span></div> : null}
          </section>
          {dailyDigestCards.length ? dailyDigestCards.map((card, index) => {
            const label = index === 0 ? 'Lead pick' : card.readMinutes <= 10 ? 'Quick win' : card.category === 'Ideas' ? 'Serendipity slot' : 'Worth the session';
            return (
              <article className="card articleCard digestCard" key={card.id}>
                <div className="digestCardHeader"><span className="digestLabel">{label}</span><span className="metaChip">{card.readMinutes} min</span></div>
                <h2>{card.title}</h2>
                <p className="summary">{card.summary}</p>
                <div className="cardReasonRow"><span className="pill">{card.category}</span><span className="reasonText">{card.reasons.join(' • ')}</span></div>
                <div className="sourceRow"><span>{card.source}</span>{card.url ? <a href={card.url} target="_blank" rel="noreferrer">Open</a> : null}</div>
                <div className="actionGrid">
                  <button className={feedState.saved.includes(card.id) ? 'secondary active' : 'secondary'} onClick={() => markSaved(card.id)}>{feedState.saved.includes(card.id) ? 'Saved' : 'Save'}</button>
                  <button className={feedState.read.includes(card.id) ? 'secondary active' : 'secondary'} onClick={() => markRead(card.id)}>{feedState.read.includes(card.id) ? 'Read' : 'Mark read'}</button>
                  <button className="secondary" onClick={() => dismissCard(card.id)}>Dismiss</button>
                </div>
              </article>
            );
          }) : <section className="card emptyCard"><p className="eyebrow">digest clear</p><h2>No unread picks right now.</h2><p className="sub">You either cleared the queue or haven’t fed it yet. Both are fixable.</p></section>}
        </section>
      ) : null}

      {viewMode === 'focus' ? (
        <section className="focusLayout">
          {focusedCard ? (
            <article className="card focusCard">
              <div className="cardTop"><span className="pill">{focusedCard.category}</span><span className="metaChip">{focusedCard.readMinutes} min</span></div>
              <p className="eyebrow">up next</p>
              <h2>{focusedCard.title}</h2>
              <p className="summary">{focusedCard.summary}</p>
              <div className="cardReasonRow"><span className="rankChip">Score {focusedCard.score}</span><span className="reasonText">{focusedCard.reasons.join(' • ')}</span></div>
              <div className="focusMeta"><span>{focusedCard.source}</span><span>{feedState.read.includes(focusedCard.id) ? 'Already read' : 'Unread and queued'}</span></div>
              <div className="focusActions">
                {focusedCard.url ? <a className="primaryLink" href={focusedCard.url} target="_blank" rel="noreferrer">Open article</a> : null}
                <button className={feedState.read.includes(focusedCard.id) ? 'secondary active' : 'secondary'} onClick={() => markRead(focusedCard.id)}>{feedState.read.includes(focusedCard.id) ? 'Read' : 'Mark read'}</button>
                <button className="secondary" onClick={() => dismissCard(focusedCard.id)}>Remove from queue</button>
              </div>
            </article>
          ) : <section className="card emptyCard"><p className="eyebrow">focus mode</p><h2>No saved items queued yet.</h2><p className="sub">Save a few links from the feed, then come back here for a calmer one-at-a-time reading pass.</p></section>}
        </section>
      ) : null}

      {viewMode === 'queue' ? (
        <section className="feed">
          {savedCards.length ? savedCards.map((card) => renderArticleCard(card)) : <section className="card emptyCard"><p className="eyebrow">saved queue</p><h2>Nothing saved yet.</h2><p className="sub">Tap save on anything genuinely worth returning to. That becomes the calm reading queue.</p></section>}
        </section>
      ) : null}

      {viewMode === 'feed' ? (
        <section className="feedSection">
          <div className="feedSectionHeader">
            <div>
              <p className="eyebrow">feed filters</p>
              <h2>Skim by intent, not just by whatever is next.</h2>
              <p className="sub">The feed now auto-ranks for signal, freshness, source preference, and likely usefulness so the best stuff rises first.</p>
            </div>
            <div className="viewToggle compact" role="tablist" aria-label="Feed filters">
              <button className={feedFilter === 'all' ? 'toggleButton active' : 'toggleButton'} onClick={() => setFeedFilter('all')}>All <span>{rankedCards.length}</span></button>
              <button className={feedFilter === 'unread' ? 'toggleButton active' : 'toggleButton'} onClick={() => setFeedFilter('unread')}>Unread <span>{unreadCount}</span></button>
              <button className={feedFilter === 'saved' ? 'toggleButton active' : 'toggleButton'} onClick={() => setFeedFilter('saved')}>Saved <span>{savedCount}</span></button>
            </div>
          </div>
          <section className="feed">
            {filteredFeedCards.length ? filteredFeedCards.map((card) => renderArticleCard(card)) : (
              <section className="card emptyCard">
                <p className="eyebrow">{feedFilter === 'saved' ? 'saved queue' : feedFilter === 'unread' ? 'unread cleared' : 'feed cleared'}</p>
                <h2>{feedFilter === 'saved' ? 'Nothing saved yet.' : feedFilter === 'unread' ? 'No unread items left in the feed.' : 'No more good things queued.'}</h2>
                <p className="sub">{feedFilter === 'saved' ? 'Save anything genuinely worth returning to and it will stay easy to find.' : feedFilter === 'unread' ? 'That’s the dream. Import a feed or drop in another good link.' : 'That’s a good problem. Drop another link into the inbox.'}</p>
              </section>
            )}
          </section>
        </section>
      ) : null}
    </main>
  );
}
