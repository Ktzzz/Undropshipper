import { useState, useRef, useEffect } from 'react';
import './App.css';

const API = '/api';

/* ── Loading messages ── */
const IMAGE_MESSAGES = [
  "Alors, c'est du dropshipping ou pas... 🤔",
  "L'IA inspecte chaque pixel du produit 🔍",
  "On cherche ce truc sur AliExpress...",
  "Ça ressemble à du Temu ou quoi ?",
  "Calcul du markup frauduleux en cours 📊",
  "On appelle nos contacts à Shenzhen 🏭",
  "L'image parle, on écoute attentivement.",
  "Identification du fournisseur original...",
  "Ce produit, on l'a déjà vu quelque part...",
  "Analyse des pixels suspects 👁️",
  "On compare avec des millions de produits...",
  "Traduction depuis le chinois en cours 🀄",
  "Le fabricant ne sait pas qu'on le cherche 😏",
  "Détection de l'emballage générique...",
  "On fouille AliExpress de fond en comble 📦",
  "Ce prix était trop beau pour être vrai, hein ?",
  "Reconnaissance visuelle activée 🤖",
  "On trace l'origine géographique du produit 🌍",
  "Est-ce que c'est vraiment 'livraison rapide' ?",
  "Les scammeurs ne font pas le poids face à l'IA.",
  "Presque là... encore une seconde.",
  "On épluche la base de données fabricants...",
  "Mission : retrouver l'original. En cours. 🎯",
  "L'IA ne dort jamais, contrairement aux livreurs.",
  "Yomi Denzel quelque part en sueur 😰",
  "Ton youtubeur préféré va perdre ses revenus 💸",
];

const SITE_MESSAGES = [
  "Il est bien ce site ou pas ? 🤨",
  "On va me les attraper ces scammeurs. 🕵️",
  "Lecture des petites lignes du site...",
  "Délais de livraison douteux ? On vérifie.",
  "Ships from China ? On verra bien...",
  "Analyse de l'adresse physique... ou pas.",
  "On cherche les fautes d'orthographe suspectes 👀",
  "La politique de retour dit quoi exactement ?",
  "Comparaison avec les prix du marché réel...",
  "On inspecte les descriptions produits 🖼️",
  "À quelle date ce domaine a été créé ?",
  "Les descriptions sont copiées-collées depuis AliExpress ?",
  "Pas d'adresse ? Pas de téléphone ? Hmm... 🚩",
  "On vérifie si c'est du Shopify générique...",
  "Le dossier se constitue... 📁",
  "Innocent jusqu'à preuve du contraire. Pour l'instant.",
  "On scrute chaque recoin du site.",
  "L'hébergement du serveur nous en dit long...",
  "Analyse du vocabulaire marketing suspect...",
  "Stock illimité ? Livraison 3-4 semaines ? 🤡",
  "Le verdict arrive, patience...",
  "On lit entre les lignes 📖",
  "Ces témoignages clients semblent vrais ou non ?",
  "Vérification du registre WHOIS du domaine...",
  "Yomi Denzel en sueur en ce moment même 😰",
  "Ton youtubeur préféré va perdre ses revenus 💸",
  "Tu peux préparer le mail pour fermer le site Shopify 🔒",
];

const SEARCH_MESSAGES = [
  "Chasse à l'original lancée 🏹",
  "On ratisse Amazon, AliExpress, eBay...",
  "Comparaison des prix en temps réel 💰",
  "Recherche du vrai fournisseur...",
  "On interroge toutes les plateformes...",
  "Le prix fabricant va vous surprendre.",
  "Quelques secondes encore...",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Loader({ messages = IMAGE_MESSAGES, text }) {
  const [tick, setTick] = useState(0);
  const queueRef = useRef(shuffle(messages));
  const posRef = useRef(0);

  useEffect(() => {
    if (text) return;
    const id = setInterval(() => {
      posRef.current += 1;
      if (posRef.current >= queueRef.current.length) {
        queueRef.current = shuffle(messages);
        posRef.current = 0;
      }
      setTick((t) => t + 1);
    }, 2800);
    return () => clearInterval(id);
  }, [messages, text]);

  const displayed = text ?? queueRef.current[posRef.current];

  return (
    <div className="loader">
      <div className="spinner" />
      <span key={tick} className="loader-text">{displayed}</span>
    </div>
  );
}

/* ── Image upload zone ── */
function UploadZone({ onImage }) {
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState('upload');
  const inputRef = useRef();

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      onImage({ base64, mimeType: file.type, preview: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleUrlSubmit(e) {
    e.preventDefault();
    if (urlInput.trim()) onImage({ url: urlInput.trim(), preview: urlInput.trim() });
  }

  return (
    <div className="upload-section">
      <div className="mode-toggle">
        <button className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>📷 Fichier</button>
        <button className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>🔗 URL image</button>
      </div>

      {mode === 'upload' ? (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
          <div className="drop-icon">📦</div>
          <p>Glisse une image ici ou <span className="link">clique pour choisir</span></p>
          <small>Capture d'écran, photo produit, screenshot d'annonce...</small>
        </div>
      ) : (
        <form className="url-form" onSubmit={handleUrlSubmit}>
          <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image-produit.jpg" autoFocus />
          <button type="submit">Analyser</button>
        </form>
      )}
    </div>
  );
}

/* ── Analysis card (image mode) ── */
function AnalysisCard({ analysis }) {
  return (
    <div className="analysis-card">
      <div className="analysis-top">
        <div className="analysis-titles">
          <span className="category-tag">{analysis.categorie}</span>
          <h2>{analysis.nom}</h2>
          <p className="analysis-desc">{analysis.description}</p>
        </div>
        <div className="price-compare">
          <div className="price-item drop">
            <small>💸 Dropshipping</small>
            <strong>{analysis.prix_estime_dropshipping}</strong>
          </div>
          <div className="price-vs">VS</div>
          <div className="price-item original">
            <small>🏭 Fabricant</small>
            <strong>{analysis.prix_estime_original}</strong>
          </div>
        </div>
      </div>
      <div className="tags">
        {analysis.caracteristiques.map((c) => <span key={c} className="tag">{c}</span>)}
        <span className="tag origin">🌍 {analysis.origine_probable}</span>
      </div>
    </div>
  );
}

/* ── Site analysis card ── */
function SiteAnalysisCard({ analysis }) {
  const color = analysis.est_dropshipping ? '#f87171' : '#4ade80';
  const label = analysis.est_dropshipping ? '🚨 Site de dropshipping' : '✅ Semble légitime';

  return (
    <div className="analysis-card site-card">
      <div className="site-verdict" style={{ borderColor: color }}>
        <div className="verdict-left">
          <span className="verdict-label" style={{ color }}>{label}</span>
          <p className="verdict-text">{analysis.verdict}</p>
        </div>
        <div className="confidence-ring">
          <svg viewBox="0 0 36 36" className="ring-svg">
            <path d="M18 2 a16 16 0 1 1 0 32 a16 16 0 1 1 0-32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <path d="M18 2 a16 16 0 1 1 0 32 a16 16 0 1 1 0-32" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${analysis.confiance} 100`} strokeLinecap="round"
              style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }} />
          </svg>
          <span className="ring-label" style={{ color }}>{analysis.confiance}%</span>
        </div>
      </div>

      {analysis.indicateurs?.length > 0 && (
        <div className="indicators">
          {analysis.indicateurs.map((ind, i) => (
            <span key={i} className="indicator-tag">⚠️ {ind}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Result card (shopping) ── */
const SOURCE_COLORS = { amazon: '#FF9900', aliexpress: '#FF4747', ebay: '#E53238', alibaba: '#FF6A00', wish: '#7B43D2', walmart: '#0071CE' };
function getSourceColor(source = '') {
  const key = Object.keys(SOURCE_COLORS).find((k) => source.toLowerCase().includes(k));
  return key ? SOURCE_COLORS[key] : '#6b6b80';
}

function ResultCard({ item }) {
  const color = getSourceColor(item.source);
  const classes = [
    'result-card',
    item.isOriginal ? 'result-card--original' : '',
    item.isBestValue ? 'result-card--best' : '',
  ].filter(Boolean).join(' ');

  return (
    <a className={classes} href={item.link} target="_blank" rel="noreferrer">
      {item.isBestValue && <div className="best-banner">🏆 Meilleur rapport qualité/prix</div>}
      {item.isOriginal && !item.isBestValue && <div className="original-banner">🏭 Source fabricant</div>}
      <div className="result-img-wrap">
        {item.image ? <img src={item.image} alt={item.title} /> : <div className="no-img">📦</div>}
        <span className="source-badge" style={{ background: color }}>{item.source}</span>
      </div>
      <div className="result-body">
        <p className="result-title">{item.title}</p>
        <div className="result-footer">
          <strong className={`result-price${item.isOriginal ? ' result-price--original' : ''}`}>{item.price ?? '—'}</strong>
          {item.rating && <span className="result-rating">⭐ {item.rating}{item.reviews ? ` (${Number(item.reviews).toLocaleString('fr')})` : ''}</span>}
        </div>
        {item.delivery && <small className="result-delivery">{item.delivery}</small>}
      </div>
    </a>
  );
}

function SectionBanner({ variant, icon, title, desc, pill, pillClass }) {
  return (
    <div className={`section-banner section-banner--${variant}`}>
      <div className="section-banner-main">
        <span className="section-banner-icon">{icon}</span>
        <div className="section-banner-text">
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
      <span className={`pill ${pillClass ?? ''}`}>{pill}</span>
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="not-found-card">
      <span className="nf-icon">🔍</span>
      <div className="nf-body">
        <h4>Introuvable sur les grandes plateformes</h4>
        <p>Aucun produit similaire détecté sur Amazon, AliExpress ou eBay. Les articles revendus en dropshipping proviennent généralement de ces sources — ne pas les trouver est un <strong>signal positif d'originalité</strong>.</p>
      </div>
      <span className="nf-badge">✅ Possiblement original</span>
    </div>
  );
}

function ResultsGrid({ results }) {
  const originals = results.filter((r) => r.isOriginal);
  const others = results.filter((r) => !r.isOriginal);

  if (results.length === 0) return <NotFoundCard />;

  return (
    <>
      {originals.length > 0 ? (
        <section className="results-section">
          <SectionBanner
            variant="original"
            icon="🏭"
            title="Source fabricant"
            desc="Prix direct du fabricant ou grossiste — c'est là que le dropshipper s'approvisionne avant de revendre 2× à 5× plus cher."
            pill={`${originals.length} produit${originals.length > 1 ? 's' : ''} trouvé${originals.length > 1 ? 's' : ''}`}
            pillClass="pill--original"
          />
          <div className="results-grid">{originals.map((item, i) => <ResultCard key={i} item={item} />)}</div>
        </section>
      ) : (
        <div className="no-source-note">
          <span>🏭</span>
          <p>Source fabricant introuvable sur AliExpress/Alibaba — le produit est peut-être une création originale ou une marque propre.</p>
        </div>
      )}
      {others.length > 0 && (
        <section className="results-section">
          <SectionBanner
            variant="compare"
            icon="🛒"
            title="Produits similaires sur d'autres plateformes"
            desc="Résultats basés sur les mots-clés du produit — vérifiez visuellement que les articles proposés ressemblent bien à ce que vous cherchez."
            pill={`${others.length} résultat${others.length > 1 ? 's' : ''}`}
          />
          <div className="results-grid">{others.map((item, i) => <ResultCard key={i} item={item} />)}</div>
        </section>
      )}
    </>
  );
}

/* ── Image mode ── */
function ImageMode() {
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState('');

  async function handleImage(imageData) {
    setPreview(imageData.preview); setAnalysis(null); setResults([]);
    setError(''); setLoadingAnalysis(true);
    try {
      const body = imageData.base64
        ? { imageBase64: imageData.base64, mimeType: imageData.mimeType }
        : { imageUrl: imageData.url };

      const res = await fetch(`${API}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data); setLoadingAnalysis(false);

      setLoadingSearch(true);
      const searchRes = await fetch(`${API}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: data.mots_cles_recherche }) });
      const searchData = await searchRes.json();
      if (searchData.error) throw new Error(searchData.error);
      setResults(searchData);
    } catch (err) {
      setError(err.message); setLoadingAnalysis(false);
    } finally { setLoadingSearch(false); }
  }

  if (!preview) return <UploadZone onImage={handleImage} />;

  return (
    <div className="results-layout">
      <div className="preview-bar">
        <div className="preview-img-wrap"><img src={preview} alt="Produit analysé" /></div>
        <button className="reset-btn" onClick={() => { setPreview(null); setAnalysis(null); setResults([]); setError(''); }}>← Nouvelle analyse</button>
      </div>
      {error && <p className="error">{error}</p>}
      {loadingAnalysis && <Loader messages={IMAGE_MESSAGES} />}
      {analysis && <AnalysisCard analysis={analysis} />}
      {loadingSearch && <Loader messages={SEARCH_MESSAGES} />}
      {results.length > 0 && <ResultsGrid results={results} />}
    </div>
  );
}

/* ── Site mode ── */
function SiteMode() {
  const [urlInput, setUrlInput] = useState('');
  const [siteAnalysis, setSiteAnalysis] = useState(null);
  const [productResults, setProductResults] = useState({});
  const [loadingSite, setLoadingSite] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');

  async function handleSiteAnalyze(e) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSiteAnalysis(null); setProductResults({}); setError(''); setLoadingSite(true);
    try {
      const res = await fetch(`${API}/analyze-site`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlInput.trim() }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSiteAnalysis(data); setLoadingSite(false);

      if (data.produits?.length > 0) {
        setLoadingProducts(true);
        const searches = await Promise.all(
          data.produits.map(async (p) => {
            const r = await fetch(`${API}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: p.mots_cles }) });
            const d = await r.json();
            return { nom: p.nom, prix_site: p.prix_site, results: Array.isArray(d) ? d.slice(0, 6) : [] };
          })
        );
        const map = {};
        searches.forEach((s) => { map[s.nom] = s; });
        setProductResults(map);
        setLoadingProducts(false);
      }
    } catch (err) {
      setError(err.message); setLoadingSite(false); setLoadingProducts(false);
    }
  }

  return (
    <>
      <form className="url-form site-url-form" onSubmit={handleSiteAnalyze}>
        <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://boutique-suspecte.com" autoFocus />
        <button type="submit" disabled={loadingSite}>{loadingSite ? 'Analyse...' : 'Analyser le site'}</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loadingSite && <Loader messages={SITE_MESSAGES} />}

      {siteAnalysis && (
        <div className="results-layout">
          <SiteAnalysisCard analysis={siteAnalysis} />

          {siteAnalysis.produits?.length > 0 && (
            <>
              {loadingProducts && <Loader messages={SEARCH_MESSAGES} />}
              {siteAnalysis.produits.map((p) => (
                <section key={p.nom}>
                  <div className="section-header">
                    <h3>{p.nom}</h3>
                    <span className="pill site-price">Site : {p.prix_site}</span>
                  </div>
                  {!loadingProducts && (
                    productResults[p.nom]
                      ? <ResultsGrid results={productResults[p.nom].results} />
                      : null
                  )}
                </section>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ── App root ── */
export default function App() {
  const [mode, setMode] = useState('image');

  return (
    <div className="app">
      <header className="header">
        <h1><span className="logo-icon">🔍</span> UnDropshipper</h1>
        <p className="subtitle">Identifie l'origine réelle d'un produit dropshipping sur toutes les plateformes</p>
      </header>

      <div className="tabs">
        <button className={mode === 'image' ? 'tab active' : 'tab'} onClick={() => setMode('image')}>
          <span className="tab-icon">📷</span>
          Analyser une image
          <small style={{ fontWeight: 400, fontSize: '0.78rem', opacity: 0.6 }}>Photo, capture d'écran, URL</small>
        </button>
        <button className={mode === 'site' ? 'tab active' : 'tab'} onClick={() => setMode('site')}>
          <span className="tab-icon">🌐</span>
          Analyser un site
          <small style={{ fontWeight: 400, fontSize: '0.78rem', opacity: 0.6 }}>Détecte le dropshipping</small>
        </button>
      </div>

      {mode === 'image' ? <ImageMode /> : <SiteMode />}
    </div>
  );
}
