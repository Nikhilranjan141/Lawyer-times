const slugify = require("../utils/slugify");
const { classifyLegalItem, pickImageForItem } = require("./legalClassifier");
const { isUsableImage } = require("./articleImageResolver");
const crypto = require("crypto");
const cheerio = require("cheerio");

const INDIAN_KANOON_BASE_URL = process.env.INDIA_KANOON_BASE_URL || "https://api.indiankanoon.org";

function buildDetailPaths(docId) {
	return [
		`/doc/${docId}/?output=json`,
		`/doc/${docId}/?format=json`,
		`/doc/${docId}/?json=1`,
		`/doc/${docId}/`,
	];
}

function buildScopeKey(context = {}) {
	return crypto
		.createHash("sha1")
		.update(`${context.categorySlug || "legal"}|${context.courtSlug || "all"}|${context.search || context.query || ""}`)
		.digest("hex")
		.slice(0, 12);
}

function stripHtml(value = "") {
	return String(value)
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/\s+/g, " ")
		.trim();
}

function buildReadTime(text = "") {
	const words = stripHtml(text).split(/\s+/).filter(Boolean).length;
	return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function parseDate(value, fallbackTitle = "") {
	if (value) {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	const match = String(fallbackTitle).match(/\bon\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
	if (match) {
		const parsed = new Date(match[1]);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	return new Date();
}

function getDocsFromResponse(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.docs)) return payload.docs;
	if (Array.isArray(payload?.results)) return payload.results;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
}

function extractText(value, depth = 0) {
	if (!value || depth > 4) return "";

	if (typeof value === "string") {
		return stripHtml(value);
	}

	if (Array.isArray(value)) {
		return value
			.map((entry) => extractText(entry, depth + 1))
			.filter(Boolean)
			.join("\n\n");
	}

	if (typeof value === "object") {
		const preferredKeys = [
			"fullContent",
			"fullcontent",
			"fullText",
			"fulltext",
			"content",
			"body",
			"text",
			"html",
			"document",
			"doc",
			"summary",
			"headnote",
			"snippet",
			"description",
			"judgment",
			"order",
		];

		for (const key of preferredKeys) {
			if (value[key]) {
				const resolved = extractText(value[key], depth + 1);
				if (resolved) return resolved;
			}
		}

		for (const nested of Object.values(value)) {
			const resolved = extractText(nested, depth + 1);
			if (resolved) return resolved;
		}
	}

	return "";
}

function extractHtmlImage(html = "", baseUrl = "") {
	try {
		const $ = cheerio.load(String(html || ""));

		const looksLikeLogo = (src = "") => {
			if (!src) return true;
			const s = String(src).toLowerCase();
			if (s.startsWith('data:')) return true;
			if (s.endsWith('.svg')) return true;
			if (s.includes('logo') || s.includes('site-logo') || s.includes('favicon')) return true;
			if (s.includes('indiankanoon') || s.includes('kanoon')) return true;
			return false;
		};

		const candidates = [];

		// Meta tags (og/twitter/itemprop/link)
		const og = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:secure_url"]').attr('content');
		const twitter = $('meta[name="twitter:image"]').attr('content') || $('meta[name="twitter:image:src"]').attr('content');
		const itemprop = $('meta[itemprop="image"]').attr('content');
		const linkImg = $('link[rel="image_src"]').attr('href');

		if (og) candidates.push(og);
		if (twitter) candidates.push(twitter);
		if (itemprop) candidates.push(itemprop);
		if (linkImg) candidates.push(linkImg);

		// JSON-LD
		$('script[type="application/ld+json"]').each((i, el) => {
			try {
				const json = JSON.parse($(el).text() || "{}");
				if (json && json.image) {
					if (typeof json.image === 'string') candidates.push(json.image);
					else if (Array.isArray(json.image) && json.image.length) candidates.push(json.image[0]);
					else if (json.image && json.image.url) candidates.push(json.image.url);
				}
			} catch (e) {
				// ignore
			}
		});

		// article/main images first
		const articleImg = $('article img').first().attr('src');
		if (articleImg) candidates.push(articleImg);
		const mainImg = $('main img').first().attr('src');
		if (mainImg) candidates.push(mainImg);

		// fallback: find first image that looks photographic
		if (!candidates.length) {
			const found = $('img').toArray().map((el) => {
				const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
				const w = parseInt($(el).attr('width') || $(el).attr('data-width') || 0, 10) || 0;
				const h = parseInt($(el).attr('height') || $(el).attr('data-height') || 0, 10) || 0;
				return { src, w, h };
			}).filter((f) => f && f.src);

			for (const f of found) {
				if ((f.w && f.h && Math.max(f.w, f.h) > 50) || /\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(f.src)) {
					candidates.push(f.src);
					break;
				}
			}
		}

		for (const c of candidates) {
			if (!c) continue;
			const trimmed = String(c).trim();
			if (looksLikeLogo(trimmed)) continue;
			try {
				const resolved = new URL(trimmed, baseUrl || undefined).toString();
				return resolved;
			} catch (e) {
				return trimmed;
			}
		}
	} catch (err) {
		// ignore
	}

	return "";
}

function isPermissionError(error) {
	return Number(error?.status || error?.response?.status) === 403 || String(error?.message || "").includes("403");
}

async function fetchIndianKanoonSearchHtml(query, context = {}) {
	if (typeof fetch !== "function") return [];

	const url = new URL("https://indiankanoon.org/search/");
	url.searchParams.set("formInput", query);
	url.searchParams.set("pagenum", context.page || "0");

	const response = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"User-Agent": "Mozilla/5.0",
		},
	});

	if (!response.ok) {
		throw new Error(`Indian Kanoon public search failed with ${response.status}`);
	}

	const html = await response.text();
	const $ = cheerio.load(html);
	const results = [];

	$('a[href^="/doc/"] , a[href^="/docfragment/"]').each((_, element) => {
		const href = $(element).attr("href");
		const title = $(element).text().trim();
		if (!href || !title) return;

		const absoluteUrl = `https://indiankanoon.org${href}`;
		const tidMatch = href.match(/\/(?:doc|docfragment)\/(\d+)\/?/i);
		results.push({
			tid: tidMatch?.[1] || href,
			id: tidMatch?.[1] || href,
			docid: tidMatch?.[1] || href,
			title,
			headline: title,
			summary: title,
			link: absoluteUrl,
			sourceUrl: absoluteUrl,
			docsource: $(element).closest("article, li, div").text().trim().slice(0, 500),
		});
	});

	return results;
}

async function fetchPublicDocumentContent(docId) {
	if (typeof fetch !== "function") return null;

	const urls = [
		`https://indiankanoon.org/doc/${docId}/`,
		`https://indiankanoon.org/docfragment/${docId}/`,
	];

	for (const url of urls) {
		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"User-Agent": "Mozilla/5.0",
				},
			});

			if (!response.ok) continue;

			const html = await response.text();
			return {
				payload: html,
				text: stripHtml(html),
				url,
				image: extractHtmlImage(html, url),
			};
		} catch (error) {
			continue;
		}
	}

	return null;
}

function normalizeIndianKanoonDoc(doc, context, source = "indian-kanoon") {
	const docid = String(doc.tid || doc.id || doc.docid || doc.doc_id || doc.link || doc.title || "");
	const sourceId = docid;
	const title = stripHtml(doc.title || doc.doc_title || doc.name || "Untitled judgment");
	const summary = stripHtml(doc.headline || doc.snippet || doc.summary || doc.description || "");
	const sourceCourt = stripHtml(doc.docsource || doc.court || "");
	const courtCategory = context.courtName || sourceCourt || context.categoryLabel || "Judgments";
	const sourceUrl = String(doc.sourceUrl || doc.link || "").trim();
	const contentText = extractText(doc.fullContent || doc.fullcontent || doc.content || doc.body || doc.text || doc.html || summary);
	const classification = classifyLegalItem({
		title,
		headline: summary,
		summary,
		content: contentText,
		fullContent: contentText,
		sourceUrl,
		link: doc.link || sourceUrl,
		tags: doc.tags || [],
		court: sourceCourt,
		sectionKey: context.sectionKey,
	});
	const imageCandidate = doc.image || pickImageForItem({ ...doc, title, court: sourceCourt, category: classification.category, sectionKey: classification.sectionKey, sourceUrl }, classification);
	const image = isUsableImage(imageCandidate) ? imageCandidate : "";
	const slug = `${slugify(title)}-${slugify(courtCategory)}-${slugify(docid)}`;
	const sourceKey = `indian-kanoon:${buildScopeKey(context)}:${docid || slugify(`${title}-${courtCategory}`)}`;
	const link = `/article/${encodeURIComponent(slug)}`;

	return {
		sourceKey,
		sourceId,
		docid,
		slug,
		uniqueKey: `${source}-${docid}-${slugify(courtCategory)}-${slugify(context.categoryLabel || "legal")}`,
		title,
		summary,
		fullContent: contentText,
		publishDate: parseDate(doc.publishdate || doc.publishDate || doc.date, title),
		courtCategory,
		courtSlug: context.courtSlug || "",
		category: classification.category || context.categoryLabel || courtCategory || "Judgments",
		categorySlug: classification.sectionKey || context.categorySlug || "judgments",
		source,
		author: stripHtml(doc.author || doc.bench || doc.docsource || (source === "indian-kanoon" ? "Indian Kanoon" : source)),
		link,
		image,
		imageStatus: image ? "source-image" : "court-document-placeholder",
		tags: [
			context.categoryLabel,
			context.courtName,
			sourceCourt,
			...(Array.isArray(doc.tags) ? doc.tags : []),
		].filter(Boolean),
		readTime: buildReadTime(`${title} ${summary}`),
		score: Number(doc.score || doc.rank || doc.citedby || doc.citedBy || 0),
		raw: doc,
		sourceFetchedAt: new Date(),
		sourceUrl,
	};
}

async function fetchIndianKanoonDocument(docId, context = {}) {
	const apiKey = process.env.INDIA_KANOON_API_KEY;
	if (!apiKey || !docId || typeof fetch !== "function") {
		return fetchPublicDocumentContent(docId);
	}

	for (const path of buildDetailPaths(docId)) {
		try {
			const url = new URL(path, INDIAN_KANOON_BASE_URL);
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: `Token ${apiKey}`,
					Accept: "application/json, text/html, text/plain, */*",
				},
			});

			if (!response.ok) continue;

			const contentType = response.headers.get("content-type") || "";
			if (contentType.includes("application/json") || path.includes("json")) {
				try {
					const payload = await response.json();
					return {
						payload,
						text: extractText(payload),
						url: url.toString(),
					};
				} catch (error) {
					continue;
				}
			}

			const html = await response.text();
			return {
				payload: html,
				text: stripHtml(html),
				url: url.toString(),
				image: extractHtmlImage(html, url.toString()),
			};
		} catch (error) {
			if (isPermissionError(error)) {
				return fetchPublicDocumentContent(docId);
			}
			continue;
		}
	}

	return fetchPublicDocumentContent(docId);
}

function matchesRequiredCourt(doc, item, context = {}) {
	const requiredCourt = context.requiredCourtName || context.courtName || "";
	if (!requiredCourt) return true;

	const sourceCourt = stripHtml(doc.docsource || doc.court || "");
	const haystack = `${sourceCourt} ${item.title} ${item.summary}`.toLowerCase();
	const required = requiredCourt.toLowerCase();

	if (required === "supreme court") {
		return sourceCourt.toLowerCase().includes("supreme court");
	}

	return haystack.includes(required);
}

async function searchIndianKanoon(query, context = {}) {
	const apiKey = process.env.INDIA_KANOON_API_KEY;
	if (!apiKey || typeof fetch !== "function") {
		return fetchIndianKanoonSearchHtml(query, context);
	}

	const url = new URL("/search/", INDIAN_KANOON_BASE_URL);
	url.searchParams.set("formInput", query);
	url.searchParams.set("pagenum", context.page || "0");

	const response = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `Token ${apiKey}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		if (response.status === 403) {
			return fetchIndianKanoonSearchHtml(query, context);
		}

		throw new Error(`Indian Kanoon request failed with ${response.status}`);
	}

	const payload = await response.json();
	const docs = getDocsFromResponse(payload).slice(0, context.limit || 12);
	const enrichedDocs = await Promise.all(
		docs.map(async (doc) => {
			const detail = doc.tid ? await fetchIndianKanoonDocument(doc.tid, context) : null;
			const normalized = normalizeIndianKanoonDoc(
				{
					...doc,
					...(detail?.payload && typeof detail.payload === "object" ? detail.payload : {}),
					image: detail?.image || doc.image || "",
					sourceUrl: detail?.url || doc.sourceUrl || doc.link || "",
					fullContent: detail?.text || doc.fullContent || doc.content || doc.body || doc.text || "",
				},
				context
			);

			if (detail?.url) {
				normalized.sourceReference = detail.url;
			}

			return { doc, normalized };
		})
	);

	return enrichedDocs
		.filter(({ doc, normalized }) => matchesRequiredCourt(doc, normalized, context))
		.map(({ normalized }) => normalized)
		.filter((doc) => doc.title && doc.link);
}

module.exports = {
	searchIndianKanoon,
	fetchIndianKanoonDocument,
	fetchIndianKanoonSearchHtml,
	fetchPublicDocumentContent,
};
