const axios = require("axios");
const cheerio = require("cheerio");

const LEGAL_SOURCE_DOMAINS = [
	"livelaw.in",
	"barandbench.com",
	"verdictum.in",
	"lawbeat.in",
	"latestlaws.com",
	"scconline.com",
];

const REQUEST_HEADERS = {
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"User-Agent": "Mozilla/5.0",
};

function isUsableImage(src = "") {
	const value = String(src || "").trim();
	const lower = value.toLowerCase();
	if (!value) return false;
	if (lower.startsWith("data:")) return false;
	if (lower.endsWith(".svg")) return false;
	if (lower.includes("logo") || lower.includes("favicon") || lower.includes("site-logo")) return false;
	if (lower.includes("indiankanoon") || lower.includes("kanoon")) return false;
	if (lower.includes("/images/")) return false;
	if (lower.includes("default-legal")) return false;
	if (lower.includes("images.unsplash.com")) return false;
	if (lower.includes("news.google") || lower.includes("encrypted-tbn")) return false;
	if (lower.includes("gstatic") || lower.includes("googleusercontent")) return false;
	return /^https?:\/\//i.test(value);
}

function absoluteUrl(value = "", baseUrl = "") {
	if (!value) return "";
	try {
		return new URL(value, baseUrl || undefined).toString();
	} catch {
		return value;
	}
}

function decodeEntities(value = "") {
	return String(value)
		.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function tagValue(xml = "", tagNames = []) {
	for (const tagName of tagNames) {
		const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
		if (match) return decodeEntities(match[1]);
	}
	return "";
}

function extractItems(xml = "") {
	return xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
}

function extractImageFromHtml(html = "", pageUrl = "") {
	const $ = cheerio.load(String(html || ""));
	const candidates = [
		$('meta[property="og:image:secure_url"]').attr("content"),
		$('meta[property="og:image"]').attr("content"),
		$('meta[name="og:image"]').attr("content"),
		$('meta[name="twitter:image:src"]').attr("content"),
		$('meta[name="twitter:image"]').attr("content"),
		$('meta[itemprop="image"]').attr("content"),
		$('link[rel="image_src"]').attr("href"),
	];

	$('script[type="application/ld+json"]').each((_, element) => {
		try {
			const json = JSON.parse($(element).text() || "{}");
			const image = Array.isArray(json.image) ? json.image[0] : json.image;
			if (typeof image === "string") candidates.push(image);
			if (image?.url) candidates.push(image.url);
		} catch {
			// Ignore invalid JSON-LD.
		}
	});

	$("article img, main img, figure img, img").each((_, element) => {
		candidates.push(
			$(element).attr("src") ||
			$(element).attr("data-src") ||
			$(element).attr("data-lazy-src") ||
			$(element).attr("data-original")
		);
	});

	for (const candidate of candidates) {
		const resolved = absoluteUrl(String(candidate || "").trim(), pageUrl);
		if (isUsableImage(resolved)) return resolved;
	}

	return "";
}

async function scrapePageImage(url = "") {
	if (!url || /indiankanoon\.org/i.test(url)) return "";
	try {
		const response = await axios.get(url, {
			headers: REQUEST_HEADERS,
			maxRedirects: 5,
			responseType: "text",
			timeout: 10000,
			validateStatus: (status) => status >= 200 && status < 400,
		});
		return extractImageFromHtml(response.data || "", response.request?.res?.responseUrl || url);
	} catch {
		return "";
	}
}

async function resolvePublisherUrl(url = "") {
	if (!url) return "";
	if (!/news\.google\.com/i.test(url)) return url;

	try {
		const response = await axios.get(url, {
			headers: REQUEST_HEADERS,
			maxRedirects: 5,
			responseType: "text",
			timeout: 10000,
			validateStatus: (status) => status >= 200 && status < 400,
		});
		const finalUrl = response.request?.res?.responseUrl || "";
		if (finalUrl && !/news\.google\.com/i.test(finalUrl)) return finalUrl;

		const $ = cheerio.load(response.data || "");
		const candidate =
			$('link[rel="canonical"]').attr("href") ||
			$('a[href^="http"]').filter((_, element) => !/news\.google\.com/i.test($(element).attr("href") || "")).first().attr("href");
		return absoluteUrl(candidate || "", url);
	} catch {
		return "";
	}
}

async function searchImageWithBing(query = "") {
	const apiKey = String(process.env.BING_IMAGE_SEARCH_KEY || "").trim();
	if (!apiKey || !query) return "";

	try {
		const response = await axios.get("https://api.bing.microsoft.com/v7.0/images/search", {
			headers: { "Ocp-Apim-Subscription-Key": apiKey },
			params: { q: query, count: 8, safeSearch: "Moderate", imageType: "Photo" },
			timeout: 10000,
		});
		const candidate = (response.data?.value || []).find((item) => isUsableImage(item.contentUrl));
		return candidate?.contentUrl || "";
	} catch {
		return "";
	}
}

async function searchImageWithGoogle(query = "") {
	const key = String(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || "").trim();
	const cx = String(process.env.GOOGLE_CUSTOM_SEARCH_CX || "").trim();
	if (!key || !cx || !query) return "";

	try {
		const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
			params: { key, cx, q: query, searchType: "image", num: 5, safe: "active" },
			timeout: 10000,
		});
		const candidate = (response.data?.items || []).find((item) => isUsableImage(item.link));
		return candidate?.link || "";
	} catch {
		return "";
	}
}

async function searchLegalSourceImage(title = "", court = "") {
	const cleanTitle = String(title || "").replace(/\s+/g, " ").trim();
	if (!cleanTitle) return "";

	const domainQuery = LEGAL_SOURCE_DOMAINS.map((domain) => `site:${domain}`).join(" OR ");
	const query = encodeURIComponent(`"${cleanTitle.slice(0, 120)}" ${court || ""} (${domainQuery})`);
	const url = `https://news.google.com/rss/search?q=${query}`;

	try {
		const response = await axios.get(url, {
			headers: { Accept: "application/rss+xml, application/xml, text/xml" },
			responseType: "text",
			timeout: 10000,
		});
		const items = extractItems(response.data || "").slice(0, 6);
		for (const itemXml of items) {
			const link = tagValue(itemXml, ["link"]);
			const publisherUrl = await resolvePublisherUrl(link);
			const image = await scrapePageImage(publisherUrl || link);
			if (image) return image;
		}
	} catch {
		return "";
	}

	return "";
}

async function resolveArticleImage(item = {}, context = {}) {
	const existing = item.image || item.featuredImage || "";
	if (isUsableImage(existing)) {
		return { image: existing, status: "source-image" };
	}

	const sourceUrl = item.sourceUrl || item.link || "";
	const publisherUrl = await resolvePublisherUrl(sourceUrl);
	const scraped = await scrapePageImage(publisherUrl || sourceUrl);
	if (scraped) return { image: scraped, status: "publisher-og-image" };

	const title = item.title || item.headline || "";
	const court = context.court || item.court || item.courtCategory || "";
	const legalSourceImage = await searchLegalSourceImage(title, court);
	if (legalSourceImage) return { image: legalSourceImage, status: "legal-source-search" };

	const searchQuery = `${title} ${court} legal news`;
	const googleImage = await searchImageWithGoogle(searchQuery);
	if (googleImage) return { image: googleImage, status: "google-image-search" };

	const bingImage = await searchImageWithBing(searchQuery);
	if (bingImage) return { image: bingImage, status: "bing-image-search" };

	return { image: "", status: "court-document-placeholder" };
}

module.exports = {
	isUsableImage,
	resolveArticleImage,
	resolvePublisherUrl,
	scrapePageImage,
};
