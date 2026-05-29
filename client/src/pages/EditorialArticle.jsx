import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { CalendarDays, CheckCircle2, Clock3, FolderOpen, Tags, UserRound, XCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import "../styles/article-pages.css";

const API = "http://localhost:5000";

function EditorialArticle() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("lawyers-times-auth-token") || "");
  const [article, setArticle] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [authError, setAuthError] = useState("");
  const [loginEmail, setLoginEmail] = useState((import.meta.env.VITE_ADMIN_EMAIL || "admin@lawyerstimes.com").toLowerCase());
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (!token) return;

    axios.get(`${API}/api/articles/admin/${articleId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        setArticle(response.data);
        setAdminNotes(response.data.adminNotes || "");
        setRejectionReason(response.data.rejectionReason || "");
      })
      .catch(() => setAuthError("Could not load article"));
  }, [token, articleId]);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      const response = await axios.post(`${API}/api/auth/login`, { email: loginEmail, password: loginPassword });
      if (response.data?.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      localStorage.setItem("lawyers-times-auth-token", response.data.token);
      setToken(response.data.token);
    } catch (error) {
      setAuthError(error?.response?.data?.message || error.message || "Login failed");
    }
  }

  async function saveAndApprove() {
    await axios.patch(`${API}/api/articles/admin/${articleId}/approve`, { adminNotes }, { headers: { Authorization: `Bearer ${token}` } });
    navigate("/admin/editorial");
  }

  async function saveAndReject() {
    await axios.patch(`${API}/api/articles/admin/${articleId}/reject`, { adminNotes, rejectionReason }, { headers: { Authorization: `Bearer ${token}` } });
    navigate("/admin/editorial");
  }

  if (!token) {
    return (
      <>
        <Navbar />
        <main className="editorial-page">
          <section className="editorial-login-shell">
            <div className="editorial-login-card">
              <p className="eyebrow">Admin Preview</p>
              <h1>Login to review this submission</h1>
              <form onSubmit={handleLogin} className="editorial-login-form">
                <label>Email<input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></label>
                <label>Password<input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></label>
                <button className="editorial-primary-button" type="submit">Continue</button>
              </form>
              {authError ? <p className="editorial-error">{authError}</p> : null}
            </div>
          </section>
        </main>
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Navbar />
        <main className="editorial-page">
          <div className="state-card">Loading article review...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="editorial-page">
        <section className="preview-shell">
          <div className="preview-header">
            <div>
              <p className="eyebrow">Article Preview</p>
              <h1>{article.title}</h1>
              <p>{article.author?.name} | {article.category} | {article.readTime}</p>
            </div>
            <Link to="/admin/editorial" className="editorial-secondary-button">Back to Dashboard</Link>
          </div>

          <div className="preview-grid">
            <motion.article className="preview-main-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              {article.featuredImage ? <img src={article.featuredImage} alt={article.title} /> : null}
              <div className="article-meta-row">
                <span className={`status-badge ${article.status}`}>{article.status}</span>
                <span className="article-pill muted"><CalendarDays size={14} /> Submitted {new Date(article.submissionDate).toLocaleString()}</span>
              </div>
              <div className="preview-details-list">
                <span><UserRound size={16} /> {article.author?.name || "Anonymous"}</span>
                <span><FolderOpen size={16} /> {article.category}</span>
                <span><Clock3 size={16} /> {article.readTime}</span>
                <span><Tags size={16} /> {article.tags?.length || 0} tags</span>
              </div>
              <div className="preview-content-body" dangerouslySetInnerHTML={{ __html: article.content }} />
              <div className="article-tag-row">
                {article.tags?.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </motion.article>

            <motion.aside className="preview-side-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <h3>Admin Notes</h3>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add editorial notes" rows={6} />
              <h3>Rejection Reason</h3>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Optional rejection reason" rows={4} />
              <div className="preview-actions">
                <button type="button" className="editorial-approve-button" onClick={saveAndApprove}><CheckCircle2 size={16} /> Approve</button>
                <button type="button" className="editorial-reject-button" onClick={saveAndReject}><XCircle size={16} /> Reject</button>
              </div>
            </motion.aside>
          </div>
        </section>
      </main>
    </>
  );
}

export default EditorialArticle;
