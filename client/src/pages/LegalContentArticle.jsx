import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Copy, ExternalLink, Share2 } from "lucide-react";
import DOMPurify from "dompurify";
import Navbar from "../components/Navbar";
import { getLegalContentItem } from "../services/api";
import { getArticleImage } from "../utils/articleMedia";
import "../styles/article-pages.css";

const BACK_LINKS = {
  "high-court": "/highcourts",
  "supreme-court": "/supreme-court",
  "constitutional-law": "/constitutional-law",
  judgments: "/judgments",
  "legal-news": "/legal-news",
  articles: "/articles",
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LegalContentArticle() {
  const { slug, id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const docid = searchParams.get("docid") || id || "";
  const requestedTitle = searchParams.get("title") || location.state?.title || "";
  const requestedCategory = searchParams.get("category") || location.state?.category || "";
  const articleKey = String(
	docid || slug || id || ""
   ).trim();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const cacheKey = `${docid || articleKey}`;

  function readCache() {
    try {
      const raw = localStorage.getItem(`lawyers-times-article-cache:${cacheKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.storedAt || Date.now() - parsed.storedAt > 30 * 60 * 1000) return null;
      return parsed.data || null;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(`lawyers-times-article-cache:${cacheKey}`, JSON.stringify({ storedAt: Date.now(), data }));
    } catch {
      // Ignore storage failures.
    }
  }

  useEffect(() => {
    let active = true;
    let retryTimer = null;

    setLoading(true);
    setError("");
    setRetrying(false);

    const cached = readCache();
    if (cached) {
      setPayload(cached);
      setLoading(false);
    }

    getLegalContentItem(docid || slug || articleKey, { docid, slug, title: searchParams.get("title") || "" }, { timeout: 15000 })
      .then((response) => {
        if (!active) return;

        setPayload(response);
        writeCache(response);

        if (!response?.item?.fullContent && retryCount < 1) {
          setError("Full content loading...");
          setRetrying(true);
          retryTimer = window.setTimeout(() => setRetryCount((current) => current + 1), 1200);
          return;
        }

        setRetrying(false);
      })
      .catch((requestError) => {
        if (active) {
          if (!cached) {
            setPayload(null);
          }

          setError(requestError?.code === "ECONNABORTED" ? "Loading timed out. Retry once." : "Content temporarily unavailable.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [articleKey, slug, docid, retryCount]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [articleKey]);

  const item = payload?.item || null;
  const articleContent = useMemo(() => (
    item?.fullContent ||
    item?.content ||
    item?.body ||
    item?.text ||
    item?.summary ||
    item?.description ||
    "Content unavailable"
  ), [item]);
  const cleanHtml = useMemo(() => {

	const raw =
		String(articleContent || "");

	if (
		raw.includes("<p") ||
		raw.includes("<div") ||
		raw.includes("<br")
	) {

		return DOMPurify.sanitize(raw);

	}

	return DOMPurify.sanitize(
		raw
			.split("\n")
			.filter(Boolean)
			.map(
				(line) => `<p>${line}</p>`
			)
			.join("")
	);

}, [articleContent]);
  const articleImage = useMemo(() => getArticleImage(item || {}), [item]);
  const backTarget = BACK_LINKS[payload?.meta?.category || item?.categorySlug || requestedCategory || ""] || "/legal-news";
  const hasStructuredContent =
	String(articleContent || "")
		.replace(/\s+/g, "")
		.length > 30;

  console.log("ARTICLE CONTENT", item);

  async function handleShare() {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    if (navigator.share) {
      try {
        await navigator.share({ title: item?.title || "Legal article", url: shareUrl });
        return;
      } catch {
        // Fallback to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function handleBack() {
    if (location.key && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(backTarget, { replace: true });
  }

  if (loading && !item) {
    return (
      <>
        <Navbar />
        <main className="editorial-page">
          <div className="state-card">{error || "Loading legal article..."}</div>
        </main>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Navbar />
        <main className="editorial-page">
          <div className="state-card">{error || "No structured content received."}</div>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="editorial-secondary-button" onClick={() => setRetryCount((current) => current + 1)}>
              Retry
            </button>
          </div>
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
            <Link to={backTarget}>{item.courtCategory || item.category || requestedCategory || "Legal Content"}</Link>
            <span>{item.title}</span>
          </nav>

          <div className="article-reader-header">
            <div className="article-reader-copy">
              <p className="article-reader-eyebrow">Legal Article</p>
              <h1>{item.title}</h1>
              <div className="article-reader-meta">
                <span className="article-reader-badge">{item.courtCategory || item.category}</span>
                <span><CalendarDays size={15} /> {formatDate(item.publishDate)}</span>
                <span><Clock3 size={15} /> {item.readTime}</span>
                <span><ExternalLink size={15} /> {item.author || "Lawyers Times"}</span>
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
            <img src={articleImage} alt={item.title} />
          </div>

          <section className="article-reader-grid">
            <article className="article-reader-content">
              <div className="article-reader-summary">
                <p>{item.summary || articleContent || "Full content loading..."}</p>
              </div>

              <div className="article-rich-content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />

              {!hasStructuredContent ? (
                <div className="article-empty-content">
                  <p>{retrying ? "Full content loading..." : "No structured content received."}</p>
                  <button type="button" className="article-reader-button ghost" onClick={() => setRetryCount((current) => current + 1)}>
                    Retry fetch
                  </button>
                </div>
              ) : null}

              <div className="article-reader-tag-row">
                {(item.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>

            <aside className="article-reader-sidebar">
              <div className="reader-card reader-nav-card">
                <h3>Navigation</h3>
                <div className="reader-nav-links">
                  {payload?.previous ? (
                    <Link to={payload.previous.link} state={{ fromCategory: payload.meta?.category }} className="article-reader-button ghost">
                      <ArrowLeft size={16} /> Previous article
                    </Link>
                  ) : null}
                  {payload?.next ? (
                    <Link to={payload.next.link} state={{ fromCategory: payload.meta?.category }} className="article-reader-button ghost">
                      Next article <ArrowRight size={16} />
                    </Link>
                  ) : null}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="article-reader-button ghost" onClick={() => setRetryCount((current) => current + 1)}>
                    Retry fetch
                  </button>
                </div>
              </div>

              <div className="reader-card">
                <h3>Related Articles</h3>
                <div className="related-article-grid">
                  {(payload?.related || []).length ? payload.related.map((related) => (
                    <Link key={related.uniqueKey || related.id} to={related.link} state={{ fromCategory: payload.meta?.category }} className="related-article-card">
                      <img src={getArticleImage(related)} alt={related.title} />
                      <div>
                        <span>{related.courtCategory || related.category}</span>
                        <strong>{related.title}</strong>
                        <p>{related.summary || related.shortDescription}</p>
                      </div>
                    </Link>
                  )) : <p>No related legal articles available.</p>}
                </div>
              </div>

              <div className="reader-card">
                <h3>Share</h3>
                <button type="button" className="article-reader-button ghost" onClick={handleShare}>
                  <Copy size={16} /> Share this article
                </button>
                <p style={{ marginTop: "0.75rem" }}>This page stays inside Lawyers Times and never redirects externally.</p>
              </div>
            </aside>
          </section>
        </section>
      </main>
    </>
  );
}

export default LegalContentArticle;
