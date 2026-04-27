import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

type ParsedItem = {
  title: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: true,
  removeNSPrefix: true
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  for (const key of ['#text', '__cdata']) {
    const candidate = record[key];
    if (typeof candidate === 'string') return candidate;
  }

  return '';
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function snippetFromItem(item: Record<string, unknown>) {
  const raw =
    extractText(item.description) ||
    extractText(item.summary) ||
    extractText(item.content) ||
    extractText(item['content:encoded']);

  const clean = stripHtml(raw);
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function parseRss(xml: string): ParsedItem[] {
  const parsed = parser.parse(xml) as Record<string, any>;

  if (parsed.rss?.channel) {
    return toArray(parsed.rss.channel.item).map((item: Record<string, unknown>) => ({
      title: extractText(item.title) || 'Untitled item',
      link: extractText(item.link) || undefined,
      pubDate: extractText(item.pubDate) || undefined,
      contentSnippet: snippetFromItem(item)
    }));
  }

  if (parsed.feed?.entry) {
    return toArray(parsed.feed.entry).map((entry: Record<string, unknown>) => {
      const links = toArray(entry.link as Record<string, unknown> | Record<string, unknown>[]);
      const alternate = links.find((link) => {
        if (!link || typeof link !== 'object') return false;
        const attrs = link as Record<string, unknown>;
        return !attrs.rel || attrs.rel === 'alternate';
      }) as Record<string, unknown> | undefined;

      return {
        title: extractText(entry.title) || 'Untitled item',
        link: typeof alternate?.['@_href'] === 'string' ? alternate['@_href'] : undefined,
        pubDate: extractText(entry.updated) || extractText(entry.published) || undefined,
        contentSnippet: snippetFromItem(entry)
      };
    });
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { feedUrl?: string };
    const feedUrl = body.feedUrl?.trim();

    if (!feedUrl) {
      return NextResponse.json({ error: 'Feed URL is required.' }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(feedUrl);
    } catch {
      return NextResponse.json({ error: 'Feed URL must be valid.' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'Only HTTP(S) feed URLs are supported.' }, { status: 400 });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'user-agent': 'GoodScrollBot/0.1 (+https://github.com/zkirby-ai/good-scroll)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Feed fetch failed (${response.status}).` }, { status: 400 });
    }

    const xml = await response.text();
    const items = parseRss(xml)
      .filter((item) => item.title)
      .slice(0, 8);

    if (!items.length) {
      return NextResponse.json({ error: 'No feed items were found.' }, { status: 400 });
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Could not import that feed right now.' }, { status: 500 });
  }
}
