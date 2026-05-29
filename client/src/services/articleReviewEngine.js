const legalKeywords = [
  "court",
  "supreme",
  "high court",
  "judgment",
  "rights",
  "law",
  "legal",
  "constitutional",
  "bench",
  "petition",
  "privacy",
  "bail",
  "appeal",
];

const casualTerms = ["awesome", "cool", "kinda", "sort of", "stuff", "things", "gonna", "wanna", "basically"];

const grammarPatterns = [
  {
    pattern: /\bthe court have\b/i,
    issue: "Use subject-verb agreement: 'The court has ruled' instead of 'The court have ruled'.",
  },
  {
    pattern: /\bhas been passed by the court\b/i,
    issue: "Consider a clearer construction: 'The court passed' or 'The court held'.",
  },
  {
    pattern: /\bits judgement\b/i,
    issue: "Use the preferred legal spelling consistently: 'judgment' or 'judgement'.",
  },
  {
    pattern: /\bvery very\b/i,
    issue: "Avoid repeated intensifiers such as 'very very'.",
  },
];

function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/h[1-6]>|<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(value, regex) {
  return (value.match(regex) || []).length;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function splitSentences(text) {
  return text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean);
}

function splitParagraphs(html, text) {
  const htmlParagraphs = html.match(/<p[\s\S]*?<\/p>/gi);
  if (htmlParagraphs?.length) {
    return htmlParagraphs.map(stripHtml).filter(Boolean);
  }

  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function addIssue(issues, severity, category, message, target = "editor") {
  issues.push({
    id: `${category}-${issues.length + 1}`,
    severity,
    category,
    message,
    target,
  });
}

function getHealth(overall, highCount) {
  if (overall >= 90 && highCount === 0) return "Excellent";
  if (overall >= 80 && highCount === 0) return "Good";
  if (overall >= 65) return "Needs Improvement";
  return "Poor";
}

export function createReviewSignature({ title, shortDescription, content, category, tags }) {
  return JSON.stringify({ title, shortDescription, content, category, tags });
}

export function analyzeArticle({ title = "", shortDescription = "", content = "", category = "", tags = "" }) {
  const text = stripHtml(content);
  const titleText = title.trim();
  const lowerTitle = titleText.toLowerCase();
  const lowerText = text.toLowerCase();
  const issues = [];
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(content, text);
  const words = text.split(/\s+/).filter(Boolean);
  const headingCount = countMatches(content, /<h[1-6][^>]*>/gi);
  const boldCount = countMatches(content, /<(strong|b)[^>]*>/gi);
  const inlineStyleCount = countMatches(content, /style=/gi);
  const fontTagCount = countMatches(content, /<font/gi);

  if (titleText.length < 18) {
    addIssue(issues, "High", "Title Quality", "Article title is too short. Use a precise legal title such as 'Supreme Court Rules on Digital Privacy Rights'.", "title");
  }

  if (titleText.length > 110) {
    addIssue(issues, "Medium", "Title Quality", "Article title is too long. Shorten it while keeping the court, issue, and legal outcome clear.", "title");
  }

  if (!legalKeywords.some((keyword) => lowerTitle.includes(keyword))) {
    addIssue(issues, "Medium", "Title Quality", "Title is missing legal keywords such as court, judgment, rights, law, petition, or constitutional.", "title");
  }

  if (/[!?]{2,}|shocking|unbelievable|you won't believe/i.test(titleText)) {
    addIssue(issues, "High", "Title Quality", "Avoid clickbait language. Legal headlines should be clear, formal, and issue-driven.", "title");
  }

  grammarPatterns.forEach((item) => {
    if (item.pattern.test(text)) {
      addIssue(issues, "Medium", "Grammar Check", item.issue, "editor");
    }
  });

  sentences.forEach((sentence, index) => {
    if (sentence.split(/\s+/).length > 34) {
      addIssue(issues, index < 2 ? "Medium" : "Low", "Readability", `Sentence ${index + 1} is long. Split it for better readability.`, "editor");
    }
  });

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.split(/\s+/).length > 130) {
      addIssue(issues, "Medium", "Readability", `Paragraph ${index + 1} is too dense. Break it into shorter paragraphs.`, "editor");
    }
  });

  if (words.length < 180) {
    addIssue(issues, "High", "Content Structure", "Article is too short for editorial review. Add more legal background, reasoning, and analysis.", "editor");
  }

  if (!shortDescription.trim() || shortDescription.trim().length < 40) {
    addIssue(issues, "Medium", "Content Structure", "Short description should summarize the core legal issue in at least one clear sentence.", "summary");
  }

  const hasIntroSignal = /introduction|background|context|recently|in a significant|the matter/i.test(text);
  const hasConclusionSignal = /conclusion|therefore|in conclusion|going forward|the ruling clarifies|this judgment/i.test(text);

  if (!hasIntroSignal) {
    addIssue(issues, "Medium", "Content Structure", "Add a clear introduction or background section before the main analysis.", "editor");
  }

  if (!hasConclusionSignal) {
    addIssue(issues, "High", "Content Structure", "Missing conclusion section. Add closing analysis explaining the legal significance.", "editor");
  }

  if (headingCount === 0 && words.length > 350) {
    addIssue(issues, "Medium", "Font and Formatting", "Long article has no headings. Add consistent section headings for introduction, analysis, and conclusion.", "editor");
  }

  if (boldCount > Math.max(4, Math.ceil(paragraphs.length * 1.5))) {
    addIssue(issues, "Low", "Font and Formatting", "Excessive bold text detected. Reserve bold styling for important legal terms only.", "editor");
  }

  if (inlineStyleCount || fontTagCount) {
    addIssue(issues, "Medium", "Font and Formatting", "Random inline font styling detected. Use consistent headings and paragraph styles.", "editor");
  }

  casualTerms.forEach((term) => {
    if (lowerText.includes(term)) {
      addIssue(issues, "Medium", "Legal Writing Quality", `Avoid casual wording such as '${term}'. Use formal legal language.`, "editor");
    }
  });

  if (!/(held|observed|ruled|bench|petition|judgment|constitutional|statute|section|article|rights|court)/i.test(text)) {
    addIssue(issues, "Medium", "Legal Writing Quality", "Legal terminology is limited. Add formal legal terms and explain the court's reasoning.", "editor");
  }

  const seenSentences = new Set();
  sentences.forEach((sentence) => {
    const normalized = sentence.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (normalized.length > 35 && seenSentences.has(normalized)) {
      addIssue(issues, "High", "Duplicate Content", "Repeated sentence detected. Remove duplicate or repetitive wording.", "editor");
    }
    seenSentences.add(normalized);
  });

  const highCount = issues.filter((issue) => issue.severity === "High").length;
  const mediumCount = issues.filter((issue) => issue.severity === "Medium").length;
  const lowCount = issues.filter((issue) => issue.severity === "Low").length;
  const avgSentenceLength = sentences.length ? words.length / sentences.length : 0;
  const avgParagraphLength = paragraphs.length ? words.length / paragraphs.length : words.length;

  const scores = {
    grammar: clampScore(100 - countMatches(text, /\b(have ruled|very very|dont|cant|wont)\b/gi) * 10 - mediumCount * 2),
    formatting: clampScore(94 - inlineStyleCount * 8 - fontTagCount * 8 - (headingCount === 0 && words.length > 350 ? 12 : 0) - Math.max(0, boldCount - 6) * 2),
    legalQuality: clampScore(94 - highCount * 6 - casualTerms.filter((term) => lowerText.includes(term)).length * 7),
    readability: clampScore(96 - Math.max(0, avgSentenceLength - 24) * 1.6 - Math.max(0, avgParagraphLength - 95) * 0.45),
    seo: clampScore(88 - (!legalKeywords.some((keyword) => lowerTitle.includes(keyword)) ? 12 : 0) - (!tags?.trim() ? 8 : 0) - (shortDescription.length < 80 ? 8 : 0)),
  };

  const overall = clampScore(
    scores.grammar * 0.2 +
    scores.formatting * 0.16 +
    scores.legalQuality * 0.24 +
    scores.readability * 0.2 +
    scores.seo * 0.2 -
    highCount * 3
  );

  const health = getHealth(overall, highCount);
  const canSubmit = highCount === 0 && overall >= 80;

  return {
    scores: {
      ...scores,
      overall,
    },
    health,
    canSubmit,
    threshold: 80,
    issues,
    summary: {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      highCount,
      mediumCount,
      lowCount,
    },
    recommendation: canSubmit
      ? "Article passes AI editorial review and can be submitted for approval."
      : "Please improve article before submission.",
  };
}
