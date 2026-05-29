import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, CalendarDays, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { buildArticleScopeLabel, getArticleImage } from "../utils/articleMedia";
import "../styles/article-pages.css";

const API = "http://localhost:5000";
const CACHE_TTL_MS = 10 * 60 * 1000;

const CATEGORY_LABELS = {
  "high-court": "High Court",
  "constitutional-law": "Constitutional Law",
  general: "General",
  "legal-news": "Legal News",
  "supreme-court": "Supreme Court",
  "case-analysis": "Case Analysis",
};

function ArticleCategory() {
  const { categorySlug } = useParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const label = useMemo(() => CATEGORY_LABELS[categorySlug] || categorySlug?.replace(/-/g, " "), [categorySlug]);

  const cacheKey = useMemo(() => `lawyers-times-article-category:${categorySlug || "all"}`, [categorySlug]);

  function readCache() {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed?.storedAt || Date.now() - parsed.storedAt > CACHE_TTL_MS) return null;

      return parsed.data || null;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ storedAt: Date.now(), data }));
    } catch {
      // Ignore storage errors.
    }
  }

  useEffect(() => {
    const cached = readCache();
    if (cached?.length) {
      setArticles(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    console.log("before fetch", articles?.length);

    axios
      .get(`${API}/api/articles/public/category/${categorySlug}`)
      .then((response) => {
        const nextArticles = Array.isArray(response.data) ? response.data : [];
        console.log("after fetch", nextArticles?.length);
        if (nextArticles.length) {
          setArticles(nextArticles);
          writeCache(nextArticles);
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setLoading(false));
  }, [categorySlug, cacheKey]);

  const showSkeleton = loading && !articles.length;

  return (
    <>
      <Navbar />
      <main className="article-category-page">
        <section className="article-category-hero">
          <div>
            <p className="eyebrow">Published Articles</p>
            <h1>{label}</h1>
            <p>Only approved editorial content is shown here. Pending and rejected submissions remain hidden from the public.</p>
          </div>
          <Link to="/articles" className="category-back-button">Publish Your Article</Link>
        </section>

        {showSkeleton ? (
          <div className="state-card">Loading approved articles...</div>
        ) : articles.length ? (
          <div className="category-article-grid">
            {articles.map((article, index) => (
              <motion.article
                key={article.articleId}
                className="category-article-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                whileHover={{ y: -6 }}
              >
                <img src={getArticleImage({ ...article, categorySlug })} alt={article.title} />
                <div className="category-article-content">
                  <div className="article-meta-row">
                    <span className="article-pill">{article.category}</span>
                    <span className="article-pill muted"><CalendarDays size={14} /> {new Date(article.publishedAt || article.submissionDate).toLocaleDateString()}</span>
                    <span className="article-pill muted"><Clock3 size={14} /> {article.readTime}</span>
                  </div>
                  <h2>{article.title}</h2>
                  <p>{article.shortDescription}</p>
                  <span className="article-scope-label">{buildArticleScopeLabel({ ...article, categorySlug })}</span>
                  <div className="article-tag-row">
                    {article.tags?.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <Link
                    to={`/articles/${article.categorySlug}/${article.articleId}?id=${encodeURIComponent(article.articleId)}&docid=${encodeURIComponent(article.articleId)}`}
                    state={{ fromCategory: article.categorySlug, fromList: true, article }}
                    className="article-read-link"
                  >
                    Read more <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="state-card">No approved articles found for this category yet.</div>
        )}
      </main>
    </>
  );
}

export default ArticleCategory;
