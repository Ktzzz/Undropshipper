async function getFreeVisionModel(key) {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  const models = data?.data ?? [];

  // Filter: free + supports image input
  const freeVision = models.filter((m) => {
    const isFree = m.pricing?.prompt === '0' || m.id.endsWith(':free');
    const hasVision = m.architecture?.input_modalities?.includes('image') ||
      m.architecture?.modality?.includes('image') ||
      m.id.toLowerCase().includes('vision') ||
      m.id.toLowerCase().includes('vl') ||
      m.id.toLowerCase().includes('gemini') ||
      m.id.toLowerCase().includes('llava');
    return isFree && hasVision;
  });

  if (freeVision.length > 0) return freeVision[0].id;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageUrl, mimeType } = req.body;
  if (!imageBase64 && !imageUrl) return res.status(400).json({ error: 'imageBase64 or imageUrl required' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY missing' });

  const prompt = `Analyse cette image d'un produit potentiellement vendu en dropshipping.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) dans ce format exact :
{
  "nom": "nom précis du produit en français",
  "categorie": "catégorie du produit",
  "description": "description concise de 1-2 phrases",
  "caracteristiques": ["caractéristique 1", "caractéristique 2", "caractéristique 3"],
  "mots_cles_recherche": "mots-clés en anglais optimisés pour trouver ce produit sur des sites marchands",
  "prix_estime_dropshipping": "fourchette de prix dropshipping estimée en €",
  "prix_estime_original": "fourchette de prix fabricant estimée en €",
  "origine_probable": "Chine / USA / Europe / etc."
}`;

  try {
    const model = await getFreeVisionModel(key);
    if (!model) return res.status(500).json({ error: 'Aucun modèle vision gratuit disponible sur OpenRouter.' });

    const imageContent = imageBase64
      ? { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } }
      : { type: 'image_url', image_url: { url: imageUrl } };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`[${model}] ${data.error.message ?? JSON.stringify(data.error)}`);

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Réponse vide du modèle');

    const cleaned = text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleaned);

    res.json({ ...analysis, _model: model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
