async function getFreeVisionModels(key) {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  const models = data?.data ?? [];

  return models.filter((m) => {
    const isFree = m.pricing?.prompt === '0' || m.id.endsWith(':free');
    const hasVision =
      m.architecture?.input_modalities?.includes('image') ||
      m.architecture?.modality?.includes('image') ||
      m.id.toLowerCase().includes('vision') ||
      m.id.toLowerCase().includes('vl') ||
      m.id.toLowerCase().includes('gemini') ||
      m.id.toLowerCase().includes('llava');
    return isFree && hasVision;
  }).map((m) => m.id);
}

async function tryModel(key, modelId, imageContent, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Réponse vide');
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  return { analysis: JSON.parse(cleaned), model: modelId };
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
    const models = await getFreeVisionModels(key);
    if (models.length === 0) return res.status(500).json({ error: 'Aucun modèle vision gratuit disponible.' });

    const imageContent = imageBase64
      ? { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } }
      : { type: 'image_url', image_url: { url: imageUrl } };

    let lastError = null;
    for (const modelId of models.slice(0, 5)) {
      try {
        const { analysis, model } = await tryModel(key, modelId, imageContent, prompt);
        return res.json({ ...analysis, _model: model });
      } catch (err) {
        lastError = err;
      }
    }

    res.status(500).json({ error: `Tous les modèles ont échoué. Dernier : ${lastError?.message}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
