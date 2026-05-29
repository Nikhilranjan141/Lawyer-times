const { HIGH_COURT_NAMES, getFallbackImage } = require("../constants/legalContent");
const slugify = require("../utils/slugify");

const COURT_ALIASES = {
	"Supreme Court": ["supreme court", "supremecourt", "sc india", "cji", "apex court"],
	"Allahabad High Court": ["allahabad high court", "allahabad hc", "allahabad", "up high court", "uttar pradesh", "u.p.", "up hc"],
	"Delhi High Court": ["delhi high court", "delhi hc", "delhi", "new delhi", "nct delhi"],
	"Bombay High Court": ["bombay high court", "bombay hc", "bombay", "mumbai high court", "mumbai", "maharashtra"],
	"Patna High Court": ["patna high court", "patna hc", "patna", "patna orders", "bihar high court", "bihar hc", "bihar"],
	"Calcutta High Court": ["calcutta high court", "calcutta hc", "calcutta", "kolkata", "west bengal"],
	"Gauhati High Court": ["gauhati high court", "gauhati hc", "gauhati", "guwahati", "assam"],
	"Gujarat High Court": ["gujarat high court", "gujarat hc", "gujarat", "ahmedabad"],
	"Himachal Pradesh High Court": ["himachal pradesh high court", "himachal hc", "himachal pradesh", "himachal", "shimla"],
	"Jammu & Kashmir and Ladakh High Court": [
		"jammu & kashmir and ladakh high court",
		"jammu kashmir and ladakh high court",
		"j&k high court",
		"jk high court",
		"jammu",
		"kashmir",
		"ladakh",
		"srinagar",
	],
	"Jharkhand High Court": ["jharkhand high court", "jharkhand hc", "jharkhand", "ranchi"],
	"Karnataka High Court": ["karnataka high court", "karnataka hc", "karnataka", "bengaluru", "bangalore"],
	"Kerala High Court": ["kerala high court", "kerala hc", "kerala", "kochi", "thiruvananthapuram"],
	"Madhya Pradesh High Court": ["madhya pradesh high court", "madhya pradesh hc", "madhyapradesh", "mp high court", "bhopal", "indore"],
	"Madras High Court": ["madras high court", "madras hc", "madras", "chennai", "tamil nadu"],
	"Manipur High Court": ["manipur high court", "manipur hc", "manipur", "imphal"],
	"Meghalaya High Court": ["meghalaya high court", "meghalaya hc", "meghalaya", "shillong"],
	"Orissa High Court": ["orissa high court", "orissa hc", "orissa", "odisha", "cuttack", "bhubaneswar"],
	"Punjab and Haryana High Court": ["punjab and haryana high court", "punjab hc", "haryana hc", "punjab", "haryana", "chandigarh"],
	"Rajasthan High Court": ["rajasthan high court", "rajasthan hc", "rajasthan", "jaipur", "jodhpur"],
	"Sikkim High Court": ["sikkim high court", "sikkim hc", "sikkim", "gangtok"],
	"Telangana High Court": ["telangana high court", "telangana hc", "telangana", "hyderabad"],
	"Tripura High Court": ["tripura high court", "tripura hc", "tripura", "agartala"],
	"Uttarakhand High Court": ["uttarakhand high court", "uttarakhand hc", "uttaranchal", "nainital", "dehradun"],
	"Andhra Pradesh High Court": ["andhra pradesh high court", "andhra pradesh hc", "andhra", "andhra pradesh", "amaravati", "vijayawada"],
};

const SECTION_RULES = {
	supreme: ["supreme court", "sc india", "cji", "apex court"],
	constitutional: ["constitution", "constitutional", "article 14", "article 19", "article 21", "federalism", "constitution bench", "constitutional bench"],
	judgments: ["judgment", "judgement", "order", "verdict", "bench", "ruling"],
	"legal-news": [],
};

const HIGH_COURT_SLUGS = Object.fromEntries(
	HIGH_COURT_NAMES.map((name) => [slugify(name), name])
);

function normalizeText(value = "") {
	return String(value)
		.toLowerCase()
		.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function stripTags(value = "") {
	return normalizeText(value);
}

function makeTeaser(text = "", length = 220) {
	const clean = stripTags(text);
	if (!clean) return "";
	if (clean.length <= length) return clean;
	return `${clean.slice(0, length).trim()}...`;
}

function buildReadTime(text = "") {
	const words = stripTags(text).split(/\s+/).filter(Boolean).length;
	return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function getHighCourtNameFromSlug(value = "") {
	const normalized = slugify(value);
	if (!normalized) return "";
	if (HIGH_COURT_SLUGS[normalized]) return HIGH_COURT_SLUGS[normalized];
	return "";
}

function getHighCourtSlug(value = "") {
	const normalized = slugify(value);
	if (!normalized) return "";
	if (HIGH_COURT_SLUGS[normalized]) return normalized;

	const aliasToName = HIGH_COURT_NAMES.find((name) => {
		const courtSlug = slugify(name);
		if (normalized === courtSlug) return true;
		const compact = courtSlug.replace(/-high-court$/, "");
		return normalized === compact || normalized === `${compact}-hc`;
	});

	return aliasToName ? slugify(aliasToName) : "";
}

function getCourtAliases(courtName = "") {
	const aliases = new Set();
	const name = String(courtName || "").trim();
	if (!name) return [];

	const base = name.toLowerCase();
	aliases.add(base);
	aliases.add(base.replace(/high court/g, "hc"));
	aliases.add(base.replace(/high court/g, "" ).replace(/\s+/g, " ").trim());

	const specific = COURT_ALIASES[name] || [];
	for (const alias of specific) aliases.add(alias.toLowerCase());

	const tokens = base
		.replace(/high court/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.split(/\s+/)
		.filter((token) => token.length > 2 && !["and", "the", "of", "high", "court"].includes(token));

	if (tokens.length) {
		aliases.add(tokens.join(" "));
		aliases.add(`${tokens.join(" ")} hc`);
		aliases.add(`${tokens[0]} hc`);
	}

	return Array.from(aliases).filter(Boolean);
}

function getTextHaystack(item = {}) {
	return normalizeText([
		item.title,
		item.headline,
		item.summary,
		item.content,
		item.fullContent,
		item.sourceUrl,
		item.link,
		item.category,
		item.court,
		Array.isArray(item.tags) ? item.tags.join(" ") : "",
	].join(" "));
}

function scoreAgainstTerms(haystack, terms = [], exactBonus = 0) {
	let score = 0;
	const matched = [];

	for (const term of terms) {
		const normalized = normalizeText(term);
		if (!normalized) continue;
		if (haystack.includes(normalized)) {
			matched.push(normalized);
			score += exactBonus || (normalized.length > 10 ? 10 : 5);
		}
	}

	return { score, matched };
}

function classifyLegalItem(item = {}) {
	const haystack = getTextHaystack(item);
	const sourceUrl = String(item.sourceUrl || item.link || "").toLowerCase();
	const targetCandidates = [];

	const supreme = scoreAgainstTerms(haystack, SECTION_RULES.supreme, 20);
	targetCandidates.push({
		sectionKey: "supreme",
		court: "Supreme Court",
		category: "supreme",
		score: supreme.score + (supreme.score ? 10 : 0),
		aliasesMatched: supreme.matched,
	});

	for (const courtName of HIGH_COURT_NAMES) {
		const aliases = getCourtAliases(courtName);
		const aliasScore = scoreAgainstTerms(haystack, aliases, 10);
		const courtSlug = slugify(courtName);
		const slugTokens = courtSlug.replace(/-high-court$/, "").split("-").filter(Boolean);
		const keywordScore = scoreAgainstTerms(haystack, slugTokens, 5);
		const urlScore = aliases.some((alias) => sourceUrl.includes(alias.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))) ? 5 : 0;
		const score = aliasScore.score + keywordScore.score + urlScore;
		targetCandidates.push({
			sectionKey: courtSlug,
			court: courtName,
			category: "highcourt",
			score,
			aliasesMatched: Array.from(new Set([...aliasScore.matched, ...keywordScore.matched])),
		});
	}

	const constitutional = scoreAgainstTerms(haystack, SECTION_RULES.constitutional, 8);
	targetCandidates.push({
		sectionKey: "constitutional",
		court: "Constitutional Law",
		category: "constitutional",
		score: constitutional.score,
		aliasesMatched: constitutional.matched,
	});

	const judgments = scoreAgainstTerms(haystack, SECTION_RULES.judgments, 6);
	targetCandidates.push({
		sectionKey: "judgments",
		court: "Judgments",
		category: "judgments",
		score: judgments.score,
		aliasesMatched: judgments.matched,
	});

	const topCandidate = targetCandidates.sort((a, b) => b.score - a.score)[0] || {
		sectionKey: "legal-news",
		court: "Legal News",
		category: "legal-news",
		score: 0,
		aliasesMatched: [],
	};

	if (!topCandidate.score || topCandidate.score < 10) {
		return {
			sectionKey: "legal-news",
			court: "Legal News",
			category: "legal-news",
			classificationScore: topCandidate.score || 0,
			score: topCandidate.score || 0,
			aliasesMatched: [],
			sectionSource: topCandidate.sectionKey,
		};
	}

	return {
		sectionKey: topCandidate.sectionKey,
		court: topCandidate.court,
		category: topCandidate.category,
		classificationScore: topCandidate.score,
		score: topCandidate.score,
		aliasesMatched: Array.from(new Set(topCandidate.aliasesMatched || [])),
		sectionSource: topCandidate.sectionKey,
	};
}

function pickImageForItem(item = {}, classification = {}) {
	if (item.image) return item.image;
	if (classification.court) {
		return getFallbackImage(classification.court);
	}
	return getFallbackImage(classification.category || item.category || item.sectionKey || "Legal News");
}

module.exports = {
	buildReadTime,
	classifyLegalItem,
	getCourtAliases,
	getHighCourtNameFromSlug,
	getHighCourtSlug,
	makeTeaser,
	normalizeText,
	pickImageForItem,
	stripTags,
};
