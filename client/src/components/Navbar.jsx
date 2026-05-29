import "../styles/navbar.css";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { CheckCircle2, Globe, Link2, Mail, Menu, Moon, Search, Sun, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import MegaMenuNavItem from "./MegaMenuNavItem";
import { HIGH_COURTS } from "../data/highCourts";
import { SUPREME_COURT } from "../data/supremeCourt";

const API = "http://localhost:5000";
const THEME_KEY = "lawyers-times-theme";
const NEWSLETTER_KEY = "lawyers-times-newsletter-emails";

const searchSuggestions = [
  "Supreme Court",
  "Delhi High Court",
  "Constitutional Law",
  "Latest Judgments",
];

function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchItems, setSearchItems] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSubscribeOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen || searchItems.length) return;

    async function loadSearchItems() {
      try {
        const [articlesResponse, courtsResponse, newsResponse, supremeResponse, legalNewsResponse, constitutionalResponse, judgmentsResponse, allahabadResponse, delhiResponse, bombayResponse, patnaResponse] = await Promise.allSettled([
          axios.get(`${API}/api/articles/public`),
          axios.get(`${API}/api/courts`),
          axios.get(`${API}/api/news`),
          axios.get(`${API}/api/legal/supreme`),
          axios.get(`${API}/api/legal/legalnews`),
          axios.get(`${API}/api/legal/constitutional`),
          axios.get(`${API}/api/legal/judgments`),
          axios.get(`${API}/api/legal/highcourt/allahabad`),
          axios.get(`${API}/api/legal/highcourt/delhi`),
          axios.get(`${API}/api/legal/highcourt/bombay`),
          axios.get(`${API}/api/legal/highcourt/patna`),
        ]);

        const articleItems = articlesResponse.status === "fulfilled"
          ? articlesResponse.value.data.map((article) => ({
              title: article.title,
              type: "articles",
              description: article.shortDescription || article.category,
              href: `/articles/${article.categorySlug}/${article.articleId}`,
            }))
          : [];

        const courtItems = courtsResponse.status === "fulfilled"
          ? courtsResponse.value.data.map((court) => ({
              title: court.name,
              type: "courts",
              description: "Court profile and updates",
              href: `/highcourt/${court.slug}`,
            }))
          : [];

        const newsItems = newsResponse.status === "fulfilled"
          ? newsResponse.value.data.map((news) => ({
              title: news.title,
              type: "legal news",
              description: news.description || news.category || "Legal news update",
              href: "/",
            }))
          : [];

        const legalResponses = [
          supremeResponse,
          legalNewsResponse,
          constitutionalResponse,
          judgmentsResponse,
          allahabadResponse,
          delhiResponse,
          bombayResponse,
          patnaResponse,
        ];

        const legalItems = legalResponses.flatMap((response, index) => {
          if (response.status !== "fulfilled") return [];

          const payload = response.value.data || {};
          const sectionItems = payload.items || [];
          return sectionItems.map((item) => ({
            title: item.title,
            type: item.category || "legal",
            description: item.summary || item.headline || item.court || "Live legal update",
            href: item.link || `/article/${encodeURIComponent(item.slug || item.docid)}?docid=${encodeURIComponent(item.docid || item.id || "")}`,
          }));
        });

        setSearchItems([...articleItems, ...courtItems, ...newsItems, ...legalItems]);
      } catch {
        setSearchItems([]);
      }
    }

    loadSearchItems();
  }, [searchOpen, searchItems.length]);

  const filteredResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    const items = searchItems.length ? searchItems : [];

    if (!term) {
      return items.slice(0, 8);
    }

    return items
      .filter((item) => `${item.title} ${item.type} ${item.description}`.toLowerCase().includes(term))
      .slice(0, 10);
  }, [query, searchItems]);

  function handleHomeClick(event) {
    setMobileOpen(false);

    if (location.pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  function handleSuggestionClick(suggestion) {
    setQuery(suggestion);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function handleSubscribe(event) {
    event.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      setNewsletterError("Please enter a valid email address.");
      setSubscribed(false);
      return;
    }

    const savedEmails = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) || "[]");
    if (!savedEmails.includes(email)) {
      savedEmails.push(email);
      localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(savedEmails));
    }

    setNewsletterError("");
    setSubscribed(true);
    setNewsletterEmail("");
  }

  return (
    <>

    <nav className="navbar">

      <div className="logo-section">

        <div className="logo-box">
          🏛
        </div>

        <div>

          <h2>Lawyers Times</h2>

          <p>
            India's Legal Intelligence Platform
          </p>

        </div>

      </div>


      <button
        type="button"
        className="nav-mobile-toggle"
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <ul className={`nav-links ${mobileOpen ? "is-open" : ""}`}>

        <li>

          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`} onClick={handleHomeClick}>
            Home
          </NavLink>

        </li>

        <MegaMenuNavItem
          label="Supreme Court"
          items={SUPREME_COURT}
          featuredItems={[]}
          itemHrefBuilder={(item) => `/supreme-court/${item.slug}`}
          onNavigate={() => setMobileOpen(false)}
        />

        <MegaMenuNavItem
          label="High Courts"
          items={HIGH_COURTS}
          featuredItems={[
            {
              name: "All High Courts",
              slug: "all-high-courts",
              href: "/highcourts",
              isFeatured: true,
            },
          ]}
          itemHrefBuilder={(court) => `/highcourt/${court.slug}`}
          onNavigate={() => setMobileOpen(false)}
        />

        <li>
          <NavLink to="/judgments" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            Judgments
          </NavLink>
        </li>
        <li>
          <NavLink to="/legal-news" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            Legal News
          </NavLink>
        </li>
        <li>
          <NavLink to="/constitutional-law" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            Constitutional Law
          </NavLink>
        </li>
        <li>
          <NavLink to="/articles" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            Articles
          </NavLink>
        </li>
        <li>
          <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            Contact
          </NavLink>
        </li>

      </ul>


      <div className="nav-icons">

        <button type="button" className="nav-icon-button" aria-label="Open search" onClick={() => setSearchOpen(true)}>
          <Search size={24} />
        </button>

        <button type="button" className="nav-icon-button" aria-label="Toggle color theme" onClick={toggleTheme}>
          {theme === "dark" ? <Moon size={24} /> : <Sun size={24} />}
        </button>

        <button type="button" onClick={() => setSubscribeOpen(true)}>

          Subscribe

        </button>

      </div>

    </nav>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            className="nav-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={closeSearch}
          >
            <motion.section
              className="search-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Search Lawyers Times"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="modal-topline">
                <div>
                  <span>Search</span>
                  <h2>Find legal intelligence</h2>
                </div>
                <button type="button" className="modal-close-button" aria-label="Close search" onClick={closeSearch}>
                  <X size={20} />
                </button>
              </div>

              <div className="search-input-shell">
                <Search size={24} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search judgments, courts, articles..."
                />
              </div>

              <div className="search-suggestions">
                {searchSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="search-results-grid">
                {filteredResults.length ? filteredResults.map((item) => (
                  <NavLink key={`${item.type}-${item.title}-${item.href}`} to={item.href} className="search-result-card" onClick={closeSearch}>
                    <span>{item.type}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </NavLink>
                )) : (
                  <div className="search-empty-state">No matching results found.</div>
                )}
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {subscribeOpen ? (
          <motion.div
            className="nav-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setSubscribeOpen(false)}
          >
            <motion.section
              className="subscribe-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Newsletter subscription"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="modal-topline">
                <div>
                  <span>Newsletter</span>
                  <h2>Stay Updated with Legal Intelligence</h2>
                </div>
                <button type="button" className="modal-close-button" aria-label="Close subscribe modal" onClick={() => setSubscribeOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <p className="subscribe-copy">Get latest judgments and legal updates.</p>

              {subscribed ? (
                <motion.div className="subscribe-success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <CheckCircle2 size={22} />
                  Subscribed Successfully
                </motion.div>
              ) : null}

              <form className="subscribe-form" onSubmit={handleSubscribe}>
                <label>
                  Email
                  <div>
                    <Mail size={18} />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(event) => {
                        setNewsletterEmail(event.target.value);
                        setNewsletterError("");
                      }}
                      placeholder="Enter email"
                    />
                  </div>
                </label>
                <button type="submit">Subscribe</button>
              </form>

              {newsletterError ? <p className="modal-error">{newsletterError}</p> : null}

              <div className="modal-social-row">
                <Globe size={18} />
                <Link2 size={18} />
                <Mail size={18} />
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>

  );

}

export default Navbar;
