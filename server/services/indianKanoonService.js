const slugify = require("../utils/slugify");
const { getFallbackImage } = require("../constants/legalContent");
const crypto = require("crypto");

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

function normalizeIndianKanoonDoc(doc, context) {
	const docid = String(doc.tid || doc.id || doc.docid || doc.doc_id || doc.link || doc.title || "");
	const sourceId = docid;
	const title = stripHtml(doc.title || doc.doc_title || doc.name || "Untitled judgment");
	const summary = stripHtml(doc.headline || doc.snippet || doc.summary || doc.description || "");
	const sourceCourt = stripHtml(doc.docsource || doc.court || "");
	const courtCategory = context.courtName || sourceCourt || context.categoryLabel || "Judgments";
	const image = doc.image || getFallbackImage(courtCategory || context.categoryLabel);
	const slug = `${slugify(title)}-${slugify(courtCategory)}-${slugify(docid)}`;
	const sourceKey = `indian-kanoon:${buildScopeKey(context)}:${docid || slugify(`${title}-${courtCategory}`)}`;
	const link = `/article/${encodeURIComponent(slug)}`;

	return {
		sourceKey,
		sourceId,
		docid,
		slug,
		uniqueKey: `indian-kanoon-${docid}-${slugify(courtCategory)}-${slugify(context.categoryLabel || "legal")}`,
		title,
		summary,
		fullContent: extractText(doc.fullContent || doc.fullcontent || doc.content || doc.body || doc.text || doc.html || summary),
		publishDate: parseDate(doc.publishdate || doc.publishDate || doc.date, title),
		courtCategory,
		courtSlug: context.courtSlug || "",
		category: context.categoryLabel || courtCategory || "Judgments",
		categorySlug: context.categorySlug || "judgments",
		source: "indian-kanoon",
		author: stripHtml(doc.author || doc.bench || doc.docsource || "Indian Kanoon"),
		link,
		image,
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
	};
}

async function fetchIndianKanoonDocument(docId, context = {}) {
	const apiKey = process.env.INDIA_KANOON_API_KEY;
	if (!apiKey || !docId || typeof fetch !== "function") {
		return null;
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
			};
		} catch (error) {
			continue;
		}
	}

	return null;
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
		return [];
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
};
