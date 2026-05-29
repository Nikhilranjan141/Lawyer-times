const ARTICLE_IMAGE_MAP = {
  "allahabad high court": "/images/allahabad-hc.png",
  "delhi high court": "/images/delhi-hc.png",
  "bombay high court": "/images/bombay-hc.png",
  "patna high court": "/images/patna-hc.png",
  "madras high court": "/images/madras-hc.png",
  "karnataka high court": "/images/karnataka-hc.png",
  "supreme court": "/images/sc.png",
  "constitutional law": "/images/constitutional-law.png",
  "legal news": "/images/legal-news.png",
  judgments: "/images/default-legal.png",
  articles: "/images/default-legal.png",
  "high-court": "/images/default-legal.png",
};

const COURT_ALIASES = [
  ["allahabad", "/images/allahabad-hc.png"],
  ["delhi", "/images/delhi-hc.png"],
  ["bombay", "/images/bombay-hc.png"],
  ["patna", "/images/patna-hc.png"],
  ["madras", "/images/madras-hc.png"],
  ["karnataka", "/images/karnataka-hc.png"],
  ["supreme", "/images/sc.png"],
  ["constitutional", "/images/constitutional-law.png"],
  ["legal news", "/images/legal-news.png"],
  ["judgment", "/images/default-legal.png"],
];

function textValue(article = {}) {
  return `${article.title || ""} ${article.category || ""} ${article.categorySlug || ""} ${article.court || ""} ${(article.tags || []).join(" ")}`.toLowerCase();
}

export function getArticleImage(article = {}) {
  if (article.featuredImage) return article.featuredImage;

  const lowerText = textValue(article);

  if (article.court) {
    const exactCourt = ARTICLE_IMAGE_MAP[article.court.toLowerCase()];
    if (exactCourt) return exactCourt;
  }

  for (const [keyword, image] of COURT_ALIASES) {
    if (lowerText.includes(keyword)) {
      return image;
    }
  }

  const categorySlug = String(article.categorySlug || article.category || "").toLowerCase();
  return ARTICLE_IMAGE_MAP[categorySlug] || "/images/default-legal.png";
}

export function buildArticleScopeLabel(article = {}) {
  return article.court || article.category || article.categorySlug || "Legal Update";
}

export function splitArticleContent(content = "") {
  return String(content)
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}
