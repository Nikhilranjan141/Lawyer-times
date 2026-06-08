// const LEGAL_IMAGE_POOL = [
//   "https://images.unsplash.com/photo-1589578527966-fdac0f44566c?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1528747045269-390fe33c19f2?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1453945619913-79ec89a82c51?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1200&q=80",
//   "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80",
// ];

// const DEFAULT_COURT_IMAGE = LEGAL_IMAGE_POOL[1];

// const TOPIC_IMAGE_RULES = [
//   { terms: ["constitution", "article 14", "article 19", "article 21", "fundamental right"], image: LEGAL_IMAGE_POOL[0] },
//   { terms: ["bail", "criminal", "fir", "arrest", "custody", "accused"], image: LEGAL_IMAGE_POOL[2] },
//   { terms: ["property", "land", "revenue", "tenant", "lease"], image: LEGAL_IMAGE_POOL[3] },
//   { terms: ["tax", "gst", "income tax", "customs", "excise"], image: LEGAL_IMAGE_POOL[4] },
//   { terms: ["privacy", "digital", "data", "technology", "cyber"], image: LEGAL_IMAGE_POOL[7] },
//   { terms: ["election", "parliament", "assembly", "government"], image: LEGAL_IMAGE_POOL[6] },
//   { terms: ["contract", "company", "corporate", "insolvency", "arbitration"], image: LEGAL_IMAGE_POOL[5] },
//   { terms: ["family", "marriage", "divorce", "maintenance", "custody"], image: LEGAL_IMAGE_POOL[1] },
// ];

// const ARTICLE_IMAGE_MAP = {
//   "allahabad high court": LEGAL_IMAGE_POOL[0],
//   "andhra pradesh high court": LEGAL_IMAGE_POOL[1],
//   "bombay high court": LEGAL_IMAGE_POOL[2],
//   "calcutta high court": LEGAL_IMAGE_POOL[3],
//   "chhattisgarh high court": LEGAL_IMAGE_POOL[4],
//   "delhi high court": LEGAL_IMAGE_POOL[5],
//   "gauhati high court": LEGAL_IMAGE_POOL[6],
//   "gujarat high court": LEGAL_IMAGE_POOL[7],
//   "himachal pradesh high court": LEGAL_IMAGE_POOL[0],
//   "jammu & kashmir and ladakh high court": LEGAL_IMAGE_POOL[1],
//   "jharkhand high court": LEGAL_IMAGE_POOL[2],
//   "karnataka high court": LEGAL_IMAGE_POOL[3],
//   "kerala high court": LEGAL_IMAGE_POOL[4],
//   "madhya pradesh high court": LEGAL_IMAGE_POOL[5],
//   "madras high court": LEGAL_IMAGE_POOL[6],
//   "manipur high court": LEGAL_IMAGE_POOL[7],
//   "meghalaya high court": LEGAL_IMAGE_POOL[0],
//   "orissa high court": LEGAL_IMAGE_POOL[1],
//   "patna high court": LEGAL_IMAGE_POOL[2],
//   "punjab and haryana high court": LEGAL_IMAGE_POOL[3],
//   "rajasthan high court": LEGAL_IMAGE_POOL[4],
//   "sikkim high court": LEGAL_IMAGE_POOL[5],
//   "telangana high court": LEGAL_IMAGE_POOL[6],
//   "tripura high court": LEGAL_IMAGE_POOL[7],
//   "uttarakhand high court": LEGAL_IMAGE_POOL[0],
//   "supreme court": LEGAL_IMAGE_POOL[0],
//   "constitutional law": LEGAL_IMAGE_POOL[0],
//   "legal news": LEGAL_IMAGE_POOL[6],
//   judgments: DEFAULT_COURT_IMAGE,
//   articles: DEFAULT_COURT_IMAGE,
//   "high-court": DEFAULT_COURT_IMAGE,
//   highcourt: DEFAULT_COURT_IMAGE,
// };

// const COURT_ALIASES = [
//   ["allahabad", LEGAL_IMAGE_POOL[0]],
//   ["andhra", LEGAL_IMAGE_POOL[1]],
//   ["bombay", LEGAL_IMAGE_POOL[2]],
//   ["calcutta", LEGAL_IMAGE_POOL[3]],
//   ["chhattisgarh", LEGAL_IMAGE_POOL[4]],
//   ["delhi", LEGAL_IMAGE_POOL[5]],
//   ["gauhati", LEGAL_IMAGE_POOL[6]],
//   ["gujarat", LEGAL_IMAGE_POOL[7]],
//   ["himachal", LEGAL_IMAGE_POOL[0]],
//   ["jammu", LEGAL_IMAGE_POOL[1]],
//   ["jharkhand", LEGAL_IMAGE_POOL[2]],
//   ["karnataka", LEGAL_IMAGE_POOL[3]],
//   ["kerala", LEGAL_IMAGE_POOL[4]],
//   ["madhya", LEGAL_IMAGE_POOL[5]],
//   ["madras", LEGAL_IMAGE_POOL[6]],
//   ["manipur", LEGAL_IMAGE_POOL[7]],
//   ["meghalaya", LEGAL_IMAGE_POOL[0]],
//   ["orissa", LEGAL_IMAGE_POOL[1]],
//   ["patna", LEGAL_IMAGE_POOL[2]],
//   ["punjab", LEGAL_IMAGE_POOL[3]],
//   ["rajasthan", LEGAL_IMAGE_POOL[4]],
//   ["sikkim", LEGAL_IMAGE_POOL[5]],
//   ["telangana", LEGAL_IMAGE_POOL[6]],
//   ["tripura", LEGAL_IMAGE_POOL[7]],
//   ["uttarakhand", LEGAL_IMAGE_POOL[0]],
//   ["supreme", LEGAL_IMAGE_POOL[0]],
//   ["constitutional", LEGAL_IMAGE_POOL[0]],
//   ["legal news", LEGAL_IMAGE_POOL[6]],
//   ["high court", DEFAULT_COURT_IMAGE],
//   ["highcourt", DEFAULT_COURT_IMAGE],
//   ["court", DEFAULT_COURT_IMAGE],
//   ["judgment", DEFAULT_COURT_IMAGE],
// ];

// function textValue(article = {}) {
//   return `${article.title || ""} ${article.category || ""} ${article.categorySlug || ""} ${article.court || ""} ${(article.tags || []).join(" ")}`.toLowerCase();
// }

// export function getArticleImage(article = {}) {
//   if (article.image && !isFallbackImage(article.image)) return article.image;
//   if (article.featuredImage && !isFallbackImage(article.featuredImage)) return article.featuredImage;
//   return "";
// }

// export function capitalizeTitle(value = "") {
//   const s = String(value || "").trim();
//   if (!s) return "";
//   return s.charAt(0).toUpperCase() + s.slice(1);
// }

// export function buildArticleScopeLabel(article = {}) {
//   return article.court || article.category || article.categorySlug || "Legal Update";
// }

// export function getCourtFallbackImage(article = {}) {
//   const courtCandidates = [];
//   if (article.court) courtCandidates.push(String(article.court || "").toLowerCase());
//   if (article.courtCategory) courtCandidates.push(String(article.courtCategory || "").toLowerCase());
//   if (article.category) courtCandidates.push(String(article.category || "").toLowerCase());
//   if (article.categorySlug) courtCandidates.push(String(article.categorySlug || "").toLowerCase());
//   if (article.sectionKey) courtCandidates.push(String(article.sectionKey || "").toLowerCase());

//   for (const candidate of courtCandidates) {
//     if (!candidate) continue;
//     const exact = ARTICLE_IMAGE_MAP[candidate];
//     if (exact) return exact;
//     // try some simple variants
//     const normalized = candidate.replace(/-high-court/g, " high court").replace(/-/g, " ").trim();
//     if (ARTICLE_IMAGE_MAP[normalized]) return ARTICLE_IMAGE_MAP[normalized];
//     if (normalized.includes("high court") || normalized.includes("highcourt") || normalized.includes("court")) {
//       return pickImageFromText(candidate);
//     }
//   }

//   return null;
// }

// function hashText(value = "") {
//   return String(value || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
// }

// function pickImageFromText(value = "") {
//   const hash = Math.abs(hashText(value || "legal update"));
//   return LEGAL_IMAGE_POOL[hash % LEGAL_IMAGE_POOL.length];
// }

// function getTopicImage(value = "") {
//   const text = String(value || "").toLowerCase();
//   const rule = TOPIC_IMAGE_RULES.find((entry) => entry.terms.some((term) => text.includes(term)));
//   return rule?.image || "";
// }

// function isFallbackImage(image = "") {
//   const value = String(image || "").trim().toLowerCase();
//   if (!value) return true;
//   if (value.startsWith("data:")) return true;
//   if (value.includes("/images/")) return true;
//   if (value.includes("default-legal")) return true;
//   if (value.includes("images.unsplash.com")) return true;
//   if (value.includes("logo") || value.includes("favicon")) return true;
//   if (value.includes("news.google") || value.includes("encrypted-tbn")) return true;
//   if (value.includes("gstatic") || value.includes("googleusercontent")) return true;
//   return false;
// }

// export function hasArticleImage(article = {}) {
//   return Boolean(getArticleImage(article));
// }

// export function splitArticleContent(content = "") {
//   return String(content)
//     .split(/\n\s*\n/g)
//     .map((block) => block.trim())
//     .filter(Boolean);
// }







const TOPIC_IMAGE_RULES = [
  { terms: ["constitution", "article 14", "article 19", "article 21", "fundamental right", "fundamental rights"], seed: 10 },
  { terms: ["bail", "arrest", "custody", "accused", "fir", "criminal", "murder", "rape", "assault"], seed: 20 },
  { terms: ["property", "land", "revenue", "tenant", "lease", "possession", "mutation"], seed: 30 },
  { terms: ["tax", "gst", "income tax", "customs", "excise", "duty", "assessment"], seed: 40 },
  { terms: ["privacy", "digital", "data", "technology", "cyber", "internet", "software"], seed: 50 },
  { terms: ["election", "parliament", "assembly", "government", "legislature", "vote"], seed: 60 },
  { terms: ["contract", "company", "corporate", "insolvency", "arbitration", "commercial"], seed: 70 },
  { terms: ["family", "marriage", "divorce", "maintenance", "custody", "adoption", "matrimonial"], seed: 80 },
  { terms: ["environment", "pollution", "forest", "wildlife", "ecology", "green"], seed: 90 },
  { terms: ["labour", "worker", "employment", "service", "salary", "wages", "termination"], seed: 100 },
  { terms: ["education", "school", "university", "student", "college", "admission"], seed: 110 },
  { terms: ["medical", "hospital", "doctor", "negligence", "health", "patient"], seed: 120 },
  { terms: ["bank", "loan", "cheque", "fraud", "financial", "money", "nbfc"], seed: 130 },
  { terms: ["drug", "narcotic", "ndps", "smuggling", "contraband"], seed: 140 },
  { terms: ["pension", "retirement", "civil service", "government service"], seed: 150 },
  { terms: ["trademark", "patent", "copyright", "intellectual property"], seed: 160 },
  { terms: ["insurance", "accident", "compensation", "motor vehicle", "mact"], seed: 170 },
  { terms: ["tender", "procurement", "bid", "public works"], seed: 180 },
  { terms: ["writ", "petition", "habeas corpus", "mandamus", "certiorari"], seed: 190 },
  { terms: ["electricity", "power", "energy", "utility", "tariff"], seed: 200 },
];

const COURT_SEED_MAP = {
  "allahabad high court": 301,
  "andhra pradesh high court": 302,
  "bombay high court": 303,
  "calcutta high court": 304,
  "chhattisgarh high court": 305,
  "delhi high court": 306,
  "gauhati high court": 307,
  "gujarat high court": 308,
  "himachal pradesh high court": 309,
  "jammu & kashmir and ladakh high court": 310,
  "jharkhand high court": 311,
  "karnataka high court": 312,
  "kerala high court": 313,
  "madhya pradesh high court": 314,
  "madras high court": 315,
  "manipur high court": 316,
  "meghalaya high court": 317,
  "orissa high court": 318,
  "patna high court": 319,
  "punjab and haryana high court": 320,
  "rajasthan high court": 321,
  "sikkim high court": 322,
  "telangana high court": 323,
  "tripura high court": 324,
  "uttarakhand high court": 325,
  "supreme court": 300,
  "constitutional law": 330,
  "legal news": 340,
  "judgments": 350,
};

const SECTION_SEED_MAP = {
  "supreme": 300,
  "constitutional": 330,
  "legal-news": 340,
  "judgments": 350,
  "highcourt": 360,
};

function hashString(str = "") {
  let hash = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getTopicSeed(title = "") {
  const lower = String(title || "").toLowerCase();
  for (const rule of TOPIC_IMAGE_RULES) {
    if (rule.terms.some((term) => lower.includes(term))) {
      return rule.seed;
    }
  }
  return null;
}

function isBadImage(image = "") {
  const v = String(image || "").trim().toLowerCase();
  if (!v) return true;
  if (v.startsWith("data:")) return true;
  if (v.includes("/images/")) return true;
  if (v.includes("default-legal")) return true;
  if (v.includes("logo") || v.includes("favicon")) return true;
  if (v.includes("news.google") || v.includes("encrypted-tbn")) return true;
  if (v.includes("gstatic") || v.includes("googleusercontent")) return true;
  return false;
}

// Picsum — seed se deterministic, unique per article
function buildImageUrl(baseSeed, titleHash) {
  const finalSeed = (baseSeed * 1000 + (titleHash % 1000)) % 100000;
  return `https://picsum.photos/seed/${finalSeed}/800/500`;
}

export function getArticleImage(article = {}) {
  if (article.image && !isBadImage(article.image)) return article.image;
  if (article.featuredImage && !isBadImage(article.featuredImage)) return article.featuredImage;

  const title = String(article.title || "");
  const court = String(article.court || "").toLowerCase();
  const sectionKey = String(article.sectionKey || article.categorySlug || "").toLowerCase();
  const titleHash = hashString(title || article.docid || court);

  // 1. Title ke topic se
  const topicSeed = getTopicSeed(title);
  if (topicSeed) {
    return buildImageUrl(topicSeed, titleHash);
  }

  // 2. Court ke basis pe
  const courtSeed = COURT_SEED_MAP[court] || null;
  if (courtSeed) {
    return buildImageUrl(courtSeed, titleHash);
  }

  // 3. Section ke basis pe
  const sectionSeed = SECTION_SEED_MAP[sectionKey] || null;
  if (sectionSeed) {
    return buildImageUrl(sectionSeed, titleHash);
  }

  // 4. Fully unique fallback from title hash
  return buildImageUrl(400, titleHash);
}

export function getCourtFallbackImage(article = {}) {
  const court = String(article.court || "").toLowerCase();
  const sectionKey = String(article.sectionKey || article.categorySlug || "").toLowerCase();
  const titleHash = hashString(article.title || article.docid || court || "legal");

  const seed = COURT_SEED_MAP[court] || SECTION_SEED_MAP[sectionKey] || 400;
  return buildImageUrl(seed, titleHash);
}

export function capitalizeTitle(value = "") {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildArticleScopeLabel(article = {}) {
  return article.court || article.category || article.categorySlug || "Legal Update";
}

export function hasArticleImage(article = {}) {
  return Boolean(getArticleImage(article));
}

export function splitArticleContent(content = "") {
  return String(content)
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}