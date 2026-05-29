import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock3, Eye, FileText, Search, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import "../styles/article-pages.css";

const API = "http://localhost:5000";
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@lawyerstimes.com").toLowerCase();

const tabs = [
  { value: "pending", label: "Pending Articles" },
  { value: "approved", label: "Approved Articles" },
  { value: "rejected", label: "Rejected Articles" },
  { value: "draft", label: "Drafts" },
];

const categories = [
  { value: "all", label: "All Categories" },
  { value: "supreme-court", label: "Supreme Court" },
  { value: "high-court", label: "High Court" },
  { value: "constitutional-law", label: "Constitutional Law" },
  { value: "general", label: "General" },
  { value: "legal-news", label: "Legal News" },
  { value: "case-analysis", label: "Case Analysis" },
];

function EditorialDashboard() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("lawyers-times-auth-token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("Admin Editor");
  const [authEmail, setAuthEmail] = useState(ADMIN_EMAIL);
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({ pendingCount: 0, approvedCount: 0, rejectedCount: 0, draftCount: 0, todaySubmissions: 0 });
  const [error, setError] = useState("");

  async function loadAdminData(authToken) {
    setLoading(true);

    try {
      const [meResponse, statsResponse, articlesResponse] = await Promise.all([
        axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get(`${API}/api/articles/admin/stats`, { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get(`${API}/api/articles/admin`, {
          headers: { Authorization: `Bearer ${authToken}` },
          params: {
            status: activeTab,
            category,
            author,
            query: search,
            date,
          },
        }),
      ]);

      if (meResponse.data?.user?.role !== "admin") {
        throw new Error("Admin access required");
      }

      setUser(meResponse.data.user);
      setStats(statsResponse.data);
      setArticles(articlesResponse.data);
      setError("");
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || "Unable to load dashboard");
      setUser(null);
      if (loadError?.response?.status === 401 || loadError?.response?.status === 403) {
        localStorage.removeItem("lawyers-times-auth-token");
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    loadAdminData(token);
  }, [token, activeTab, category, author, search, date]);

  const statusCards = useMemo(() => [
    { label: "Pending Count", value: stats.pendingCount, status: "pending", icon: Clock3 },
    { label: "Approved Count", value: stats.approvedCount, status: "approved", icon: CheckCircle2 },
    { label: "Rejected Count", value: stats.rejectedCount, status: "rejected", icon: XCircle },
    { label: "Drafts", value: stats.draftCount, status: "draft", icon: FileText },
    { label: "Today's Submissions", value: stats.todaySubmissions, status: "today", icon: CalendarDays },
  ], [stats]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!authEmail.trim() || !authPassword.trim() || (authMode === "register" && !authName.trim())) {
      setError("Email, password and admin name are required.");
      return;
    }

    setAuthSubmitting(true);

    try {
      const response = authMode === "register"
        ? await axios.post(`${API}/api/auth/register`, {
            name: authName,
            email: authEmail,
            password: authPassword,
          })
        : await axios.post(`${API}/api/auth/login`, {
            email: authEmail,
            password: authPassword,
          });

      if (response.data?.user?.role !== "admin") {
        throw new Error("Admin access required");
      }

      localStorage.setItem("lawyers-times-auth-token", response.data.token);
      setToken(response.data.token);
      await loadAdminData(response.data.token);
    } catch (loginError) {
      setError(loginError?.response?.data?.message || loginError.message || "Login failed");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function updateArticle(articleId, action, payload = {}) {
    const endpoint = action === "approve" ? "approve" : "reject";
    await axios.patch(`${API}/api/articles/admin/${articleId}/${endpoint}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAdminData(token);
  }

  if (token && loading && !user) {
    return (
      <>
        <Navbar />
        <main className="editorial-page">
          <div className="state-card">Loading editorial access...</div>
        </main>
      </>
    );
  }

  if (!token || !user) {
    return (
      <>
        <Navbar />
        <main className="editorial-page">
          <section className="editorial-login-shell">
            <motion.div className="editorial-login-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="eyebrow">Admin Editorial Dashboard</p>
              <h1>Login to manage approvals</h1>
              <div className="auth-toggle editorial-auth-toggle">
                <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>
                  Login
                </button>
                <button className={authMode === "register" ? "active" : ""} type="button" onClick={() => setAuthMode("register")}>
                  Create Admin
                </button>
              </div>
              <form onSubmit={handleLogin} className="editorial-login-form">
                {authMode === "register" ? (
                  <label>
                    Admin Name
                    <input value={authName} onChange={(event) => setAuthName(event.target.value)} required />
                  </label>
                ) : null}
                <label>
                  Email
                  <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
                </label>
                <label>
                  Password
                  <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
                </label>
                <button className="editorial-primary-button" type="submit" disabled={authSubmitting}>
                  {authSubmitting ? "Checking Access..." : authMode === "register" ? "Create Admin Account" : "Access Dashboard"}
                </button>
              </form>
              {error ? <p className="editorial-error">{error}</p> : null}
              <p className="editorial-subtext">
                Admin email default: {ADMIN_EMAIL}. If it is not created yet, use Create Admin and set a password.
              </p>
            </motion.div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="editorial-page">
        <section className="editorial-hero">
          <div>
            <p className="eyebrow">Editorial Ops</p>
            <h1>Editorial Approval Dashboard</h1>
            <p>Manage pending submissions, approve or reject articles, and publish approved content directly into public category listings.</p>
          </div>
          <div className="editorial-hero-actions">
            <Link to="/articles" className="editorial-secondary-button">Open Publishing Flow</Link>
          </div>
        </section>

        <div className="editorial-stats-grid">
          {statusCards.map((card, index) => {
            const Icon = card.icon;
            return (
            <motion.button
              key={card.label}
              type="button"
              className={`editorial-stat-card ${card.status}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => card.status !== "today" && setActiveTab(card.status)}
            >
              <span className="editorial-stat-icon"><Icon size={18} /></span>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </motion.button>
            );
          })}
        </div>

        <section className="editorial-controls-card">
          <div className="editorial-tabs">
            {tabs.map((tab) => (
              <button key={tab.value} type="button" className={activeTab === tab.value ? "active" : ""} onClick={() => setActiveTab(tab.value)}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="editorial-filters">
            <label><Search size={14} /> <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by article title" /></label>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              Author
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Filter by author" />
            </label>
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
        </section>

        {loading ? (
          <div className="state-card">Loading editorial records...</div>
        ) : error ? (
          <div className="state-card error-state">{error}</div>
        ) : articles.length ? (
          <section className="editorial-list-section">
            <div className="editorial-section-title">
              <h2>{tabs.find((tab) => tab.value === activeTab)?.label}</h2>
              <span>{articles.length} record{articles.length === 1 ? "" : "s"}</span>
            </div>
            <div className="editorial-list-grid">
            {articles.map((article, index) => (
              <motion.article key={article.articleId} className="editorial-article-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                {article.featuredImage ? <img src={article.featuredImage} alt={article.title} /> : <div className="article-placeholder">No image</div>}
                <div className="editorial-card-content">
                  <div className="editorial-card-topline">
                    <div className={`status-badge ${article.status}`}>{article.status}</div>
                    <span>{article.articleId}</span>
                  </div>
                  <h3>{article.title}</h3>
                  <p>{article.shortDescription}</p>
                  <div className="editorial-meta-row">
                    <span>{article.author?.name}</span>
                    <span>{article.category}</span>
                    <span><CalendarDays size={14} /> {new Date(article.submissionDate).toLocaleDateString()}</span>
                    <span><Clock3 size={14} /> {article.readTime}</span>
                  </div>
                  <div className="editorial-card-actions">
                    <button type="button" className="editorial-tertiary-button" onClick={() => navigate(`/admin/editorial/articles/${article.articleId}`)}><Eye size={16} /> Preview</button>
                    {article.status === "pending" ? (
                      <>
                        <button type="button" className="editorial-approve-button" onClick={() => updateArticle(article.articleId, "approve")}><CheckCircle2 size={16} /> Approve</button>
                        <button type="button" className="editorial-reject-button" onClick={() => updateArticle(article.articleId, "reject", { rejectionReason: prompt("Rejection reason (optional)") || "" })}><XCircle size={16} /> Reject</button>
                      </>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            ))}
            </div>
          </section>
        ) : (
          <div className="state-card">No articles match the current filters.</div>
        )}
      </main>
    </>
  );
}

export default EditorialDashboard;
