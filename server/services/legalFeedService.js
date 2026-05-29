const axios = require("axios");
const cron = require("node-cron");
const LegalContent = require("../models/LegalContent");
const slugify = require("../utils/slugify");
const rssService = require("./rssService");
const {
	scrapeLiveLawCourt
} = require(
	"./liveLawScraper"
);
const {
	HIGH_COURT_NAMES,
	HIGH_COURT_QUERY_MAP,
	COURT_DOCTYPE_MAP,
	buildLegalQuery,
	getArticleImage,
	getFallbackImage,
	courtFromSlug,
} = require("../constants/legalContent");
const {
	buildReadTime,
	classifyLegalItem,
	getCourtAliases,
	getHighCourtNameFromSlug,
	getHighCourtSlug,
	makeTeaser,
	normalizeText,
	pickImageForItem,
	stripTags,
} = require("./legalClassifier");

const INDIA_KANOON_BASE_URL = "https://api.indiankanoon.org";
const REFRESH_MINUTES = 10;
const CACHE_TTL_MS = 5 * 60 * 1000;
const RESULT_LIMIT = 80;

const sectionMap = {
	supreme: "Supreme Court India latest judgments",
	constitutional: "constitutional law India article 14 article 21 fundamental rights",
	judgments: "India latest court judgments orders",
	"legal-news": "India legal news",
};

const sectionMeta = {
	supreme: { label: "Supreme Court", category: "supreme", court: "Supreme Court" },
	constitutional: { label: "Constitutional Law", category: "constitutional", court: "Constitutional Law" },
	judgments: { label: "Judgments", category: "judgments", court: "Judgments" },
	"legal-news": { label: "Legal News", category: "legal-news", court: "Legal News" },
};

const api = axios.create({
	baseURL: INDIA_KANOON_BASE_URL,
	headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
	const apiKey = String(process.env.INDIA_KANOON_API_KEY || "").trim();
	config.headers = config.headers || {};
	if (apiKey) {
		config.headers.Authorization = `Token ${apiKey}`;
	}
	return config;
});

let schedulerStarted = false;
let refreshInFlight = null;
const feedCache = new Map();

function normalizeSectionKey(value = "") {
	const text = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
	if (!text) return "";
	if (text === "legalnews" || text === "legal-news" || text === "legal news") return "legal-news";
	if (text === "constitutional-law") return "constitutional";
	if (text === "supreme-court") return "supreme";
	return text;
}

function getSectionKey(section = "", court = "") {
	const normalizedSection = normalizeSectionKey(section);
	const normalizedCourt = normalizeSectionKey(court);
	const highCourtSlug =
		getHighCourtSlug(section) ||
		getHighCourtSlug(court) ||
		getHighCourtSlug(normalizedSection) ||
		getHighCourtSlug(normalizedCourt);

	if (highCourtSlug) return highCourtSlug;
	if (normalizedSection === "constitutional") return "constitutional";
	if (normalizedSection === "judgments" || normalizedSection === "judgment") return "judgments";
	if (normalizedSection === "supreme") return "supreme";
	if (normalizedSection === "legalnews" || normalizedSection === "legal-news") return "legal-news";
	if (normalizedCourt === "constitutional") return "constitutional";
	if (normalizedCourt === "supreme") return "supreme";
	if (normalizedCourt === "legalnews" || normalizedCourt === "legal-news") return "legal-news";
	return "legal-news";
}

function getSectionConfig(section = "", court = "") {
	const sectionKey = getSectionKey(section, court);
	const courtName = getHighCourtNameFromSlug(sectionKey);

	if (courtName) {
		return {
			sectionKey,
			query: HIGH_COURT_QUERY_MAP[courtName] || `${courtName} latest judgments`,
			label: courtName,
			category: "highcourt",
			court: courtName,
			doctype: COURT_DOCTYPE_MAP[courtName] || "",
			image: getFallbackImage(courtName),
		};
	}

	const base = sectionMeta[sectionKey] || sectionMeta["legal-news"];
	return {
		sectionKey,
		query: sectionMap[sectionKey] || buildLegalQuery({ category: sectionKey, court, search: "" }) || base.label || "India legal news",
		label: base.label,
		category: base.category,
		court: base.court,
		doctype: COURT_DOCTYPE_MAP[base.court] || "",
		image: getFallbackImage(base.court || base.label),
	};
}

function parseDate(value) {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function detectCourt(item = {}) {
	return classifyLegalItem(item).court || "General";
}

function detectCategory(docsource = "", sectionKey = "") {
	const source = String(docsource || "").toLowerCase();
	if (source.includes("supreme") || sectionKey === "supreme") return "supreme-court";
	if (sectionKey === "constitutional") return "constitutional-law";
	if (sectionKey === "judgments") return "judgments";
	if (source.includes("high court") || sectionKey.includes("high-court")) return "highcourt";
	return "legal-news";
}

function buildCacheKey(config = {}, params = {}) {
	return [config.sectionKey, config.category, config.court, params.search || ""].join("|");
}

function getCachedFeed(cacheKey) {
	const cached = feedCache.get(cacheKey);
	if (!cached) return null;
	if (Date.now() - cached.updatedAt > CACHE_TTL_MS) {
		feedCache.delete(cacheKey);
		return null;
	}
	return cached.payload;
}

function setCachedFeed(cacheKey, payload) {
	feedCache.set(cacheKey, { updatedAt: Date.now(), payload });
}

function logIkSuccess(scope, response, count = 0) {
	console.log(scope, { status: response.status, count });
}

function logIkFailure(scope, error) {
	if (error?.response) {
		console.log(scope, {
			status: error.response.status,
			data: typeof error.response.data === "string" ? error.response.data.slice(0, 2000) : JSON.stringify(error.response.data).slice(0, 2000),
		});
		return;
	}
	console.log(scope, { message: error?.message || "Unknown error" });
}

function extractDocs(payload = {}) {
	if (Array.isArray(payload)) return { key: "array", data: payload };
	if (Array.isArray(payload.docs)) return { key: "docs", data: payload.docs };
	if (Array.isArray(payload.results)) return { key: "results", data: payload.results };
	if (Array.isArray(payload.items)) return { key: "items", data: payload.items };
	if (Array.isArray(payload.documents)) return { key: "documents", data: payload.documents };
	if (Array.isArray(payload.result)) return { key: "result", data: payload.result };
	if (Array.isArray(payload.data)) return { key: "data", data: payload.data };

	if (payload && typeof payload === "object") {
		for (const [key, value] of Object.entries(payload)) {
			if (Array.isArray(value)) {
				return { key, data: value };
			}

			if (value && typeof value === "object") {
				const nested = extractDocs(value);
				if (nested.key !== "none" && nested.data.length) {
					return { key: `${key}.${nested.key}`, data: nested.data };
				}
			}
		}
	}

	return { key: "none", data: [] };
}

async function requestIkSearch(query, options = {}) {
	const config = { params: { formInput: query, pagenum: 0 } };
	if (options.doctype) config.params.doctypes = options.doctype;
	if (typeof options.validateStatus === "function") config.validateStatus = options.validateStatus;
	return api.get("/search/", config);
}

async function fetchSearchResults(query, options = {}) {
	const apiKey = String(process.env.INDIA_KANOON_API_KEY || "").trim();
	if (!apiKey) throw new Error("INDIA_KANOON_API_KEY is missing from the server environment");

	try {
		const response = await requestIkSearch(query, options);
		const extracted = extractDocs(response.data);
		const data = extracted.data || [];
		logIkSuccess("IK SEARCH SUCCESS", response, data.length);
		return data;
	} catch (error) {
		logIkFailure("IK SEARCH FAIL", error);
		const detail = error?.response?.data ? JSON.stringify(error.response.data) : error?.message || "Unknown Indian Kanoon error";
		throw new Error(`Indian Kanoon search failed: ${detail}`);
	}
}

async function fetchDocumentContent(docid, query) {
	const apiKey = String(process.env.INDIA_KANOON_API_KEY || "").trim();
	if (!apiKey) throw new Error("INDIA_KANOON_API_KEY is missing from the server environment");
	if (!docid) return null;

	const attempts = [
		() => api.get(`/doc/${docid}/`),
		() => api.get(`/docfragment/${docid}/`, { params: { formInput: query } }),
	];

	for (const attempt of attempts) {
		try {
			const response = await attempt();
			const payload = response.data;
			const content = typeof payload === "string" ? payload : stripTags(payload?.fullContent || payload?.text || payload?.doc || payload?.html || payload?.body || payload?.summary || "");
			if (content) {
				return { payload, content, court: payload?.docsource || payload?.court || "", sourceUrl: payload?.url || payload?.sourceUrl || "" };
			}
		} catch (error) {
			logIkFailure("IK DOC FAIL", error);
		}
	}

	return null;
}

function buildNormalizedRecord(item = {}, section = {}, detail = null, source = "rss") {
	const docid =
		String(item.docid || item.tid || item.id || item.doc_id || item.link || item.sourceId || item.sourceKey || "").trim() ||
		slugify(`${item.title || "legal-content"}-${item.link || item.sourceUrl || Date.now()}`);
	const rawTitle = item.title || item.doc_title || item.name || detail?.payload?.title || "Untitled judgment";
	const title = stripTags(rawTitle);
	const headline = stripTags(item.headline || item.description || item.summary || detail?.payload?.headline || detail?.payload?.snippet || "");
	const court = stripTags(item.docsource || item.court || detail?.court || "");
	const sourceUrl = String(item.sourceUrl || item.link || detail?.sourceUrl || detail?.payload?.url || "").trim();
	const contentText = stripTags(
		item.fullContent ||
		item.content ||
		item.body ||
		item.text ||
		item.summary ||
		detail?.content ||
		detail?.payload?.fullContent ||
			detail?.payload?.text ||
			detail?.payload?.doc ||
			detail?.payload?.html ||
			detail?.payload?.body ||
			headline
	);
	const classification = classifyLegalItem({
		title,
		headline,
		summary: item.summary || headline,
		content: contentText,
		fullContent: contentText,
		sourceUrl,
		link: item.link || sourceUrl,
		tags: item.tags || [],
		court,
	});
	const publishDate = parseDate(item.publishdate || item.publishDate || item.date || detail?.payload?.publishdate || detail?.payload?.publishDate);
	const fullContent = contentText || headline || title;
	const image =
		item.image ||
		pickImageForItem({ ...item, title, court, category: classification.category, sectionKey: classification.sectionKey, sourceUrl }, classification) ||
		getArticleImage({ title, category: classification.category, categorySlug: classification.sectionKey, tags: item.tags || [] }, { courtName: classification.court });

	return {
		id: docid,
		docid,
		title,
		headline,
		slug: slugify(title),
		court: classification.court || court,
		courtSlug: classification.category === "highcourt" ? classification.sectionKey : "",
		date: publishDate,
		publishDate,
		publishdate: publishDate,
		summary: makeTeaser(item.summary || fullContent || headline || title, 220),
		content: makeTeaser(item.content || item.summary || fullContent || headline || title, 220),
		fullContent,
		image,
		category: classification.category === "highcourt" ? "highcourt" : detectCategory(court, classification.sectionKey),
		sectionKey: classification.sectionKey,
		sectionLabel: section.label,
		readTime: item.readTime || buildReadTime(`${title} ${headline} ${fullContent}`),
		source,
		sourceUrl,
		aliasesMatched: classification.aliasesMatched || [],
		classificationScore: classification.classificationScore || classification.score || 0,
		raw: item.raw || item,
		sourceId: item.sourceId || item.guid || item.link || docid,
		sourceFetchedAt: new Date(),
	};
}

function getTargetHaystack(item = {}) {
	return normalizeText([
		item.title,
		item.headline,
		item.summary,
		item.content,
		item.fullContent,
		item.court,
		item.courtCategory,
		item.category,
		item.sectionKey,
		item.sourceUrl,
		item.link,
		item.raw?.docsource,
		item.raw?.court,
		Array.isArray(item.tags) ? item.tags.join(" ") : "",
	].join(" "));
}

function hasAnyTerm(haystack = "", terms = []) {
	return terms.some((term) => {
		const normalized = normalizeText(term);
		return normalized && haystack.includes(normalized);
	});
}

function isJudgmentLike(item = {}, haystack = getTargetHaystack(item)) {
	if (item.source === "indian-kanoon") return true;
	return hasAnyTerm(haystack, ["judgment", "judgement", "order", "verdict", "ruling", "bench"]);
}

function classifyForTarget(item = {}, config = {}) {
	const classification = classifyLegalItem(item);
	const haystack = getTargetHaystack(item);

	if (config.category === "highcourt") {
		const doctypeTerms = String(config.doctype || "").split(",").map((value) => value.trim()).filter(Boolean);
		return classification.sectionKey === config.sectionKey || hasAnyTerm(haystack, [config.court, ...getCourtAliases(config.court), ...doctypeTerms]);
	}

	if (config.sectionKey === "supreme") {
		return classification.sectionKey === "supreme" || hasAnyTerm(haystack, ["Supreme Court", "supremecourt", "apex court", "cji"]);
	}

	if (config.sectionKey === "constitutional") {
		return hasAnyTerm(haystack, ["constitution", "constitutional", "article 14", "article 19", "article 21", "fundamental rights", "federalism", "constitution bench"]);
	}

	if (config.sectionKey === "judgments") {
		return isJudgmentLike(item, haystack);
	}

	if (config.sectionKey === "legal-news") return true;
	return classification.sectionKey === config.sectionKey;
}

function getRawDocId(item = {}) {
	return String(item.sourceId || item.raw?.docid || item.raw?.tid || item.raw?.id || item.docid || item.id || item.sourceUrl || item.link || "").trim();
}

function scopeDocId(item = {}, sectionKey = "legal-news") {
	const rawDocId = getRawDocId(item) || slugify(`${item.title || "legal-content"}-${item.sourceUrl || item.link || Date.now()}`);
	const normalizedSection = normalizeSectionKey(sectionKey) || "legal-news";
	if (String(rawDocId).startsWith(`${normalizedSection}:`)) return rawDocId;
	return `${normalizedSection}:${rawDocId}`;
}

function applyTargetSection(item = {}, config = {}) {
	const classification = classifyLegalItem(item);
	const rawDocId = getRawDocId(item);
	const targetCategory = config.category === "highcourt" ? "highcourt" : config.category;
	const targetCourt = config.category === "highcourt" || config.sectionKey === "supreme"
		? config.court
		: (item.court && item.court !== "Legal News" ? item.court : config.court);

	return {
		...item,
		id: scopeDocId(item, config.sectionKey),
		docid: scopeDocId(item, config.sectionKey),
		sourceId: rawDocId || item.sourceId || item.docid,
		sectionKey: config.sectionKey,
		sectionLabel: config.label,
		category: targetCategory,
		categorySlug: config.sectionKey,
		court: targetCourt || classification.court || item.court || config.label,
		courtCategory: targetCourt || config.label,
		courtSlug: config.category === "highcourt" ? config.sectionKey : "",
		sourceKey: `${item.source || "legal"}:${config.sectionKey}:${rawDocId || item.docid}`,
	};
}

function dedupeByDocId(items = []) {
	const seen = new Set();
	const output = [];
	for (const item of items) {
		if (!item?.docid) continue;
		if (seen.has(item.docid)) continue;
		seen.add(item.docid);
		output.push(item);
	}
	return output;
}

async function saveSectionItems(items = []) {
	const saved = [];
	const uniqueItems = dedupeByDocId(items);

	for (const rawItem of uniqueItems) {
		if (!rawItem?.docid) continue;
		const item = rawItem.toObject ? rawItem.toObject() : rawItem;
		const existing = await LegalContent.findOne({ docid: item.docid }).select({ sectionKey: 1, classificationScore: 1, source: 1 });
		if (existing) {
			const existingSectionKey = String(existing.sectionKey || "");
			const incomingSectionKey = String(item.sectionKey || "");
			if (existingSectionKey && existingSectionKey !== "legal-news" && incomingSectionKey === "legal-news") {
				continue;
			}
			if (
				existing.classificationScore != null &&
				item.classificationScore != null &&
				existing.classificationScore > item.classificationScore &&
				existingSectionKey &&
				existingSectionKey !== incomingSectionKey
			) {
				continue;
			}
		}
		const toSet = { ...item };
		delete toSet.sourceKey;
		delete toSet.source;
		delete toSet.sourceFetchedAt;

		const record = await LegalContent.findOneAndUpdate(
			{ docid: item.docid },
			{
				$set: toSet,
				$setOnInsert: {
					sourceKey: item.sourceKey || `ik:${item.sectionKey || "legal-news"}:${item.docid}`,
					source: item.source || (item.fullContent ? "indian-kanoon" : "rss"),
					sourceFetchedAt: new Date(),
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);
		saved.push(record);
	}

	console.log("DB ITEM COUNT", { count: saved.length });
	return saved;
}

async function fetchRssFallback(config = {}) {
	try {

        const liveLawCourtUrls = {

	allahabad:
		"https://www.livelaw.in/high-court/allahabad-high-court",

	delhi:
		"https://www.livelaw.in/high-court/delhi-high-court",

	bombay:
		"https://www.livelaw.in/high-court/bombay-high-court",

	patna:
		"https://www.livelaw.in/high-court/patna-high-court",

	kerala:
		"https://www.livelaw.in/high-court/kerala-high-court",

	madras:
		"https://www.livelaw.in/high-court/madras-high-court",

	calcutta:
		"https://www.livelaw.in/high-court/calcutta-high-court",

	karnataka:
		"https://www.livelaw.in/high-court/karnataka-high-court",

	gujarat:
		"https://www.livelaw.in/high-court/gujarat-high-court",

	punjab:
		"https://www.livelaw.in/high-court/punjab-and-haryana-high-court",

	jammu:
		"https://www.livelaw.in/high-court/jammu-kashmir"

};

const liveLawUrl =
	liveLawCourtUrls[
		config.sectionKey
	];

if (
	liveLawUrl
) {

	const scraped =
		await scrapeLiveLawCourt(

			liveLawUrl,

			config.court

		);

	if (
		scraped.length
	) {

		console.log(
			"LIVELAW SCRAPER USED",
			config.sectionKey,
			scraped.length
		);

		return scraped;

	}

}


		const rssItems = await rssService.fetchRssContent({
			courtName: config.court,
			courtSlug: config.sectionKey,
			categoryLabel: config.label,
			categorySlug: config.sectionKey,
			search: config.query,
			sectionKey: config.sectionKey,
		});

		console.log("RSS FALLBACK USED", { sectionKey: config.sectionKey, count: rssItems.length, scoped: true });
		return rssItems;
	} catch (error) {
		console.log("RSS FALLBACK FAIL", { sectionKey: config.sectionKey, message: error.message });
		return [];
	}
}

function toClientItem(record, config = {}) {
	const data =
		record?.toObject
			? record.toObject()
			: record;

	const court =
		data.court ||
		config.court ||
		detectCourt(data);

	


	return {
		id: data.docid,
		docid: data.docid,
		title: data.title,
		headline: data.headline || data.summary || "",
		slug: data.slug,
		court,
		date: data.date || data.publishDate || data.publishdate || data.updatedAt,
		publishDate: data.publishDate || data.publishdate || data.date || data.updatedAt,
		publishdate: data.publishDate || data.publishdate || data.date || data.updatedAt,
		summary: makeTeaser(data.summary || data.fullContent || data.content || data.headline || data.title || "", 220),
		content: makeTeaser(data.content || data.summary || data.fullContent || data.headline || data.title || "", 220),
		image: data.image || getArticleImage({ title: data.title, category: data.category, categorySlug: data.sectionKey, tags: data.tags || [] }, { courtName: court }) || getFallbackImage(court || config.court || data.category || data.sectionKey),
		category: data.category || detectCategory(court, data.sectionKey || config.sectionKey),
		updatedAt: data.updatedAt,
		readTime: data.readTime || buildReadTime(`${data.title || ""} ${data.summary || ""} ${data.content || ""}`),
		sectionKey: data.sectionKey || config.sectionKey,
		source: data.source,
		sourceUrl: data.sourceUrl || data.link || "",
		aliasesMatched: data.aliasesMatched || [],
		classificationScore: data.classificationScore || 0,
	};
}

function buildTargetList() {
	return [
		{ section: "legal-news" },
		{ section: "supreme" },
		...HIGH_COURT_NAMES.map((courtName) => ({ section: slugify(courtName), court: courtName })),
		{ section: "constitutional" },
		{ section: "judgments" },
	];
}

async function refreshSection(section = "legal-news", court = "") {
	const config = getSectionConfig(section, court);
	const apiKey = String(process.env.INDIA_KANOON_API_KEY || "").trim();
	let sourceItems = [];
	let normalizedSourceItems = [];
	let sourceUsed = "rss";

	if (apiKey) {
		try {
			const docs = (await fetchSearchResults(config.query, { doctype: config.doctype })).slice(0, 12);
			const normalized = [];
			for (const doc of docs) {
				const detail = await fetchDocumentContent(doc.docid || doc.tid || doc.id, config.query);
				normalized.push(buildNormalizedRecord(doc, config, detail, "indian-kanoon"));
			}
			normalizedSourceItems = dedupeByDocId(normalized);
			sourceItems = normalizedSourceItems.filter((item) => classifyForTarget(item, config)).map((item) => applyTargetSection(item, config));
			sourceUsed = "indian-kanoon";
			console.log("IK SOURCE USED", { sectionKey: config.sectionKey, query: config.query, count: sourceItems.length });
		} catch (error) {
			console.log("IK FAIL", { sectionKey: config.sectionKey, query: config.query, message: error.message });
		}
	}

	if (!sourceItems.length) {
		const rssItems = await fetchRssFallback(config);
		const normalized = dedupeByDocId(rssItems.map((item) => buildNormalizedRecord(item, config, null, "rss")));
		normalizedSourceItems = normalized;
		sourceItems = normalized.filter((item) => classifyForTarget(item, config)).map((item) => applyTargetSection(item, config));
		sourceUsed = "rss";
		console.log("RSS ITEM COUNT", { sectionKey: config.sectionKey, fetched: rssItems.length, scoped: sourceItems.length });
	}

	if (config.sectionKey === "legal-news" && sourceItems.length < 5 && normalizedSourceItems.length) {
		const supplement = normalizedSourceItems.slice(0, 5).map((item) => ({
			...item,
			sectionKey: "legal-news",
			court: "Legal News",
			category: "legal-news",
			aliasesMatched: [],
			classificationScore: 0,
			sectionLabel: "Legal News",
		}));
		sourceItems = dedupeByDocId([...sourceItems, ...supplement]).slice(0, 12);
	}

	const saved = await saveSectionItems(sourceItems);
	console.log("FEED REFRESH", {
		sectionKey: config.sectionKey,
		sourceUsed,
		received: sourceItems.length,
		saved: saved.length,
	});

	return { section: config, items: saved, sourceUsed };
}

async function refreshAllLegalFeeds() {
	if (refreshInFlight) return refreshInFlight;

	refreshInFlight = (async () => {
		const refreshTargets = buildTargetList();
		for (const target of refreshTargets) {
			try {
				await refreshSection(target.section, target.court || "");
			} catch (error) {
				console.log("Legal feed refresh failed", { target, message: error.message });
			}
		}
	})().finally(() => {
		refreshInFlight = null;
	});

	return refreshInFlight;
}

async function testIndianKanoonSearch() {
	const apiKey = String(process.env.INDIA_KANOON_API_KEY || "").trim();
	if (!apiKey) throw new Error("INDIA_KANOON_API_KEY is missing from the server environment");

	const response = await requestIkSearch("Supreme Court", { validateStatus: () => true });
	const extracted = extractDocs(response.data);
	const data = extracted.data || [];

	console.log("IK TEST", { status: response.status, foundKey: extracted.key, foundItems: data.length });

	return {
		status: response.status,
		headers: response.headers,
		data: response.data,
		foundKey: extracted.key,
		foundItems: data.length,
		responseType: Array.isArray(response.data) ? "array" : typeof response.data,
	};
}

function startLegalFeedScheduler() {
	if (schedulerStarted) return;
	schedulerStarted = true;

	cron.schedule(`*/${REFRESH_MINUTES} * * * *`, async () => {
		try {
			await refreshAllLegalFeeds();
		} catch (error) {
			console.log("Scheduled legal feed refresh failed", { message: error.message });
		}
	});
}

async function listSectionFeed(section = "legal-news", court = "", params = {}) {
	const config = getSectionConfig(section, court);
	const cacheKey = buildCacheKey(config, params);
	const cached = getCachedFeed(cacheKey);
	if (cached && !params.refresh) {
		return cached;
	}

	let refreshResult = null;
	try {
		refreshResult = await refreshSection(section, court);
	} catch (error) {
		console.log("SECTION REFRESH FAIL", { sectionKey: config.sectionKey, message: error.message });
	}

	const makeSearchQuery = (searchParams = {}) => {
		if (!searchParams.search) return null;
		return {
			$or: [
				{ title: { $regex: searchParams.search, $options: "i" } },
				{ headline: { $regex: searchParams.search, $options: "i" } },
				{ summary: { $regex: searchParams.search, $options: "i" } },
				{ content: { $regex: searchParams.search, $options: "i" } },
				{ court: { $regex: searchParams.search, $options: "i" } },
			],
		};
	};

	const primaryQuery = { sectionKey: config.sectionKey };
	if (params.search) {
		const searchQuery = makeSearchQuery(params);
		if (searchQuery) {
			primaryQuery.$or = searchQuery.$or;
		}
	}

	let records = await LegalContent.find(primaryQuery).sort({ updatedAt: -1, date: -1 }).limit(RESULT_LIMIT);

	if (!records.length && config.category === "highcourt") {
		const courtQuery = {
			court: { $regex: String(config.court || court || ""), $options: "i" },
		};
		if (params.search) {
			const searchQuery = makeSearchQuery(params);
			if (searchQuery) {
				courtQuery.$or = searchQuery.$or;
			}
		}
		records = await LegalContent.find(courtQuery).sort({ updatedAt: -1, date: -1 }).limit(RESULT_LIMIT);
	}

	if (!records.length && refreshResult?.items?.length) {
		records = refreshResult.items;
	}

	const clientItems = dedupeByDocId(records.map((record) => toClientItem(record, config)));
	let scopedItems = clientItems;

	const payload = {
		items: scopedItems,
		meta: {
			label: config.label,
			category: config.category,
			court: config.court,
			updatedAt: new Date(),
			refreshIntervalMinutes: REFRESH_MINUTES,
			sectionKey: config.sectionKey,
			warning: !refreshResult || refreshResult.sourceUsed === "rss" ? "rss-fallback-used" : undefined,
		},
	};

	setCachedFeed(cacheKey, payload);
	return payload;
}

async function getLegalArticleByDocId(docid, params = {}) {
	const lookupDocId = String(docid || params.docid || "").trim();
	if (!lookupDocId) {
		throw new Error("Content id is required");
	}

	let record = await LegalContent.findOne({ docid: lookupDocId });

	if (!record && String(process.env.INDIA_KANOON_API_KEY || "").trim()) {
		const detail = await fetchDocumentContent(lookupDocId, params.query || params.search || lookupDocId);
		if (detail) {
			const normalized = buildNormalizedRecord(
				{
					docid: lookupDocId,
					title: detail.payload?.title || detail.payload?.doc_title || detail.payload?.headline || lookupDocId,
					headline: detail.payload?.headline || detail.payload?.snippet || "",
					docsource: detail.court,
					publishdate: detail.payload?.publishdate || detail.payload?.publishDate,
					sourceUrl: detail.sourceUrl,
				},
				getSectionConfig(params.section || params.category || "legal-news", params.court),
				detail,
				"indian-kanoon"
			);

			record = await LegalContent.findOneAndUpdate(
				{ docid: normalized.docid },
				{ $set: normalized, $setOnInsert: { sourceKey: `ik:direct:${normalized.docid}`, source: "indian-kanoon" } },
				{ upsert: true, new: true, setDefaultsOnInsert: true }
			);
		}
	}

	if (!record) {
		throw new Error("Content item not found");
	}

	const item = {
		id: record.docid,
		docid: record.docid,
		title: record.title,
		headline: record.headline || record.summary || "",
		slug: record.slug,
		court: record.court,
		date: record.date || record.publishDate || record.publishdate || record.updatedAt,
		publishDate: record.publishDate || record.publishdate || record.date || record.updatedAt,
		publishdate: record.publishDate || record.publishdate || record.date || record.updatedAt,
		summary: record.summary || record.headline || "",
		content: record.content || record.fullContent || record.summary || "",
		fullContent: record.fullContent || record.content || record.summary || "",
		image: record.image || getArticleImage({ title: record.title, category: record.category, categorySlug: record.sectionKey, tags: record.tags || [] }, { courtName: record.court }),
		category: record.category || detectCategory(record.court, record.sectionKey),
		updatedAt: record.updatedAt,
		sectionKey: record.sectionKey || "legal-news",
		source: record.source,
		sourceUrl: record.sourceUrl || record.link || "",
		aliasesMatched: record.aliasesMatched || [],
		classificationScore: record.classificationScore || 0,
	};

	const relatedResult = await listSectionFeed(record.sectionKey || params.section || params.category || "legal-news", params.court || record.court, params);
	const relatedItems = relatedResult.items.filter((candidate) => candidate.docid !== item.docid).slice(0, 6);

	return {
		item,
		related: relatedItems,
		previous: null,
		next: null,
		meta: relatedResult.meta,
	};
}

module.exports = {
	buildLegalQuery,
	getSectionConfig,
	getLegalArticleByDocId,
	listSectionFeed,
	refreshAllLegalFeeds,
	refreshSection,
	sectionMap,
	detectCourt,
	testIndianKanoonSearch,
	startLegalFeedScheduler,
};










































