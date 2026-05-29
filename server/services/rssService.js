const axios = require("axios");
const crypto = require("crypto");
const slugify = require("../utils/slugify");
const { getFallbackImage } = require("../constants/legalContent");

const GOOGLE_NEWS_FEEDS = {

	supreme:
		"https://news.google.com/rss/search?q=Supreme+Court+India",

	patna:
		"https://news.google.com/rss/search?q=Patna+High+Court",

	delhi:
		"https://news.google.com/rss/search?q=Delhi+High+Court",

	bombay:
		"https://news.google.com/rss/search?q=Bombay+High+Court",

	kerala:
		"https://news.google.com/rss/search?q=Kerala+High+Court",

	allahabad:
		"https://news.google.com/rss/search?q=Allahabad+High+Court",

	madras:
		"https://news.google.com/rss/search?q=Madras+High+Court",

	calcutta:
		"https://news.google.com/rss/search?q=Calcutta+High+Court",

	karnataka:
		"https://news.google.com/rss/search?q=Karnataka+High+Court",

	gujarat:
		"https://news.google.com/rss/search?q=Gujarat+High+Court",

	punjab:
		"https://news.google.com/rss/search?q=Punjab+Haryana+High+Court",

	jammu:
		"https://news.google.com/rss/search?q=Jammu+Kashmir+High+Court",

	constitutional:
		"https://news.google.com/rss/search?q=Constitutional+Law+India",

	judgments:
		"https://news.google.com/rss/search?q=Indian+Court+Judgment",

	legalNews:
		"https://news.google.com/rss/search?q=India+Legal+News"

};

const DEFAULT_RSS_FEEDS = [
	"https://www.barandbench.com/topic/rss",
	"https://www.barandbench.com/rss",
	"https://www.livelaw.in/feed",
];

function decodeEntities(value = "") {
	return String(value)
		.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function tagValue(xml, tagNames) {
	for (const tagName of tagNames) {
		const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
		if (match) return decodeEntities(match[1]);
	}

	return "";
}

function attrValue(xml, tagName, attrName) {
	const match = xml.match(new RegExp(`<${tagName}[^>]*\\s${attrName}=["']([^"']+)["'][^>]*>`, "i"));
	return match ? decodeEntities(match[1]) : "";
}

function extractItems(xml = "") {
	const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi);
	if (itemMatches?.length) return itemMatches;

	return xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
}

function parseDate(value) {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildScopeKey(context = {}) {
	return crypto
		.createHash("sha1")
		.update(`${context.categorySlug || "legal"}|${context.courtSlug || "all"}|${context.search || context.query || ""}`)
		.digest("hex")
		.slice(0, 12);
}

function normalizeRssText(value = "") {
	return decodeEntities(String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "));
}

function cleanHtml(html = "") {
	return String(html)
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
		.replace(/<!--([\s\S]*?)-->/g, " ");
}

function extractPageContent(html = "") {
	const cleaned = cleanHtml(html);
	const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
	const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i);
	const bodyMatch = cleaned.match(/<body[\s\S]*?<\/body>/i);
	const source = articleMatch?.[0] || mainMatch?.[0] || bodyMatch?.[0] || cleaned;
	return normalizeRssText(source).replace(/\s+/g, " ").trim();
}

async function fetchLinkedPageContent(link, feedUrl = "") {
	if (!link) return "";

	try {
		const response = typeof fetch === "function"
			? await fetch(link, {
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"User-Agent": "Mozilla/5.0",
				},
			})
			: await axios.get(link, {
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"User-Agent": "Mozilla/5.0",
					Referer: feedUrl || undefined,
				},
				responseType: "text",
			});

		if (typeof response.ok === "boolean" && !response.ok) return "";
		if (response.status && (response.status < 200 || response.status >= 300)) return "";

		const html = typeof response.text === "function" ? await response.text() : response.data;
		return extractPageContent(html);
	} catch (error) {
		return "";
	}
}




 function normalizeRssItem(itemXml, feedUrl, context = {}) {
	const title = tagValue(itemXml, ["title"]);
	const summary = tagValue(itemXml, ["description", "summary", "content:encoded", "content"]);
	const link = tagValue(itemXml, ["link"]) || attrValue(itemXml, "link", "href");
	const guid = tagValue(itemXml, ["guid", "id"]) || link || title;
	let image = "";

// Google News media thumbnail
const mediaThumbnail =
	itemXml.match(
		/<media:thumbnail[^>]+url="([^"]+)"/i
	);

if (
	mediaThumbnail?.[1]
) {

	image =
		mediaThumbnail[1];

}


// Media content
if (!image) {

	const mediaContent =
		itemXml.match(
			/<media:content[^>]+url="([^"]+)"/i
		);

	if (
		mediaContent?.[1]
	) {

		image =
			mediaContent[1];

	}

}


// Enclosure image
if (!image) {

	const enclosure =
		itemXml.match(
			/<enclosure[^>]+url="([^"]+)"/i
		);

	if (
		enclosure?.[1]
	) {

		image =
			enclosure[1];

	}

}


// Direct img tag extraction
if (!image) {

	const imgTag =
		itemXml.match(
			/<img[^>]+src="([^"]+)"/i
		);

	if (
		imgTag?.[1]
	) {

		image =
			imgTag[1];

	}

}


// Google News encoded image
if (!image) {

	const encodedImg =
		itemXml.match(
			/https:\/\/[^"]+\.(jpg|jpeg|png|webp)/i
		);

	if (
		encodedImg?.[0]
	) {

		image =
			encodedImg[0];

	}

}


// REMOVE GOOGLE PLACEHOLDER IMAGES
// if (
// 	image &&
// 	(
// 		image.includes("gstatic") ||
// 		image.includes("googleusercontent") ||
// 		image.includes("news.google") ||
// 		image.includes("GoogleNews")
// 	)
// ) {

// 	image = "";

// }



if (
	image &&
	(
		image.includes("gstatic.com") ||
		image.includes("googleusercontent.com") ||
		image.includes("news.google.com") ||
		image.includes("GoogleNews") ||
		image.includes("encrypted-tbn") ||
		image.includes("lh3.googleusercontent") ||
		image.includes("lh4.googleusercontent") ||
		image.includes("lh5.googleusercontent") ||
		image.includes("lh6.googleusercontent")
	)
) {
	image = "";
}





// GOOGLE RSS CONTENT IMAGE EXTRACTION
if (!image) {

	const descriptionHtml =
		String(
			tagValue(
				itemXml,
				[
					"description",
					"content:encoded"
				],
				""
			)
		);

	const imgMatch =
		descriptionHtml.match(
			/<img[^>]+src=["']([^"']+)["']/i
		);

	if (
		imgMatch?.[1]
	) {

		image =
			imgMatch[1];

	}

}

// if (!image && link) {

// 	image =
// 		await getArticleImage(
// 			link,
// 			feedUrl
// 		);

// }


// FINAL FALLBACK
if (
	!image
) {

	image =
		getFallbackImage(

			context.courtName ||

			context.categoryLabel ||

			context.sectionKey ||

			"Legal News"

		);

}
	const tags = [tagValue(itemXml, ["category"], context)].filter(Boolean);
	const scopeKey = buildScopeKey(context);
	const resolvedGuid = guid || link || title || `${feedUrl}-${Math.random().toString(16).slice(2)}`;
	const docid = slugify(resolvedGuid || `${feedUrl}-${title}`);
	const decodedSummary = normalizeRssText(summary || "");
	const publishDate = parseDate(tagValue(itemXml, ["pubDate", "published", "updated", "dc:date"]));
	const sourceUrl = link || feedUrl || "";

	return {
		docid,
		sourceKey: `rss:${scopeKey}:${docid}`,
		sourceId: guid,
		title: normalizeRssText(title),
		summary: decodedSummary,
		content: decodedSummary,
		fullContent: decodedSummary,
		publishDate,
		publishdate: publishDate,
		courtCategory: context.categoryLabel || "Legal News",
		courtSlug: context.courtSlug || "",
		category: context.categoryLabel || "Legal News",
		categorySlug: context.categorySlug || "legal-news",
		source: "rss",
		sourceUrl,
		author: tagValue(itemXml, ["author", "dc:creator"]) || "RSS Feed",
		link,
		image,
		tags,
		readTime: `${Math.max(1, Math.ceil(normalizeRssText(`${title} ${decodedSummary}`).split(/\s+/).filter(Boolean).length / 220))} min read`,
		score: 0,
		raw: { feedUrl, link, guid },
		sourceFetchedAt: new Date(),
	};
}

function resolveFeedUrls(context = {}) {

	const urls = new Set();

	const normalizedSectionKey =
		String(
			context.sectionKey ||
			context.categorySlug ||
			""
		)
			.trim()
			.toLowerCase()
			.replace(
				/[_\s]+/g,
				"-"
			);

	const normalizedCourtSlug =
		String(
			context.courtSlug || ""
		)
			.trim()
			.toLowerCase()
			.replace(
				/[_\s]+/g,
				"-"
			);

	const searchQuery =
		encodeURIComponent(

			context.query ||
			context.search ||
			context.courtName ||
			context.categoryLabel ||
			normalizedSectionKey ||
			"India Legal News"

		);

	// MAIN GOOGLE SEARCH FEED
	urls.add(

		`https://news.google.com/rss/search?q=${searchQuery}`

	);

	const googleCandidates = [

		normalizedSectionKey,

		normalizedSectionKey.replace(
			/-high-court$/i,
			""
		),

		normalizedCourtSlug,

		normalizedCourtSlug.replace(
			/-high-court$/i,
			""
		),

		normalizedSectionKey ===
		"legal-news"

			? "legalNews"

			: ""

	]
		.filter(Boolean)
		.map(

			(key) =>
				key.replace(
					/-/g,
					""
				)

		);

	const googleKeyAliases = {

		supreme:
			"supreme",

		patna:
			"patna",

		delhi:
			"delhi",

		bombay:
			"bombay",

		kerala:
			"kerala",

		allahabad:
			"allahabad",

		madras:
			"madras",

		calcutta:
			"calcutta",

		karnataka:
			"karnataka",

		gujarat:
			"gujarat",

		punjabandharyana:
			"punjab",

		jammuandkashmirandladakh:
			"jammu",

		constitutional:
			"constitutional",

		judgments:
			"judgments",

		legalnews:
			"legalNews"

	};

	for (
		const candidate
		of googleCandidates
	) {

		const mapped =
			googleKeyAliases[
				candidate
			] || candidate;

		if (
			GOOGLE_NEWS_FEEDS[
				mapped
			]
		) {

			urls.add(

				GOOGLE_NEWS_FEEDS[
					mapped
				]

			);

		}

	}

	for (
		const value of String(
			process.env.RSS_FEEDS || ""
		)
			.split(",")
			.map(
				(url) =>
					url.trim()
			)
			.filter(Boolean)
	) {

		urls.add(value);

	}

	const sectionKey =
		String(
			context.sectionKey ||
			context.categorySlug ||
			""
		).trim();

	const courtSlug =
		String(
			context.courtSlug || ""
		).trim();

	for (
		const key of [
			sectionKey,
			courtSlug
		].filter(Boolean)
	) {

		const envKey =
			`RSS_FEEDS_${key
				.replace(
					/[^a-z0-9]+/gi,
					"_"
				)
				.toUpperCase()}`;

		if (
			process.env[
				envKey
			]
		) {

			for (
				const value of process.env[
					envKey
				]
					.split(",")
					.map(
						(url) =>
							url.trim()
					)
					.filter(Boolean)
			) {

				urls.add(value);

			}

		}

	}

	return Array.from(urls);

}

async function enrichItem(item) {
	if (!item?.link) return item;
	const linkedContent = await fetchLinkedPageContent(item.link, item.raw?.feedUrl || "");
	if (!linkedContent) return item;

	return {
		...item,
		fullContent: linkedContent,
		content: item.content || linkedContent,
		summary: item.summary || linkedContent,
		readTime: `${Math.max(1, Math.ceil(normalizeRssText(`${item.title || ""} ${linkedContent}`).split(/\s+/).filter(Boolean).length / 220))} min read`,
	};
}

async function fetchRssContent(context = {}) {
	const feedUrls = resolveFeedUrls(context);
	if (!feedUrls.length) return [];

	const settledFeeds = await Promise.allSettled(
		feedUrls.map(async (feedUrl) => {
			let xml = "";

			if (typeof fetch === "function") {
				const response = await fetch(feedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
				if (!response.ok) throw new Error(`RSS request failed with ${response.status}`);
				xml = await response.text();
			} else {
				const response = await axios.get(feedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" }, responseType: "text" });
				if (response.status < 200 || response.status >= 300) throw new Error(`RSS request failed with ${response.status}`);
				xml = response.data;
			}

			const normalized = extractItems(xml)
    .map((itemXml) => normalizeRssItem(itemXml, feedUrl, context))
    .filter((item) => item.title && item.link);

const enriched = await Promise.allSettled(
    normalized.slice(0, 12).map((item) => enrichItem(item))
);
			return enriched
				.filter((result) => result.status === "fulfilled")
				.map((result) => result.value)
				.filter(Boolean);
		})
	);

	const allItems = settledFeeds.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
	const deduped = new Map();

	for (const item of allItems) {
		const key = item.docid || item.sourceId || item.link || item.sourceUrl || item.title;
		if (!key) continue;
		if (!deduped.has(key)) {
			deduped.set(key, item);
			continue;
		}

		const existing = deduped.get(key);
		const currentDate = new Date(item.publishDate || item.publishdate || item.sourceFetchedAt || 0).getTime();
		const existingDate = new Date(existing.publishDate || existing.publishdate || existing.sourceFetchedAt || 0).getTime();
		if (currentDate > existingDate) {
			deduped.set(key, item);
		}
	}

	return Array.from(deduped.values()).sort((a, b) => new Date(b.publishDate || b.publishdate || b.sourceFetchedAt || 0) - new Date(a.publishDate || a.publishdate || a.sourceFetchedAt || 0));
}

module.exports = {
	fetchLinkedPageContent,
	fetchRssContent,
	resolveFeedUrls,
};
