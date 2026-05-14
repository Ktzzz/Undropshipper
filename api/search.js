function parsePrice(str) {
  if (!str) return null;
  // Handle "12,99" (European) and "$12.99" formats
  const cleaned = str.replace(/[^0-9.,]/g, '').replace(/,(\d{2})$/, '.$1').replace(',', '');
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

function valueScore(item) {
  const price = parsePrice(item.price);
  const rating = parseFloat(item.rating) || 0;
  const reviews = parseInt(item.reviews) || 0;
  if (!price || rating === 0) return 0;
  // rating (0-5) weighted by review volume, divided by price
  return (rating * Math.log10(reviews + 10)) / price;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  const key = process.env.SERPAPI_KEY;
  if (!key) return res.status(500).json({ error: 'SERPAPI_KEY missing' });

  try {
    function buildUrl(q) {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_shopping');
      url.searchParams.set('q', q);
      url.searchParams.set('api_key', key);
      url.searchParams.set('num', '12');
      url.searchParams.set('hl', 'en');
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

    const [srcRes, genRes] = await Promise.all([
      fetch(buildUrl(`${query} wholesale manufacturer aliexpress alibaba`)),
      fetch(buildUrl(query)),
    ]);

    const [srcData, genData] = await Promise.all([srcRes.json(), genRes.json()]);

    if (srcData.error && genData.error) throw new Error(genData.error);

    const srcResults = (srcData.shopping_results ?? []).slice(0, 4).map((i) => mapItem(i, true));
    const genResults = (genData.shopping_results ?? []).map((i) => mapItem(i, false));

    const srcTitles = new Set(srcResults.map((r) => r.title));
    const deduped = genResults.filter((r) => !srcTitles.has(r.title));

    const all = [...srcResults, ...deduped];

    // Mark best value: highest (rating × log(reviews) / price) score
    const eligible = all.filter((r) => parsePrice(r.price) && r.rating);
    if (eligible.length > 0) {
      const best = eligible.reduce((a, b) => valueScore(a) >= valueScore(b) ? a : b);
      best.isBestValue = true;
    }

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
