import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Copy, ExternalLink, Share2, Shield } from "lucide-react";
import DOMPurify from "dompurify";
import Navbar from "../components/Navbar";
import { buildArticleScopeLabel, getArticleImage } from "../utils/articleMedia";
import "../styles/article-pages.css";

const API = "http://localhost:5000";
const CACHE_KEY_PREFIX = "lawyers-times-article-cache";
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

const BACK_LINKS = {
  "high-court": "/highcourts",
  "constitutional-law": "/constitutional-law",
  "legal-news": "/legal-news",
  "supreme-court": "/supreme-court",
  judgments: "/judgments",
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCacheKey(categorySlug, articleId) {
  return `${CACHE_KEY_PREFIX}:${categorySlug || "unknown"}:${articleId}`;
}

function readCache(categorySlug, articleId) {
  try {
    const payload = JSON.parse(localStorage.getItem(getCacheKey(categorySlug, articleId)) || "null");
    if (!payload || Date.now() - payload.storedAt > CACHE_TTL_MS) return null;
    return payload.data || null;
  } catch {
    return null;
  }
}

function writeCache(categorySlug, articleId, data) {
  try {
    localStorage.setItem(getCacheKey(categorySlug, articleId), JSON.stringify({ storedAt: Date.now(), data }));
  } catch {
    // Ignore storage errors.
  }
}

function renderHtmlContent(html = "") {
  return { __html: DOMPurify.sanitize(html || "") };
}

function LoadingShell() {
  return (
    <main className="article-reader-page">
      <section className="article-reader-shell loading-shell">
        <div className="article-skeleton hero" />
        <div className="article-skeleton line long" />
        <div className="article-skeleton line" />
        <div className="article-skeleton line mid" />
        <div className="article-skeleton line" />
      </section>
    </main>
  );
}

function ArticleDetail() {
  const { categorySlug, articleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const articleFromState = location.state?.article || null;
  const lookupId = searchParams.get("docid") || searchParams.get("id") || articleId;
  const lookupSlug = searchParams.get("slug") || articleId;
  const [article, setArticle] = useState(articleFromState);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(!articleFromState);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (articleFromState) {
      setArticle(articleFromState);
      setLoading(false);
    }

    const cached = readCache(categorySlug, lookupId);
    if (cached) {
      setArticle(cached.article);
      setRelated(cached.related || []);
      setLoading(false);
    }

    if (articleFromState) {
      return undefined;
    }

    setLoading(true);
    setError("");

    const controller = new AbortController();

    Promise.allSettled([
      axios.get(`${API}/api/articles/public/article/${lookupId}`, { signal: controller.signal, timeout: REQUEST_TIMEOUT_MS }),
      axios.get(`${API}/api/articles/public/category/${categorySlug}`, { signal: controller.signal, timeout: REQUEST_TIMEOUT_MS }),
    ])
      .then(([articleResult, relatedResult]) => {
        if (articleResult.status === "fulfilled") {
          const currentArticle = articleResult.value.data;
          const currentRelated = relatedResult.status === "fulfilled"
            ? (relatedResult.value.data || []).filter((item) => item.articleId !== lookupId)
            : [];

          setArticle(currentArticle);
          setRelated(currentRelated);
          writeCache(categorySlug, lookupId, { article: currentArticle, related: currentRelated });
        } else {
          const cachedArticle = cached?.article || articleFromState || null;

          if (cachedArticle) {
            setArticle(cachedArticle);
            setRelated(cached?.related || []);
          } else {
            setArticle(null);
            setRelated([]);
          }

          setError("Content temporarily unavailable.");
        }

        if (relatedResult.status === "rejected" && articleResult.status === "fulfilled") {
          setRelated([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [articleFromState, articleId, categorySlug, lookupId, lookupSlug]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categorySlug, lookupId]);

  const articleImage = useMemo(() => getArticleImage({ ...(article || articleFromState || {}), categorySlug }), [article, articleFromState, categorySlug]);
  const articleContent = useMemo(() => (
    article?.fullContent ||
    article?.content ||
    article?.body ||
    article?.text ||
    article?.summary ||
    article?.description ||
    articleFromState?.fullContent ||
    articleFromState?.content ||
    articleFromState?.body ||
    articleFromState?.summary ||
    articleFromState?.description ||
    "Content unavailable"
  ), [article, articleFromState]);
  const cleanHtml = useMemo(() => DOMPurify.sanitize(articleContent || ""), [articleContent]);
  const currentIndex = useMemo(() => related.findIndex((item) => item.articleId === lookupId), [related, lookupId]);
  const previousArticle = currentIndex > 0 ? related[currentIndex - 1] : null;
  const nextArticle = currentIndex >= 0 && currentIndex < related.length - 1 ? related[currentIndex + 1] : null;
  const backTarget = BACK_LINKS[location.state?.fromCategory || categorySlug] || `/articles/${categorySlug}`;
  const hasStructuredContent = Boolean(String(articleContent || "").trim());

  console.log("ARTICLE DATA", article);

  async function handleShare() {
    const shareData = {
      title: article?.title || "Lawyers Times",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function handleBack() {
    navigate(-1);
  }

  if (loading && !article) {
    return (
      <>
        <Navbar />
        <LoadingShell />
      </>
    );
  }

  const safeArticle = article || articleFromState || null;

  if (!safeArticle) {
    return (
      <>
        <Navbar />
        <main className="article-reader-page">
          <div className="state-card">{error || "Content temporarily unavailable."}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="article-reader-page">
        <section className="article-reader-shell">
          <nav className="article-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Link to={backTarget}>{buildArticleScopeLabel({ categorySlug, category: safeArticle.category })}</Link>
            <span>{safeArticle.title}</span>
          </nav>

          <div className="article-reader-header">
            <div className="article-reader-copy">
              <p className="article-reader-eyebrow">Published Article</p>
              <h1>{safeArticle.title}</h1>
              <div className="article-reader-meta">
                <span className="article-reader-badge">{safeArticle.category}</span>
                <span><CalendarDays size={15} /> {formatDate(safeArticle.publishedAt || safeArticle.submissionDate)}</span>
                <span><Clock3 size={15} /> {safeArticle.readTime}</span>
                <span><Shield size={15} /> {safeArticle.author?.name || "Lawyers Times"}</span>
              </div>
            </div>

            <div className="article-reader-toolbar">
              <button type="button" className="article-reader-button ghost" onClick={handleBack}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="article-reader-button" onClick={handleShare}>
                <Share2 size={16} /> {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>

          <div className="article-reader-hero">
            <img src={articleImage} alt={safeArticle.title} />
          </div>

          <section className="article-reader-grid">
            <article className="article-reader-content">
              <div className="article-reader-summary">
              <p>{safeArticle.shortDescription || safeArticle.summary || safeArticle.body || articleContent || "Full article content is below."}</p>
              </div>

              <div className="article-rich-content" dangerouslySetInnerHTML={renderHtmlContent(cleanHtml)} />

              {!hasStructuredContent ? (
                <div className="article-empty-content">
                <p>No structured content received.</p>
                </div>
              ) : null}

              <div className="article-reader-tag-row">
                {(safeArticle.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>

            <aside className="article-reader-sidebar">
              <div className="reader-card reader-nav-card">
                <h3>Article Navigation</h3>
                <div className="reader-nav-links">
                  <button type="button" className="article-reader-button ghost" disabled={!previousArticle} onClick={() => previousArticle && navigate(`/articles/${previousArticle.categorySlug}/${previousArticle.articleId}`, { state: { fromCategory: categorySlug, article: previousArticle } })}>
                    <ArrowLeft size={16} /> Previous article
                  </button>
                  <button type="button" className="article-reader-button ghost" disabled={!nextArticle} onClick={() => nextArticle && navigate(`/articles/${nextArticle.categorySlug}/${nextArticle.articleId}`, { state: { fromCategory: categorySlug, article: nextArticle } })}>
                    Next article <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="reader-card">
                <h3>Related Articles</h3>
                <div className="related-article-grid">
                  {related.length ? related.slice(0, 4).map((item) => (
                    <Link key={item.articleId} to={`/articles/${item.categorySlug}/${item.articleId}?id=${encodeURIComponent(item.articleId)}&docid=${encodeURIComponent(item.articleId)}`} state={{ fromCategory: categorySlug, article: item }} className="related-article-card">
                      <img src={getArticleImage({ ...item, categorySlug })} alt={item.title} />
                      <div>
                        <span>{item.category}</span>
                        <strong>{item.title}</strong>
                        <p>{item.shortDescription}</p>
                      </div>
                    </Link>
                  )) : <p>No related articles in this category yet.</p>}
                </div>
              </div>

              <div className="reader-card">
                <h3>Quick Actions</h3>
                <div className="reader-share-row">
                    <button type="button" className="article-reader-button ghost" onClick={handleShare}><Share2 size={16} /> X</button>
                    <button type="button" className="article-reader-button ghost" onClick={handleShare}><ExternalLink size={16} /> Facebook</button>
                    <button type="button" className="article-reader-button ghost" onClick={handleShare}><Copy size={16} /> LinkedIn</button>
                  <button type="button" className="article-reader-button ghost" onClick={handleShare}><Copy size={16} /> Copy link</button>
                </div>
              </div>
            </aside>
          </section>
        </section>
      </main>
    </>
  );
}

export default ArticleDetail;
