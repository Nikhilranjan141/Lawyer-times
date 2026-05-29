import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Crown,
  FilePenLine,
  Code2,
  Globe,
  Heading1,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Quote,
  Sparkles,
  Upload,
  Bold,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { analyzeArticle, createReviewSignature } from "../services/articleReviewEngine";
import "../styles/articles.css";

const API = "http://localhost:5000";

const STORAGE_KEY = "lawyers-times-article-draft";

const steps = [
  "Publish Your Article",
  "Login / Register",
  "Select Section",
  "Write Content",
  "Request For Approval",
];

const sectionCards = [
  {
    title: "Constitutional Law",
    description: "Constitutional rights and legal matters",
    icon: Crown,
  },
  {
    title: "High Court",
    description: "State High Court news and judgments",
    icon: FilePenLine,
  },
  {
    title: "General",
    description: "General legal discussions",
    icon: Globe,
  },
  {
    title: "Supreme Court",
    description: "Landmark judgments and live updates",
    icon: ShieldCheck,
  },
  {
    title: "Legal News",
    description: "Timely updates from across India",
    icon: BookOpenText,
  },
  {
    title: "Case Analysis",
    description: "Detailed legal and procedural analysis",
    icon: Sparkles,
  },
];

const socialOptions = [
  { label: "Google", icon: Globe },
  { label: "GitHub", icon: Code2 },
];

const aiReviewSteps = [
  "Checking title...",
  "Checking formatting...",
  "Checking grammar...",
  "Checking readability...",
  "Checking legal structure...",
  "Checking consistency...",
  "Checking content quality...",
];

const scoreLabels = {
  grammar: "Grammar",
  formatting: "Formatting",
  legalQuality: "Legal Quality",
  readability: "Readability",
  seo: "SEO",
  overall: "Overall",
};

function useAutosave(callback, delay, dependencies) {
  useEffect(() => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}

function stepProgress(currentStep) {
  return ((currentStep - 1) / (steps.length - 1)) * 100;
}

function Articles() {
  const [currentStep, setCurrentStep] = useState(1);
  const [authMode, setAuthMode] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem("lawyers-times-auth-token") || "");
  const [selectedSection, setSelectedSection] = useState("Supreme Court");
  const [articleTitle, setArticleTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [tags, setTags] = useState("constitutional, legal analysis");
  const [editorHtml, setEditorHtml] = useState("<p>Start writing your article here...</p>");
  const [authorEmail, setAuthorEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [articleId, setArticleId] = useState("");
  const [featuredImageData, setFeaturedImageData] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [draftStatus, setDraftStatus] = useState("Saved just now");
  const [wordCount, setWordCount] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(3);
  const [authError, setAuthError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [reviewStatus, setReviewStatus] = useState("idle");
  const [reviewStepIndex, setReviewStepIndex] = useState(0);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewSignature, setReviewSignature] = useState("");
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const summaryRef = useRef(null);
  const reviewRef = useRef(null);
  const previewRef = useRef(null);
  const introRef = useRef(null);
  const introInView = useInView(introRef, { once: true, margin: "-80px" });

  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft);
      setCurrentStep(parsed.currentStep || 1);
      setAuthMode(parsed.authMode || "login");
      setIsAuthenticated(Boolean(parsed.isAuthenticated));
      setAuthToken(parsed.authToken || localStorage.getItem("lawyers-times-auth-token") || "");
      setSelectedSection(parsed.selectedSection || "Supreme Court");
      setArticleTitle(parsed.articleTitle || "");
      setShortDescription(parsed.shortDescription || "");
      setTags(parsed.tags || "constitutional, legal analysis");
      setEditorHtml(parsed.editorHtml || "<p>Start writing your article here...</p>");
      setAuthorEmail(parsed.authorEmail || "");
      setProfileName(parsed.profileName || "");
      setApprovalConfirmed(Boolean(parsed.approvalConfirmed));
      setArticleId(parsed.articleId || "");
      setFeaturedImageData(parsed.featuredImageData || "");
      setImagePreview(parsed.imagePreview || "");
      setSelectedSectionIndex(parsed.selectedSectionIndex ?? 3);
    } catch (error) {
      console.error("Could not restore draft", error);
    }
  }, []);

  useAutosave(() => {
    const payload = {
      currentStep,
      authMode,
      isAuthenticated,
      selectedSection,
      articleTitle,
      shortDescription,
      tags,
      editorHtml,
      authorEmail,
      profileName,
      approvalConfirmed,
      authToken,
      articleId,
      featuredImageData,
      imagePreview,
      selectedSectionIndex,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (isAuthenticated && currentStep >= 4 && !submitted) {
      persistDraft(editorHtml);
    } else {
      setDraftStatus("Draft saved");
    }
  }, 2500, [
    currentStep,
    authMode,
    isAuthenticated,
    selectedSection,
    articleTitle,
    shortDescription,
    tags,
    editorHtml,
    authorEmail,
    profileName,
    approvalConfirmed,
    authToken,
    articleId,
    featuredImageData,
    imagePreview,
    selectedSectionIndex,
    submitted,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDraftStatus((current) => (current === "Draft saved" ? "Saved a moment ago" : "Draft saved"));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authToken) return;

    axios
      .get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .then((response) => {
        setNotifications(response.data?.notifications || []);
        setProfileName(response.data?.user?.name || profileName);
      })
      .catch(() => {
        setNotifications([]);
      });
  }, [authToken]);

  useEffect(() => {
    const text = contentRef.current?.innerText || editorHtml.replace(/<[^>]*>/g, " ");
    const trimmedText = text.trim();
    const count = trimmedText ? trimmedText.split(/\s+/).length : 0;
    setWordCount(count);
  }, [editorHtml]);

  const readTime = useMemo(() => {
    const minutes = Math.max(1, Math.ceil(wordCount / 220));
    return `${minutes} min read`;
  }, [wordCount]);

  const currentReviewSignature = useMemo(() => createReviewSignature({
    title: articleTitle,
    shortDescription,
    content: editorHtml,
    category: selectedSection,
    tags,
  }), [articleTitle, shortDescription, editorHtml, selectedSection, tags]);

  const reviewIsFresh = reviewResult && reviewSignature === currentReviewSignature;
  const canSubmitForApproval = approvalConfirmed && reviewIsFresh && reviewResult?.canSubmit;

  function focusContent() {
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }

  function execFormatting(command, value = null) {
    focusContent();
    document.execCommand(command, false, value);
    setEditorHtml(contentRef.current?.innerHTML || "");
  }

  function handleEditorInput() {
    setEditorHtml(contentRef.current?.innerHTML || "");
  }

  function scrollToIssue(target) {
    const targetMap = {
      title: titleRef,
      summary: summaryRef,
      editor: contentRef,
      review: reviewRef,
    };

    const element = targetMap[target]?.current || contentRef.current;
    element?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (target === "editor") {
      contentRef.current?.focus();
    }
  }

  async function runAiReview() {
    setSubmissionError("");
    setReviewStatus("analyzing");
    setReviewResult(null);
    setReviewStepIndex(0);
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    for (let index = 0; index < aiReviewSteps.length; index += 1) {
      setReviewStepIndex(index);
      await new Promise((resolve) => setTimeout(resolve, 430));
    }

    const result = analyzeArticle({
      title: articleTitle,
      shortDescription,
      content: editorHtml,
      category: selectedSection,
      tags,
    });

    setReviewResult(result);
    setReviewSignature(currentReviewSignature);
    setReviewStatus("complete");
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setImagePreview(result);
      setFeaturedImageData(result);
    };
    reader.readAsDataURL(file);
  }

  async function persistDraft(nextContent = editorHtml) {
    if (!isAuthenticated || !authToken || currentStep < 4 || submitted) {
      return;
    }

    try {
      const response = await axios.post(
        `${API}/api/articles/draft`,
        {
          articleId,
          title: articleTitle,
          shortDescription,
          content: nextContent,
          featuredImage: featuredImageData || imagePreview,
          category: selectedSection,
          tags,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data?.articleId) {
        setArticleId(response.data.articleId);
        setDraftStatus("Draft saved to dashboard");
      }
    } catch (error) {
      setDraftStatus("Draft saved locally");
    }
  }

  function goNext() {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!isAuthenticated) return;
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function goToStep(stepNumber) {
    if (stepNumber > 2 && !isAuthenticated) {
      setCurrentStep(2);
      return;
    }

    setCurrentStep(stepNumber);
  }

  function handleAuthenticate() {
    if (!authorEmail || !password) return;

    setAuthError("");

    const request = authMode === "register"
      ? axios.post(`${API}/api/auth/register`, {
          name: profileName || authorEmail.split("@")[0],
          email: authorEmail,
          password,
        })
      : axios.post(`${API}/api/auth/login`, {
          email: authorEmail,
          password,
        });

    request
      .then((response) => {
        setIsAuthenticated(true);
        setAuthToken(response.data.token);
        localStorage.setItem("lawyers-times-auth-token", response.data.token);
        setProfileName(response.data.user?.name || profileName);
        setCurrentStep(3);
      })
      .catch((error) => {
        setAuthError(error?.response?.data?.message || "Authentication failed");
      });
  }

  async function handleSubmitApproval(event) {
    event.preventDefault();
    if (!canSubmitForApproval) {
      setSubmissionError("Please pass AI article review before submission.");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/api/articles/submit`,
        {
          articleId,
          title: articleTitle,
          shortDescription,
          content: editorHtml,
          featuredImage: featuredImageData || imagePreview,
          category: selectedSection,
          tags,
          authorName: profileName,
          authorEmail,
          submissionDate: new Date().toISOString(),
          status: "pending",
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setArticleId(response.data.articleId);
      setSubmitted(true);
      setSubmissionError("");
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      setSubmissionError(error?.response?.data?.message || "Could not submit article");
    }
  }

  return (
    <>
      <Navbar />

      <main className="articles-workflow">
        <div className="workflow-shell">
          <motion.div
            ref={introRef}
            className="workflow-progress-card"
            initial={{ opacity: 0, y: 20 }}
            animate={introInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45 }}
          >
            <div className="workflow-progress-header">
              <div>
                <p className="workflow-eyebrow">Publish Your Article</p>
                <h1>Publish Your Legal Article</h1>
              </div>
              <div className="workflow-step-count">
                Step {Math.min(currentStep, 5)} of 5
              </div>
            </div>

            <p className="workflow-description">
              Share legal insights, court analysis, judgments, constitutional opinions, and legal news with India&apos;s legal community.
            </p>

            <div className="workflow-bar" aria-label="Publishing progress bar">
              <motion.div
                className="workflow-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${stepProgress(currentStep)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            <div className="workflow-stepper">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                const isComplete = currentStep > stepNumber;

                return (
                  <button
                    key={step}
                    type="button"
                    className={`workflow-step-pill ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`}
                    onClick={() => goToStep(stepNumber)}
                  >
                    <span>{stepNumber}</span>
                    <strong>{step}</strong>
                  </button>
                );
              })}
            </div>

            {notifications.length ? (
              <div className="workflow-notifications">
                <strong>Your notifications</strong>
                <div className="notification-list">
                  {notifications.slice(0, 3).map((notification) => (
                    <div key={notification._id} className={`notification-item ${notification.type}`}>
                      <span className="notification-title">{notification.articleTitle}</span>
                      <p>{notification.message}{notification.reason ? ` ${notification.reason}` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>

          <div className="workflow-stage-card">
            <AnimatePresence mode="wait">
              {!submitted && currentStep === 1 && (
                <motion.section
                  key="publish-intro"
                  className="workflow-step-grid workflow-intro-grid"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="glass-panel intro-copy-panel">
                    <span className="workflow-badge">LIVE LEGAL PUBLISHING</span>
                    <h2>Publish Your Legal Article</h2>
                    <p>
                      Build a premium article submission flow designed for legal professionals, researchers, and editorial contributors.
                    </p>

                    <div className="intro-actions">
                      <button type="button" className="primary-action" onClick={goNext}>
                        Continue Publishing <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel intro-visual-panel">
                    <div className="intro-visual-frame">
                      <div className="intro-glow" />
                      <div className="intro-visual-content">
                        <FilePenLine size={54} />
                        <h3>Editorial-grade publishing workflow</h3>
                        <p>Guided steps, rich editor, approval review, and smooth progress transitions.</p>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {!submitted && currentStep === 2 && (
                <motion.section
                  key="auth-step"
                  className="workflow-step-grid auth-grid"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="glass-panel auth-panel">
                    <div className="panel-heading">
                      <p className="workflow-badge">Step 2 of 5</p>
                      <h2>Login or Create Account</h2>
                    </div>

                    <div className="auth-toggle">
                      <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>
                        Login
                      </button>
                      <button className={authMode === "register" ? "active" : ""} type="button" onClick={() => setAuthMode("register")}>
                        Register
                      </button>
                    </div>

                    <div className="social-login-row">
                      {socialOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button key={option.label} type="button" className="social-login-button">
                            <Icon size={16} /> {option.label}
                          </button>
                        );
                      })}
                    </div>

                    <form className="auth-form" onSubmit={(event) => { event.preventDefault(); handleAuthenticate(); }}>
                      {authMode === "register" && (
                        <label>
                          Full Name
                          <input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Enter your full name" />
                        </label>
                      )}

                      <label>
                        Email
                        <input type="email" value={authorEmail} onChange={(event) => setAuthorEmail(event.target.value)} placeholder="Enter email" />
                      </label>

                      <label>
                        Password
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
                      </label>

                      <div className="auth-row">
                        <label className="checkbox-row">
                          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                          Remember me
                        </label>
                        <button type="button" className="text-button">Forgot password?</button>
                      </div>

                      <button type="submit" className="primary-action auth-submit">
                        {authMode === "login" ? "Login and Continue" : "Create Account"}
                      </button>
                    </form>

                    {authError ? <p className="error-inline">{authError}</p> : null}

                    {isAuthenticated && <p className="success-inline">Authentication complete. You can continue to the next step.</p>}
                  </div>

                  <div className="side-stack">
                    <div className="glass-panel side-note-panel">
                      <ShieldCheck size={24} />
                      <h3>Legal publishing access</h3>
                      <p>Authentication ensures your article enters the editorial review pipeline securely.</p>
                    </div>
                  </div>
                </motion.section>
              )}

              {!submitted && currentStep === 3 && (
                <motion.section
                  key="category-step"
                  className="workflow-step-grid category-grid"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="section-main-panel">
                    <div className="panel-heading">
                      <p className="workflow-badge">Step 3 of 5</p>
                      <h2>Select Article Category</h2>
                    </div>

                    <div className="section-card-grid">
                      {sectionCards.map((section, index) => {
                        const Icon = section.icon;
                        const active = selectedSectionIndex === index;

                        return (
                          <button
                            key={section.title}
                            type="button"
                            className={`category-card ${active ? "active" : ""}`}
                            onClick={() => {
                              setSelectedSection(section.title);
                              setSelectedSectionIndex(index);
                            }}
                          >
                            <span className="category-icon"><Icon size={18} /></span>
                            <strong>{section.title}</strong>
                            <p>{section.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.section>
              )}

              {!submitted && currentStep === 4 && (
                <motion.section
                  key="content-step"
                  className="workflow-step-grid content-grid"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="section-main-panel">
                    <div className="panel-heading">
                      <p className="workflow-badge">Step 4 of 5</p>
                      <h2>Write Your Article</h2>
                    </div>

                    <div className="content-form-grid">
                      <label>
                        Article Title
                        <input ref={titleRef} value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} placeholder="Enter article title" />
                      </label>

                      <label>
                        Short Description
                        <textarea ref={summaryRef} value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} placeholder="Brief article summary" rows={4} />
                      </label>

                      <label>
                        Featured Image Upload
                        <div className="upload-row">
                          <label className="upload-button">
                            <Upload size={16} /> Upload Image
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                          </label>
                          {imagePreview ? <span className="upload-hint">Image selected</span> : <span className="upload-hint">No image selected</span>}
                        </div>
                      </label>

                      <label>
                        Tags
                        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="constitutional, legal analysis" />
                      </label>
                    </div>

                    <div className="editor-shell">
                      <div className="editor-toolbar">
                        <button type="button" onClick={() => execFormatting("bold")}><Bold size={16} /></button>
                        <button type="button" onClick={() => execFormatting("italic")}><Italic size={16} /></button>
                        <button type="button" onClick={() => execFormatting("formatBlock", "H2")}><Heading1 size={16} /></button>
                        <button type="button" onClick={() => execFormatting("insertUnorderedList")}><List size={16} /></button>
                        <button type="button" onClick={() => execFormatting("formatBlock", "BLOCKQUOTE")}><Quote size={16} /></button>
                        <button type="button" onClick={() => execFormatting("createLink", prompt("Enter link URL") || "")}><Link2 size={16} /></button>
                        <button type="button" onClick={() => execFormatting("insertImage", prompt("Enter image URL") || "")}><ImageIcon size={16} /></button>
                        <div className="editor-metrics">
                          <span>{wordCount} words</span>
                          <span>{readTime}</span>
                        </div>
                      </div>

                      <div className="editor-preview-grid">
                        <div className="editor-panel">
                          <label className="editor-label">Rich Text Editor</label>
                          <div
                            ref={contentRef}
                            className="article-editor"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            dangerouslySetInnerHTML={{ __html: editorHtml }}
                          />
                          <p className="draft-status">Auto-save: {draftStatus}</p>
                        </div>

                        <motion.div ref={previewRef} className="preview-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                          <label className="editor-label">Live Preview</label>
                          <div className="preview-card">
                            {imagePreview ? <img src={imagePreview} alt="Preview" /> : <div className="preview-placeholder">Featured image preview</div>}
                            <h3>{articleTitle || "Your article title appears here"}</h3>
                            <p>{shortDescription || "Your short description appears here."}</p>
                            <div
                              className="preview-content"
                              dangerouslySetInnerHTML={{ __html: editorHtml }}
                            />
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {!submitted && currentStep === 5 && (
                <motion.section
                  key="approval-step"
                  className="workflow-step-grid approval-grid"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                >
                  <form className="section-main-panel" onSubmit={handleSubmitApproval}>
                    <div className="panel-heading">
                      <p className="workflow-badge">Step 5 of 5</p>
                      <h2>Request For Approval</h2>
                    </div>

                    <div className="approval-preview-grid">
                      <div className="approval-summary-panel">
                        <h3>Selected Category</h3>
                        <p>{selectedSection}</p>
                        <h3>Title</h3>
                        <p>{articleTitle || "Untitled article"}</p>
                        <h3>Summary</h3>
                        <p>{shortDescription || "No summary added yet."}</p>
                      </div>

                      <div className="approval-content-panel">
                        <h3>Preview</h3>
                        {imagePreview ? <img src={imagePreview} alt="Article preview" /> : <div className="approval-image-placeholder">Preview image will appear here</div>}
                        <div className="approval-content" dangerouslySetInnerHTML={{ __html: editorHtml }} />
                      </div>
                    </div>

                    <section className="ai-review-panel" ref={reviewRef}>
                      <div className="ai-review-header">
                        <div>
                          <p className="workflow-badge">AI Editorial Assistant</p>
                          <h3>Article Review</h3>
                          <p>Run AI review before sending this article to the editorial approval queue.</p>
                        </div>
                        {reviewResult && reviewIsFresh ? (
                          <span className={`article-health ${reviewResult.health.toLowerCase().replace(/\s+/g, "-")}`}>
                            {reviewResult.health}
                          </span>
                        ) : null}
                      </div>

                      {reviewStatus === "analyzing" ? (
                        <motion.div className="ai-analysis-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                          <div className="ai-spinner" />
                          <strong>Analyzing article...</strong>
                          <p>{aiReviewSteps[reviewStepIndex]}</p>
                          <div className="ai-progress-track">
                            <motion.div
                              className="ai-progress-fill"
                              animate={{ width: `${((reviewStepIndex + 1) / aiReviewSteps.length) * 100}%` }}
                              transition={{ duration: 0.28 }}
                            />
                          </div>
                        </motion.div>
                      ) : null}

                      {reviewResult ? (
                        <motion.div className="ai-review-results" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                          {!reviewIsFresh ? (
                            <div className="ai-warning">
                              <AlertTriangle size={18} />
                              Article changed after review. Re-run AI review before submission.
                            </div>
                          ) : null}

                          <div className="ai-score-grid">
                            {Object.entries(reviewResult.scores).map(([key, value]) => (
                              <div key={key} className={`ai-score-card ${key === "overall" ? "overall" : ""}`}>
                                <motion.div
                                  className="score-ring"
                                  style={{ "--score": value }}
                                  initial={{ scale: 0.92, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.28 }}
                                >
                                  <span>{value}</span>
                                </motion.div>
                                <strong>{scoreLabels[key]}</strong>
                                <p>{value}/100</p>
                              </div>
                            ))}
                          </div>

                          <div className="ai-review-summary">
                            <div>
                              <span>{reviewResult.summary.wordCount}</span>
                              <p>Words</p>
                            </div>
                            <div>
                              <span>{reviewResult.summary.paragraphCount}</span>
                              <p>Paragraphs</p>
                            </div>
                            <div>
                              <span>{reviewResult.summary.highCount}</span>
                              <p>High Issues</p>
                            </div>
                            <div>
                              <span>{reviewResult.summary.mediumCount}</span>
                              <p>Medium Issues</p>
                            </div>
                          </div>

                          <div className="ai-suggestions-panel">
                            <div className="ai-suggestions-heading">
                              <h4>AI Suggestions</h4>
                              <span>{reviewResult.issues.length} issue{reviewResult.issues.length === 1 ? "" : "s"}</span>
                            </div>

                            {reviewResult.issues.length ? (
                              <div className="ai-suggestion-list">
                                {reviewResult.issues.map((issue) => (
                                  <button key={issue.id} type="button" className="ai-suggestion-item" onClick={() => scrollToIssue(issue.target)}>
                                    <span className={`severity-badge ${issue.severity.toLowerCase()}`}>{issue.severity}</span>
                                    <div>
                                      <strong>{issue.category}</strong>
                                      <p>{issue.message}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="ai-pass-card">
                                <CheckCircle2 size={20} />
                                No blocking editorial issues found.
                              </div>
                            )}
                          </div>

                          <div className={`ai-recommendation ${reviewResult.canSubmit ? "pass" : "hold"}`}>
                            {reviewResult.recommendation}
                          </div>
                        </motion.div>
                      ) : null}

                      <div className="ai-review-actions">
                        <button type="button" className="secondary-action" onClick={() => scrollToIssue("editor")}>
                          Fix Issues
                        </button>
                        <button type="button" className="primary-action" onClick={runAiReview} disabled={reviewStatus === "analyzing"}>
                          {reviewStatus === "complete" ? <RefreshCw size={16} /> : <Sparkles size={16} />}
                          {reviewStatus === "complete" ? "Re-run Review" : "Review Article"}
                        </button>
                      </div>
                    </section>

                    <label className="checkbox-row confirmation-row">
                      <input type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} />
                      I confirm this content follows platform guidelines.
                    </label>

                    <div className="workflow-actions">
                      <button type="button" className="secondary-action" onClick={goBack}>
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button type="submit" className="primary-action" disabled={!canSubmitForApproval}>
                        Submit For Approval
                      </button>
                    </div>

                    {!canSubmitForApproval ? (
                      <p className="ai-submit-lock">
                        {reviewResult && reviewIsFresh ? "Please improve article before submission." : "Run AI review and resolve blocking issues before submission."}
                      </p>
                    ) : null}

                    {submissionError ? <p className="error-inline">{submissionError}</p> : null}
                  </form>
                </motion.section>
              )}

              {submitted && (
                <motion.section
                  key="success-step"
                  className="success-screen"
                  initial={{ opacity: 0, scale: 0.96, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <motion.div
                    className="success-mark"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 12 }}
                  >
                    <CheckCircle2 size={52} />
                  </motion.div>
                  <h2>Article Submitted Successfully</h2>
                  <span className="status-pill pending">Pending Review</span>
                  <p>Your article has been sent for editorial review. You will be notified after approval.</p>
                </motion.section>
              )}

              {!submitted && currentStep > 1 && currentStep < 5 && (
                <div className="workflow-footer-actions">
                  <button type="button" className="secondary-action" onClick={goBack}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="button" className="primary-action" onClick={goNext}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </>
  );
}

export default Articles;
