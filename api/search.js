// Platforms that are actual dropshipping/wholesale sources
const DROPSHIP_PLATFORMS = ['aliexpress', 'alibaba', 'dhgate', 'temu', 'banggood', 'gearbest', 'chinabrands', 'shein', 'wish', 'cjdropshipping'];

function isDropshippingSource(source = '', link = '') {
  const s = (source + link).toLowerCase();
  return DROPSHIP_PLATFORMS.some((p) => s.includes(p));
}

function parsePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.,]/g, '').replace(/,(\d{2})$/, '.$1').replace(',', '');
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

function valueScore(item) {
  const price = parsePrice(item.price);
  const rating = parseFloat(item.rating) || 0;
  const reviews = parseInt(item.reviews) || 0;
  if (!price || rating === 0) return 0;
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

    function mapItem(item) {
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
        // Only mark as original if it actually comes from a dropshipping/wholesale platform
        isOriginal: isDropshippingSource(item.source ?? '', link),
      };
    }

    const [srcRes, genRes] = await Promise.all([
      fetch(buildUrl(`${query} aliexpress alibaba wholesale`)),
      fetch(buildUrl(query)),
    ]);

    const [srcData, genData] = await Promise.all([srcRes.json(), genRes.json()]);

    if (srcData.error && genData.error) throw new Error(genData.error);

    const srcResults = (srcData.shopping_results ?? []).slice(0, 6).map(mapItem);
    const genResults = (genData.shopping_results ?? []).map(mapItem);

    // Merge: deduplicate by title, originals first
    const allTitles = new Set(srcResults.map((r) => r.title));
    const deduped = genResults.filter((r) => !allTitles.has(r.title));
    const all = [...srcResults, ...deduped];

    // Mark best value
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
