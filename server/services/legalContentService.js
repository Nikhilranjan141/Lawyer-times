const Article = require("../models/Article");
const LegalContent = require("../models/LegalContent");
const slugify = require("../utils/slugify");
const {
	CATEGORY_CONFIG,
	HIGH_COURT_NAMES,
	buildLegalQuery,
	courtFromSlug,
	getCategoryConfig,
	getFallbackImage,
	getArticleImage,
} = require("../constants/legalContent");
const { fetchIndianKanoonDocument, searchIndianKanoon } = require("./indianKanoonService");
const { fetchRssContent } = require("./rssService");

const REFRESH_INTERVAL_MS = Number(process.env.LEGAL_CONTENT_REFRESH_MINUTES || 20) * 60 * 1000;

function buildContext(params = {}) {
	const categorySlug = slugify(params.category || (params.court ? "high-court" : "legal-news"));
	const categoryConfig = getCategoryConfig(categorySlug);
	const courtName = params.court ? courtFromSlug(params.court) : "";
	const courtSlug = courtName ? slugify(courtName) : "";
	const categoryLabel = courtName ? courtName : (categoryConfig?.label || "Legal News");
	const requiredCourtName = courtName || (categorySlug === "supreme-court" ? "Supreme Court" : "");

	return {
		categorySlug: courtName ? "high-court" : categorySlug,
		categoryLabel,
		courtName,
		courtSlug,
		requiredCourtName,
		query: buildLegalQuery(params),
		search: params.search || "",
		isArticlesPage: categorySlug === "articles",
		sections: courtName ? ["Latest Updates", "Featured Judgments", "Recent Proceedings"] : (categoryConfig?.sections || []),
	};
}

function normalizeAdminArticle(article, context = {}) {
	const publishedAt = article.publishedAt || article.submissionDate || article.createdAt || new Date();
	const category = article.category || "Articles";
	const courtCategory = context.courtName || category;
	const docid = article.articleId;
	const slug = `${slugify(article.title)}-${slugify(courtCategory)}-${slugify(docid)}`;

	return {
		id: article.articleId,
		docid,
		slug,
		uniqueKey: `admin-${docid}-${slugify(courtCategory)}-${slugify(category)}`,
		sourceKey: `admin:${article.articleId}`,
		sourceId: article.articleId,
		title: article.title,
		summary: article.shortDescription || "",
		fullContent: article.content || "",
		publishDate: publishedAt,
		courtCategory,
		courtSlug: context.courtName ? context.courtSlug : "",
		category,
		categorySlug: article.categorySlug || slugify(category),
		source: "admin",
		author: article.author?.name || "Lawyers Times",
		link: `/articles/${article.categorySlug}/${article.articleId}`,
		image: getArticleImage(article, context),
		tags: article.tags || [],
		readTime: article.readTime || "1 min read",
		score: 0,
		sourceFetchedAt: publishedAt,
	};
}

function toClientContent(item) {
	const plain = typeof item.toObject === "function" ? item.toObject() : item;
	const publishDate = plain.publishDate || plain.publishedAt || plain.submissionDate || plain.createdAt || new Date();
	const courtCategory = plain.courtCategory || plain.category || "Legal News";
	const docid = plain.docid || plain.sourceId || plain.articleId || plain.id || String(plain._id || "");
	const slug = plain.slug || `${slugify(plain.title || "article")}-${slugify(courtCategory)}-${slugify(docid)}`;
	const source = plain.source || "admin";
	const internalLink = source === "indian-kanoon" ? `/article/${encodeURIComponent(slug)}` : (plain.link || "");
	const content = extractArticleContent(plain);

	return {
		id: plain.uniqueKey || plain.sourceKey || docid,
		docid,
		slug,
		uniqueKey: plain.uniqueKey || `${source}-${docid}-${slugify(courtCategory)}-${slugify(plain.category || courtCategory)}`,
		title: plain.title,
		summary: plain.summary || plain.shortDescription || "",
		publishDate,
		courtCategory,
		source,
		author: plain.author?.name || plain.author || "Lawyers Times",
		link: internalLink,
		image: plain.image || plain.featuredImage || getFallbackImage(courtCategory),
		tags: plain.tags || [],
		readTime: plain.readTime || "1 min read",
		category: plain.category || courtCategory,
		categorySlug: plain.categorySlug || slugify(plain.category || courtCategory),
		courtSlug: plain.courtSlug || "",
		content,
		fullContent: plain.fullContent || content,
		score: plain.score || 0,
	};
}

function uniqueDocumentsMap(items = []) {
	const map = new Map();

	items.forEach((item, index) => {
		const docid = item.docid || item.sourceId || item.articleId || item.id || `unknown-${index}`;
		if (!map.has(docid)) {
			map.set(docid, {
				...item,
				uniqueKey: item.uniqueKey || `${item.source || "legal"}-${docid}-${slugify(item.courtCategory || item.category || "content")}-${slugify(item.category || item.courtCategory || "content")}-${index}`,
			});
		}
	});

	return map;
}

function extractArticleContent(item = {}) {
	return (
		item.fullContent ||
		item.fullText ||
		item.content ||
		item.body ||
		item.text ||
		item.doc ||
		item.document ||
		item.description ||
		item.summary ||
		item.snippet ||
		item.html ||
		item.paragraphs?.join("\n") ||
		item.judgmentText ||
		item.judgementText ||
		item.result ||
		""
	);
}

function buildDbFilter(context, params = {}) {
	const filter = {};

	if (context.courtName) {
		filter.categorySlug = "high-court";
		filter.courtSlug = context.courtSlug;
		filter.$or = [
			{ "raw.docsource": { $regex: context.courtName, $options: "i" } },
			{ title: { $regex: context.courtName, $options: "i" } },
			{ summary: { $regex: context.courtName, $options: "i" } },
			// Only include RSS items that were normalized with the same courtSlug
			{ $and: [{ source: "rss" }, { courtSlug: context.courtSlug }] },
		];
	} else if (context.requiredCourtName) {
		filter.categorySlug = context.categorySlug;
		filter.$or = [
			{ "raw.docsource": { $regex: context.requiredCourtName, $options: "i" } },
			{ source: "rss" },
		];
	} else if (context.categorySlug && context.categorySlug !== "articles") {
		filter.categorySlug = context.categorySlug;
	}

	if (params.search) {
		const searchFilter = [
			{ title: { $regex: params.search, $options: "i" } },
			{ summary: { $regex: params.search, $options: "i" } },
			{ tags: { $regex: params.search, $options: "i" } },
		];

		if (filter.$or) {
			filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
			delete filter.$or;
		} else {
			filter.$or = searchFilter;
		}
	}

	return filter;
}

function buildAdminFilter(context, params = {}) {
	const filter = {
		status: "approved",
		isPublished: true,
	};

	if (context.isArticlesPage) {
		if (params.search) {
			filter.$or = [
				{ title: { $regex: params.search, $options: "i" } },
				{ shortDescription: { $regex: params.search, $options: "i" } },
				{ tags: { $regex: params.search, $options: "i" } },
			];
		}

		return filter;
	}

	if (context.courtName) {
		filter.$or = [
			{ title: { $regex: context.courtName, $options: "i" } },
			{ shortDescription: { $regex: context.courtName, $options: "i" } },
			{ content: { $regex: context.courtName, $options: "i" } },
			{ tags: { $regex: context.courtName, $options: "i" } },
		];
	} else if (context.categorySlug && context.categorySlug !== "articles") {
		filter.categorySlug = context.categorySlug;
	}

	if (params.search) {
		const searchFilter = [
			{ title: { $regex: params.search, $options: "i" } },
			{ shortDescription: { $regex: params.search, $options: "i" } },
			{ tags: { $regex: params.search, $options: "i" } },
		];

		if (filter.$or) {
			filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
			delete filter.$or;
		} else {
			filter.$or = searchFilter;
		}
	}

	return filter;
}

function sortItems(items, sort = "latest") {
	const sorted = [...items];

	if (sort === "most-read" || sort === "top" || sort === "trending") {
		return sorted.sort((a, b) => (b.score || 0) - (a.score || 0) || new Date(b.publishDate) - new Date(a.publishDate));
	}

	if (sort === "today") {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return sorted
			.filter((item) => new Date(item.publishDate) >= today)
			.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
	}

	if (sort === "week") {
		const weekStart = new Date();
		weekStart.setDate(weekStart.getDate() - 7);
		return sorted
			.filter((item) => new Date(item.publishDate) >= weekStart)
			.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
	}

	return sorted.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
}

async function upsertLegalContent(items = []) {
	if (!items.length) return 0;

	const operations = items.map((item) => ({
		updateOne: {
			filter: { sourceKey: item.sourceKey },
			update: { $set: item },
			upsert: true,
		},
	}));

	const result = await LegalContent.bulkWrite(operations, { ordered: false });
	return (result.upsertedCount || 0) + (result.modifiedCount || 0);
}

async function refreshLegalContent(params = {}) {
	const context = buildContext(params);

	if (context.isArticlesPage) {
		return {
			context,
			storedCount: 0,
			errors: [],
		};
	}

	const [kanoonResult, rssResult] = await Promise.allSettled([
		searchIndianKanoon(context.query, context),
		fetchRssContent(context),
	]);

	const externalItems = [
		...(kanoonResult.status === "fulfilled" ? kanoonResult.value : []),
		...(rssResult.status === "fulfilled" ? rssResult.value : []),
	];

	const storedCount = await upsertLegalContent(externalItems);

	return {
		context,
		storedCount,
		errors: [
			kanoonResult.status === "rejected" ? kanoonResult.reason.message : "",
			rssResult.status === "rejected" ? rssResult.reason.message : "",
		].filter(Boolean),
	};
}

async function shouldRefresh(context) {
	const filter = buildDbFilter(context);
	const latest = await LegalContent.findOne(filter).sort({ sourceFetchedAt: -1 }).select("sourceFetchedAt");
	if (!latest) return true;

	return Date.now() - new Date(latest.sourceFetchedAt).getTime() > REFRESH_INTERVAL_MS;
}

async function getLegalContent(params = {}) {
	const context = buildContext(params);
	const refreshErrors = [];

	if (!context.isArticlesPage && (await shouldRefresh(context))) {
		const refreshResult = await refreshLegalContent(params);
		refreshErrors.push(...refreshResult.errors);
	}

	const queries = [];
	let articleArticles = [];

	if (!context.isArticlesPage) {
		queries.push(LegalContent.find(buildDbFilter(context, params)).sort({ publishDate: -1 }).limit(80));
	} else {
		queries.push(LegalContent.find({}).sort({ publishDate: -1 }).limit(80));
	}

	if (context.isArticlesPage || context.categorySlug === "articles") {
		const articleFilter = buildAdminFilter(context, params);
		articleArticles = await Article.find(articleFilter).sort({ publishedAt: -1, submissionDate: -1 }).limit(80);
	}

	const results = await Promise.all(queries);
	const storedItems = results[0] || [];
	const adminArticles = context.isArticlesPage || context.categorySlug === "articles" ? articleArticles : [];

	const normalizedItems = context.isArticlesPage
		? [
			...adminArticles.map((article) => toClientContent(normalizeAdminArticle(article, context))),
			...storedItems.map(toClientContent),
		]
		: storedItems.map(toClientContent);

	const deduped = Array.from(uniqueDocumentsMap(normalizedItems).values());
	const sorted = sortItems(deduped, params.sort);

	return {
		items: sorted,
		meta: {
			label: context.categoryLabel,
			query: context.query,
			court: context.courtName,
			category: context.categorySlug,
			sections: context.sections,
			total: sorted.length,
			updatedAt: new Date(),
			refreshIntervalMinutes: Math.round(REFRESH_INTERVAL_MS / 60000),
			errors: refreshErrors,
			availableCourts: HIGH_COURT_NAMES,
			availableCategories: Object.keys(CATEGORY_CONFIG),
			futureSources: ["eCourt API"],
		},
	};
}

async function getLegalContentItem(id, params = {}) {
	const lookupDocId = String(params.docid || id || "").trim();
	const lookupSlug = String(params.slug || id || "").trim();
	const lookupCategory = String(params.category || "").trim();

	if (!lookupDocId && !lookupSlug) {
		throw new Error("Content id is required");
	}

	let record = null;

	if (lookupDocId) {
		record = await LegalContent.findOne({
			$or: [
				{ sourceId: lookupDocId },
				{ sourceKey: lookupDocId },
			],
		});
	}

	if (!record && lookupSlug) {
		record = await LegalContent.findOne({
			$or: [
				{ slug: lookupSlug },
				{ slug: lookupDocId },
			],
		});
	}

	if (!record && lookupDocId) {
		const article = await Article.findOne({
			articleId: lookupDocId,
			status: "approved",
		});

		if (article) {
			record = normalizeAdminArticle(article, buildContext({ category: lookupCategory || article.categorySlug, court: params.court }));
		}
	}

	if (!record) {
		throw new Error("Content item not found");
	}

	let item = toClientContent(record);
	item = {
		...item,
		content: item.content || extractArticleContent(record),
		fullContent: item.fullContent || extractArticleContent(record),
	};

	if (!item.fullContent && item.source === "indian-kanoon" && item.docid) {
		const detail = await fetchIndianKanoonDocument(item.docid, { category: record.categorySlug, court: record.courtSlug });
		if (detail?.text) {
			item = {
				...item,
				content: detail.text,
				fullContent: detail.text,
				summary: item.summary || detail.text.slice(0, 320),
			};

			await LegalContent.updateOne(
				{ sourceKey: record.sourceKey },
				{
					$set: {
						fullContent: detail.text,
						sourceReference: detail.url || "",
						raw: {
							...(record.raw || {}),
							detail: detail.payload || detail.text,
						},
						sourceFetchedAt: new Date(),
					},
				}
			);
		}
	}

	if (!item.fullContent && item.summary) {
		item = {
			...item,
			fullContent: item.summary,
		};
	}

	const relatedContext = buildContext({
		category: item.categorySlug,
		court: item.courtSlug,
	});

	const relatedFilter = item.source === "indian-kanoon"
		? buildDbFilter(relatedContext, params)
		: buildAdminFilter(relatedContext, params);

	const scopedRecords = item.source === "indian-kanoon"
		? await LegalContent.find(relatedFilter).sort({ publishDate: -1 }).limit(12)
		: await Article.find(relatedFilter).sort({ publishedAt: -1, submissionDate: -1 }).limit(12);

	const scopedItems = item.source === "indian-kanoon"
		? scopedRecords.map(toClientContent)
		: scopedRecords.map((article) => toClientContent(normalizeAdminArticle(article, relatedContext)));
	const relatedUniqueItems = Array.from(uniqueDocumentsMap(scopedItems).values());

	const currentIndex = relatedUniqueItems.findIndex((candidate) => candidate.docid === item.docid);
	const relatedItems = relatedUniqueItems.filter((candidate) => candidate.docid !== item.docid).slice(0, 6);

	return {
		item,
		related: relatedItems,
		previous: currentIndex > 0 ? relatedUniqueItems[currentIndex - 1] : null,
		next: currentIndex >= 0 && currentIndex < relatedUniqueItems.length - 1 ? relatedUniqueItems[currentIndex + 1] : null,
		meta: {
			label: item.courtCategory || item.category,
			query: relatedContext.query,
			court: relatedContext.courtName,
			category: relatedContext.categorySlug,
		},
	};
}

async function refreshDefaultLegalContent() {
	const refreshTargets = [
		{ category: "supreme-court" },
		{ category: "judgments" },
		{ category: "legal-news" },
		{ category: "constitutional-law" },
		...HIGH_COURT_NAMES.map((court) => ({ court })),
	];

	for (const target of refreshTargets) {
		try {
			await refreshLegalContent(target);
		} catch (error) {
			console.log("Legal content refresh failed:", target, error.message);
		}
	}
}

module.exports = {
	getLegalContent,
	getLegalContentItem,
	refreshDefaultLegalContent,
	refreshLegalContent,
};
