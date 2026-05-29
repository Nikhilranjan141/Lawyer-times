import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Gavel,
  Globe2,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/home.css";

const heroStats = [
  { value: 15000, label: "Judgments" },
  { value: 25, label: "High Courts" },
  { value: 5000, label: "Articles" },
  { value: 50, label: "Legal Experts" },
];

const trendingNews = [
  { title: "SC Rules on Digital Privacy Rights", category: "Supreme Court", date: "May 25, 2026", time: "4 min read", image: "https://images.unsplash.com/photo-1589578527966-fdac0f44566c?auto=format&fit=crop&w=900&q=80" },
  { title: "High Court Clarifies Bail Standards in Economic Offences", category: "High Court", date: "May 24, 2026", time: "6 min read", image: "https://images.unsplash.com/photo-1528747045269-390fe33c19f2?auto=format&fit=crop&w=900&q=80" },
  { title: "Parliamentary Debate Revives Constitutional Privacy Questions", category: "Constitution", date: "May 23, 2026", time: "5 min read", image: "https://images.unsplash.com/photo-1453945619913-79ec89a82c51?auto=format&fit=crop&w=900&q=80" },
  { title: "Breaking: Large Bench Set to Hear Election Integrity Challenge", category: "Breaking", date: "May 23, 2026", time: "3 min read", image: "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=900&q=80" },
  { title: "Delhi HC Tightens Procedure for Fast-Track Matters", category: "High Court", date: "May 22, 2026", time: "4 min read", image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=900&q=80" },
  { title: "Supreme Court Questions Administrative Delay in Public Procurement", category: "Supreme Court", date: "May 21, 2026", time: "5 min read", image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&w=900&q=80" },
];

const courtCategories = [
  { name: "Supreme Court", updates: "240+ updates", icon: Gavel, href: "/supreme-court/sc-judgements" },
  { name: "Allahabad High Court", updates: "180+ updates", icon: Building2, href: "/highcourt/allahabad-high-court" },
  { name: "Delhi High Court", updates: "210+ updates", icon: Scale, href: "/highcourt/delhi-high-court" },
  { name: "Bombay High Court", updates: "190+ updates", icon: ShieldCheck, href: "/highcourt/bombay-high-court" },
  { name: "Madras High Court", updates: "170+ updates", icon: Globe2, href: "/highcourt/madras-high-court" },
  { name: "Karnataka High Court", updates: "160+ updates", icon: Sparkles, href: "/highcourt/karnataka-high-court" },
];

const featuredJudgments = [
  {
    title: "Constitutional Limits on AI-Generated Evidence",
    court: "Supreme Court",
    date: "May 25, 2026",
    summary: "The bench examined admissibility standards for algorithmic evidence and the evidentiary duties of counsel.",
    tags: ["constitutional", "criminal", "technology"],
    href: "/supreme-court/sc-judgements",
  },
  {
    title: "Criminal Bail Jurisprudence Gets a Procedural Reset",
    court: "Delhi High Court",
    date: "May 24, 2026",
    summary: "A detailed order streamlines pre-arrest procedures while balancing personal liberty and custodial concerns.",
    tags: ["criminal", "procedure", "bail"],
    href: "/highcourt/delhi-high-court",
  },
  {
    title: "Civil Appeals and Delay Condonation Under Scrutiny",
    court: "Bombay High Court",
    date: "May 24, 2026",
    summary: "The court emphasised case management discipline and the threshold for exceptional delay relief.",
    tags: ["civil", "procedure", "appeal"],
    href: "/highcourt/bombay-high-court",
  },
];

const legalInsights = [
  {
    title: "How the Supreme Court is shaping digital privacy in India",
    author: "Ananya Kapoor",
    time: "7 min read",
    category: "Analysis",
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "A practitioner's guide to handling urgent High Court listings",
    author: "Rohit Menon",
    time: "6 min read",
    category: "Practice",
    image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Constitutional law trends every litigator should track this month",
    author: "Meera Nair",
    time: "8 min read",
    category: "Constitution",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
  },
];

const trustStats = [
  { value: 100000, label: "Monthly Users" },
  { value: 15000, label: "Judgments" },
  { value: 5000, label: "Articles" },
  { value: 25, label: "High Courts" },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p className="section-description">{description}</p> : null}
    </div>
  );
}

function AnimatedCounter({ value, suffix = "+" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const nextValue = Math.floor(progress * value);
      setCount(nextValue);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(value);
      }
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value]);

  return (
    <div ref={ref} className="animated-counter">
      <strong>{count.toLocaleString()}{suffix}</strong>
    </div>
  );
}

function Home() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-120px" });
  const trendsRef = useRef(null);
  const trendsInView = useInView(trendsRef, { once: true, margin: "-120px" });
  const categoriesRef = useRef(null);
  const categoriesInView = useInView(categoriesRef, { once: true, margin: "-120px" });
  const judgmentsRef = useRef(null);
  const judgmentsInView = useInView(judgmentsRef, { once: true, margin: "-120px" });
  const insightsRef = useRef(null);
  const insightsInView = useInView(insightsRef, { once: true, margin: "-120px" });
  const trustRef = useRef(null);
  const trustInView = useInView(trustRef, { once: true, margin: "-120px" });

  const courtCards = useMemo(() => courtCategories, []);

  return (
    <>
      <Navbar />

      <main className="home-page">
        <section className="hero-section">
          <div className="hero-shell" ref={heroRef}>
            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, y: 24 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <span className="live-badge">● LIVE LEGAL UPDATES</span>
              <h1>Latest Legal Updates From Indian Courts</h1>
              <p>
                Track judgments, proceedings, constitutional matters, and landmark legal developments across India.
              </p>

              <div className="hero-actions">
                <Link to="/supreme-court/sc-judgements" className="hero-button hero-button-primary">
                  Explore Judgments
                </Link>
                <Link to="/highcourts" className="hero-button hero-button-secondary">
                  Latest Proceedings
                </Link>
              </div>

              <div className="hero-stats">
                {heroStats.map((item) => (
                  <motion.div
                    className="hero-stat"
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  >
                    <AnimatedCounter value={item.value} />
                    <span>{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="hero-visual"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={heroInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.65, ease: "easeOut" }}
              whileHover={{ y: -8 }}
            >
              <div className="visual-glow" />
              <img
                src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80"
                alt="Premium legal visual"
                className="hero-image"
              />

              <motion.div
                className="floating-hero-card"
                initial={{ opacity: 0, x: 24, y: 14 }}
                animate={heroInView ? { opacity: 1, x: 0, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <span>Live Court Feed</span>
                <strong>24 matters flagged today</strong>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="content-section" ref={trendsRef} id="trending-news">
          <SectionHeading
            eyebrow="Trending Legal News"
            title="Stay on top of the cases shaping Indian law"
            description="A fast-moving feed of the most relevant legal developments, curated for professionals who need the signal first."
          />

          <motion.div
            className="horizontal-card-row"
            initial="hidden"
            animate={trendsInView ? "show" : "hidden"}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {trendingNews.map((item) => (
              <motion.article
                className="trend-card"
                key={item.title}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                whileHover={{ y: -8 }}
              >
                <div className="trend-image-wrap">
                  <img src={item.image} alt={item.title} className="trend-image" />
                  <span className="trend-badge">{item.category}</span>
                </div>
                <div className="trend-content">
                  <h3>{item.title}</h3>
                  <div className="meta-row">
                    <span>{item.date}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section className="content-section" ref={categoriesRef} id="explore-by-court">
          <SectionHeading
            eyebrow="Explore By Court"
            title="Navigate directly to the courts that matter"
            description="A clean, scalable grid for court-specific coverage with live routing already wired in."
          />

          <div className="court-grid">
            {courtCards.map((court, index) => {
              const Icon = court.icon;
              return (
                <motion.div
                  key={court.name}
                  className="court-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={categoriesInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.04, duration: 0.4 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                >
                  <Link to={court.href} className="court-card-link">
                    <span className="court-icon"><Icon size={20} /></span>
                    <strong>{court.name}</strong>
                    <span>{court.updates}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="content-section" ref={judgmentsRef} id="featured-judgments">
          <SectionHeading
            eyebrow="Featured Judgments"
            title="Premium summaries for fast legal consumption"
            description="Glassmorphism cards built for quick scanning, deeper reading, and analysis-driven workflows."
          />

          <div className="judgment-grid">
            {featuredJudgments.map((item, index) => (
              <motion.article
                key={item.title}
                className="judgment-card"
                initial={{ opacity: 0, y: 22 }}
                animate={judgmentsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                whileHover={{ y: -8 }}
              >
                <div className="judgment-card-header">
                  <span>{item.court}</span>
                  <span>{item.date}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <Link to={item.href} className="text-link">
                  Read Analysis <ArrowRight size={16} />
                </Link>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="content-section" ref={insightsRef} id="legal-insights">
          <SectionHeading
            eyebrow="Legal Insights"
            title="Editorial analysis that feels premium, readable, and current"
            description="Long-form legal intelligence cards with author details, time-to-read, and visual hierarchy."
          />

          <div className="insight-grid">
            {legalInsights.map((item, index) => (
              <motion.article
                key={item.title}
                className="insight-card"
                initial={{ opacity: 0, y: 18 }}
                animate={insightsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                whileHover={{ y: -8 }}
              >
                <div className="insight-image-wrap">
                  <img src={item.image} alt={item.title} className="insight-image" />
                </div>
                <div className="insight-content">
                  <span className="insight-category">{item.category}</span>
                  <h3>{item.title}</h3>
                  <div className="meta-row meta-row-compact">
                    <span>{item.author}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="trust-section" ref={trustRef} id="trust-section">
          <div className="trust-shell">
            <SectionHeading
              eyebrow="Trusted by legal professionals across India"
              title="Built for speed, reliability, and legal clarity"
              description="A platform-level trust block with animated proof points for high-confidence readership."
            />

            <div className="trust-grid">
              {trustStats.map((item) => (
                <motion.div
                  key={item.label}
                  className="trust-card"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={trustInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.35 }}
                >
                  <AnimatedCounter value={item.value} />
                  <span>{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="newsletter-section" id="newsletter">
          <motion.div
            className="newsletter-shell"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45 }}
          >
            <div>
              <p className="newsletter-eyebrow">Stay updated with legal intelligence</p>
              <h2>Get the most important judgments and legal updates in your inbox</h2>
            </div>

            <form className="newsletter-form">
              <input type="email" placeholder="Enter email" aria-label="Enter email" />
              <button type="submit">Subscribe</button>
            </form>
          </motion.div>
        </section>

        <footer className="site-footer">
          <div className="footer-shell">
            <div className="footer-brand">
              <div className="footer-logo">🏛</div>
              <div>
                <strong>Lawyers Times</strong>
                <p>India's Legal Intelligence Platform</p>
              </div>
            </div>

            <div className="footer-links">
              <div>
                <h4>Quick Links</h4>
                <Link to="/highcourts">High Courts</Link>
                <Link to="/supreme-court/sc-judgements">Supreme Court</Link>
                <a href="#legal-insights">Articles</a>
                <a href="#newsletter">Contact</a>
              </div>
              <div>
                <h4>Connect</h4>
                <a href="#">LinkedIn</a>
                <a href="#">X / Twitter</a>
                <a href="#">YouTube</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Lawyers Times. All rights reserved.</span>
            <span>Trusted legal intelligence for India.</span>
          </div>
        </footer>
      </main>
    </>
  );
}

export default Home;
