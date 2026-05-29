import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarDays, Clock3, RefreshCw, Search } from "lucide-react";
import Navbar from "./Navbar";
import { getLegalContent } from "../services/api";
import "../styles/legal-content.css";

const initialVisibleCount = 12;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = "section-scoped-v2";

const sortOptions = [
  { label: "Latest", value: "latest" },
  { label: "Most Read", value: "most-read" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated recently";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

function dedupeByDocId(items = []) {
  const uniqueDocumentsMap = new Map();

  items.forEach((item, index) => {
    const docid = item.docid || item.sourceId || item.id || item.slug || `doc-${index}`;
    if (!uniqueDocumentsMap.has(docid)) {
      uniqueDocumentsMap.set(docid, {
        ...item,
        uniqueKey: item.uniqueKey || `${item.source || "legal"}-${docid}-${item.courtSlug || item.courtCategory || item.categorySlug || "content"}-${item.categorySlug || "legal"}-${index}`,
      });
    }
  });

  return Array.from(uniqueDocumentsMap.values());
}

function getCacheKey(params) {
  return `lawyers-times-legal-content:${CACHE_VERSION}:${params.category || "all"}:${params.court || "all"}:${params.search || ""}:${params.sort || "latest"}`;
}

function readCache(params) {
  try {
    const raw = localStorage.getItem(getCacheKey(params));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.storedAt || Date.now() - parsed.storedAt > CACHE_TTL_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(params, payload) {
  try {
    localStorage.setItem(getCacheKey(params), JSON.stringify({ storedAt: Date.now(), ...payload }));
  } catch {
    // Ignore storage failures.
  }
}

function linkProps(item) {
  const docid = item.docid || item.sourceId || item.id || item.slug || "";
  const slug = item.slug || item.uniqueKey || item.id || docid;

  if (item.source === "admin") {
    return {
      as: Link,
      to: `/articles/${item.categorySlug || "articles"}/${docid}`,
      state: { article: item },
    };
  }

  return {
    as: Link,
    to: `/article/${encodeURIComponent(slug)}?docid=${encodeURIComponent(docid)}&title=${encodeURIComponent(item.title || "")}&category=${encodeURIComponent(item.categorySlug || item.category || "")}`,
    state: { article: item },
  };
}

function SkeletonGrid() {
  return (
    <div className="legal-skeleton-grid" aria-label="Loading legal content">
      {Array.from({ length: 9 }).map((_, index) => (
        <div className="legal-skeleton-card" key={`skeleton-${index}`}>
          <span />
          <strong />
          <p />
          <p />
        </div>
      ))}
    </div>
  );
}

function ArticleCard({ item, index }) {
  const { as: Target, ...targetProps } = linkProps(item);

  return (
    <motion.article
      className="legal-feed-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.34, delay: Math.min(index * 0.035, 0.24) }}
      whileHover={{ y: -8 }}
    >
      <div className="legal-card-image">
        <img src={item.image} alt={item.title} loading="lazy" />
      </div>
      <div className="legal-card-body">
        <div className="legal-meta-row">
          <span>{item.source}</span>
          <span><CalendarDays size={14} /> {formatDate(item.publishDate)}</span>
          <span><Clock3 size={14} /> {item.readTime}</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary || "Open the full legal update for more context and source details."}</p>
        <div className="legal-tag-row">
          {(item.tags || []).slice(0, 3).map((tag, tagIndex) => <span key={`${item.uniqueKey || item.id}-${tag}-${tagIndex}`}>{tag}</span>)}
        </div>
        <Target className="legal-read-link" {...targetProps}>
          Read Full Article <ArrowRight size={15} />
        </Target>
      </div>
    </motion.article>
  );
}

function FeaturedArticle({ item }) {
  if (!item) return null;

  const { as: Target, ...targetProps } = linkProps(item);

  return (
    <motion.article
      className="legal-featured-card"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42 }}
    >
      <div className="legal-featured-image">
        <img src={item.image} alt={item.title} />
      </div>
      <div className="legal-featured-body">
        <div className="legal-meta-row">
          <span>{item.courtCategory || item.category}</span>
          <span>{item.source}</span>
          <span><CalendarDays size={14} /> {formatDate(item.publishDate)}</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary || "Open the complete source to read the latest legal development."}</p>
        <Target className="legal-primary-link" {...targetProps}>
          Read Full Article <ArrowRight size={16} />
        </Target>
      </div>
    </motion.article>
  );
}

function LegalContentPage({ category, court, title, breadcrumb = [], headerAction = null }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("latest");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [newCount, setNewCount] = useState(0);
  const [queuedItems, setQueuedItems] = useState(null);
  const currentIdsRef = useRef(new Set());

  const params = useMemo(() => ({
    category,
    court,
    search,
    sort,
  }), [category, court, search, sort]);

  async function loadContent({ silent = false } = {}) {
    if (!silent) {
      setError("");
    }

    console.log("before fetch", items?.length);

    try {
      const payload = await getLegalContent(params);
      const nextItems = dedupeByDocId(payload.items || []);
      console.log("after fetch", nextItems?.length);

      if (silent && currentIdsRef.current.size) {
        const unseen = nextItems.filter((item) => !currentIdsRef.current.has(item.docid || item.id || item.slug));
        if (unseen.length) {
          setQueuedItems(nextItems);
          setNewCount(unseen.length);
        }
      } else {
        currentIdsRef.current = new Set(nextItems.map((item) => item.docid || item.id || item.slug));
        setItems(nextItems);
        setMeta(payload.meta || null);
        writeCache(params, { items: nextItems, meta: payload.meta || null });
      }
    } catch (loadError) {
      if (!silent) {
        setError(loadError?.response?.data?.meta?.message || "Unable to load legal intelligence right now.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
    setNewCount(0);
    setQueuedItems(null);
    currentIdsRef.current = new Set();

    const cached = readCache(params);
    if (cached?.items?.length) {
      setItems(dedupeByDocId(cached.items));
      setMeta(cached.meta || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    loadContent();
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refreshMinutes = Math.min(Math.max(Number(meta?.refreshIntervalMinutes || 20), 15), 30);
    const timer = setInterval(() => {
      loadContent({ silent: true });
    }, refreshMinutes * 60 * 1000);

    return () => clearInterval(timer);
  }, [params, meta?.refreshIntervalMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageTitle = title || meta?.label || "Legal Intelligence";
  const visibleItems = items.slice(0, visibleCount);
  const featured = visibleItems[0] || null;
  const gridItems = visibleItems.slice(1);
  const showSkeleton = loading && !items.length;

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function showQueuedUpdates() {
    if (!queuedItems) return;

    const dedupedQueuedItems = dedupeByDocId(queuedItems);
    currentIdsRef.current = new Set(dedupedQueuedItems.map((item) => item.docid || item.id || item.slug));
    setItems(dedupedQueuedItems);
    setQueuedItems(null);
    setNewCount(0);
    setVisibleCount(initialVisibleCount);
  }

  return (
    <>
      <Navbar />
      <main className="legal-intelligence-page">
        <section className="legal-page-header">
          <nav className="legal-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {breadcrumb.map((crumb) => (
              crumb.href
                ? <Link key={crumb.label} to={crumb.href}>{crumb.label}</Link>
                : <span key={crumb.label}>{crumb.label}</span>
            ))}
            <span>{pageTitle}</span>
          </nav>

          <div className="legal-title-row">
            <div>
              <p className="legal-eyebrow">Live Legal Intelligence</p>
              <h1>{pageTitle}</h1>
              <p>{items.length} Article{items.length === 1 ? "" : "s"} • {relativeTime(meta?.updatedAt)}</p>
            </div>
            <div className="legal-header-actions">
              {headerAction ? (
                <Link to={headerAction.href} className="legal-action-link">
                  {headerAction.label}
                </Link>
              ) : null}
              <button type="button" className="legal-refresh-button" onClick={() => loadContent()}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>

          {meta?.sections?.length ? (
            <div className="legal-section-strip">
              {meta.sections.map((section) => <span key={section}>{section}</span>)}
            </div>
          ) : null}
        </section>

        <section className="legal-controls" aria-label="Legal content filters">
          <div className="legal-sort-tabs">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={sort === option.value ? "active" : ""}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form className="legal-search-form" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search legal updates"
            />
            <button type="submit">Search</button>
          </form>
        </section>

        <AnimatePresence>
          {newCount ? (
            <motion.button
              type="button"
              className="legal-new-updates"
              onClick={showQueuedUpdates}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              New legal updates available ({newCount})
            </motion.button>
          ) : null}
        </AnimatePresence>

        {showSkeleton ? <SkeletonGrid /> : null}

        {!showSkeleton && error ? (
          <div className="legal-state-card error">{error}</div>
        ) : null}

        {!showSkeleton && !error && !items.length ? (
          <div className="legal-state-card">
            <strong>No results found.</strong>
            <p>Try a broader search or refresh once the source feeds have new approved content.</p>
          </div>
        ) : null}

        {!showSkeleton && !error && items.length ? (
          <>
            <FeaturedArticle item={featured} />

            <section className="legal-news-grid">
              {gridItems.map((item, index) => (
                <ArticleCard key={item.uniqueKey || item.id || `${item.slug}-${index}`} item={item} index={index} />
              ))}
            </section>

            {visibleCount < items.length ? (
              <div className="legal-load-more-row">
                <button type="button" onClick={() => setVisibleCount((count) => count + 12)}>
                  Load More
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}

export default LegalContentPage;
