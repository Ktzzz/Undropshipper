export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  const key = process.env.SERPAPI_KEY;
  if (!key) return res.status(500).json({ error: 'SERPAPI_KEY missing' });

  try {
    function buildUrl(q, extra = {}) {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_shopping');
      url.searchParams.set('q', q);
      url.searchParams.set('api_key', key);
      url.searchParams.set('num', '12');
      url.searchParams.set('hl', 'en');
      for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
      return url.toString();
    }

    function mapItem(item, isOriginal = false) {
      const rawLink = item.product_link ?? item.link ?? '';
      const link = rawLink.startsWith('http') ? rawLink : `https://www.google.com${rawLink}`;
      return {
        title: item.title,
        price: item.price,
        source: item.source,
        link,
        image: item.thumbnail,
        rating: item.rating,
        reviews: item.reviews,
        delivery: item.delivery,
        isOriginal,
      };
    }

    // Two parallel searches: manufacturer source + general comparison
    const [srcRes, genRes] = await Promise.all([
      fetch(buildUrl(`${query} wholesale manufacturer aliexpress alibaba`)),
      fetch(buildUrl(query)),
    ]);

    const [srcData, genData] = await Promise.all([srcRes.json(), genRes.json()]);

    if (srcData.error && genData.error) throw new Error(genData.error);

    const srcResults = (srcData.shopping_results ?? []).slice(0, 4).map((i) => mapItem(i, true));
    const genResults = (genData.shopping_results ?? []).map((i) => mapItem(i, false));

    // Deduplicate general vs source results by title
    const srcTitles = new Set(srcResults.map((r) => r.title));
    const deduped = genResults.filter((r) => !srcTitles.has(r.title));

    res.json([...srcResults, ...deduped]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
