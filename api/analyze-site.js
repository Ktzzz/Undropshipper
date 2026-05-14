async function getFreeModel(key) {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  const free = (data?.data ?? []).filter((m) => m.id.endsWith(':free'));
  return free[0]?.id ?? null;
}

async function fetchSiteContent(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} — impossible d'accéder au site`);
  const html = await res.text();

  const title = (html.match(/<title[^>]*>([^<]{1,200})<\/title>/i) ?? [])[1]?.trim() ?? '';
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})/i) ?? [])[1]?.trim() ?? '';

  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);

  return { title, description, text: clean };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY missing' });

  try {
    const [{ title, description, text }, model] = await Promise.all([
      fetchSiteContent(url),
      getFreeModel(key),
    ]);

    if (!model) return res.status(500).json({ error: 'Aucun modèle IA disponible' });

    const prompt = `Tu es un expert en e-commerce et dropshipping. Analyse ce contenu d'un site web et détermine s'il s'agit d'un site de dropshipping.

URL: ${url}
Titre: ${title}
Description: ${description}
Contenu: ${text}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) dans ce format exact :
{
  "est_dropshipping": true,
  "confiance": 87,
  "verdict": "phrase courte expliquant pourquoi c'est (ou non) du dropshipping",
  "indicateurs": [
    "indicateur 1 trouvé sur le site",
    "indicateur 2 trouvé sur le site"
  ],
  "produits": [
    {
      "nom": "nom du produit en français",
      "prix_site": "prix affiché sur le site",
      "mots_cles": "keywords anglais pour chercher l'original sur Amazon/AliExpress"
    }
  ]
}

Indicateurs classiques de dropshipping : délais livraison 15-30 jours, ships from China, prix très bas, descriptions génériques, pas d'adresse physique, politique de retour compliquée, fautes d'orthographe, images génériques.
Extrais jusqu'à 5 produits représentatifs trouvés sur le site.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Réponse vide du modèle');

    const cleaned = raw.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleaned);

    res.json({ ...analysis, _model: model, title, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
