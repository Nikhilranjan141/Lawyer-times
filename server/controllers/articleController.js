const Article = require("../models/Article");
const User = require("../models/User");
const slugify = require("../utils/slugify");

function parseTags(tags) {
	if (Array.isArray(tags)) {
		return tags.map((tag) => String(tag).trim()).filter(Boolean);
	}

	if (typeof tags === "string") {
		return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
	}

	return [];
}

function buildReadTime(content = "") {
	const words = content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(words / 220));
	return `${minutes} min read`;
}

function categorySlugFromCategory(category = "") {
	return slugify(category);
}

function normalizeArticlePayload(body, author, defaults = {}) {
	const category = body.category || defaults.category || "General";
	const content = body.content || defaults.content || "";

	return {
		title: body.title || defaults.title || "Untitled article",
		shortDescription: body.shortDescription || defaults.shortDescription || "",
		content,
		featuredImage: body.featuredImage || defaults.featuredImage || "",
		category,
		categorySlug: body.categorySlug || categorySlugFromCategory(category),
		tags: parseTags(body.tags || defaults.tags),
		author: {
			userId: author?._id,
			name: author?.name || body.authorName || defaults.authorName || "Anonymous",
			email: author?.email || body.authorEmail || defaults.authorEmail || "",
		},
		readTime: buildReadTime(content),
		status: body.status || defaults.status || "draft",
	};
}

async function createOrUpdateDraft(req, res) {
	const articleId = req.body.articleId;
	const payload = normalizeArticlePayload(req.body, req.user, {
		status: "draft",
	});

	try {
		let article = null;

		if (articleId) {
			article = await Article.findOneAndUpdate(
				{ articleId, "author.userId": req.user._id },
				{
					...payload,
					articleId,
					status: "draft",
					updatedAt: Date.now(),
				},
				{ new: true }
			);
		}

		if (!article) {
			article = await Article.create({
				...payload,
				status: "draft",
				submissionDate: Date.now(),
			});
		}

		res.status(200).json(article);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function submitForApproval(req, res) {
	try {
		const payload = normalizeArticlePayload(req.body, req.user, {
			status: "pending",
		});

		let article;

		if (req.body.articleId) {
			article = await Article.findOneAndUpdate(
				{ articleId: req.body.articleId, "author.userId": req.user._id },
				{
					...payload,
					articleId: req.body.articleId,
					status: "pending",
					isPublished: false,
					submissionDate: req.body.submissionDate || Date.now(),
					publishedAt: null,
					rejectionReason: "",
				},
				{ new: true }
			);
		}

		if (!article) {
			article = await Article.create({
				...payload,
				status: "pending",
				submissionDate: Date.now(),
			});
		}

		await User.findByIdAndUpdate(req.user._id, {
			$push: {
				notifications: {
					articleId: article.articleId,
					articleTitle: article.title,
					message: "Your article has been sent for editorial review.",
					type: "submission",
					read: false,
				},
			},
		});

		res.status(201).json(article);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getPublicArticles(req, res) {
	try {
		const { category, query } = req.query;
		const filter = { status: "approved" };

		if (category) {
			filter.categorySlug = slugify(category);
		}

		if (query) {
			filter.$or = [
				{ title: { $regex: query, $options: "i" } },
				{ shortDescription: { $regex: query, $options: "i" } },
			];
		}

		const articles = await Article.find(filter).sort({ publishedAt: -1, submissionDate: -1 });
		res.json(articles);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getPublicCategoryArticles(req, res) {
	try {
		const categorySlug = slugify(req.params.categorySlug);
		const articles = await Article.find({
			status: "approved",
			categorySlug,
		}).sort({ publishedAt: -1, submissionDate: -1 });

		res.json(articles);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getPublicArticleById(req, res) {
	try {
		const article = await Article.findOne({
			articleId: req.params.articleId,
			status: "approved",
		});

		if (!article) {
			return res.status(404).json({ message: "Article not found" });
		}

		res.json(article);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getAdminArticles(req, res) {
	try {
		const { status, category, author, query, date } = req.query;
		const filter = {};

		if (status && status !== "all") {
			filter.status = status;
		}

		if (category && category !== "all") {
			filter.categorySlug = slugify(category);
		}

		if (author) {
			filter["author.name"] = { $regex: author, $options: "i" };
		}

		if (query) {
			filter.title = { $regex: query, $options: "i" };
		}

		if (date) {
			const start = new Date(date);
			const end = new Date(date);
			end.setDate(end.getDate() + 1);
			filter.submissionDate = { $gte: start, $lt: end };
		}

		const articles = await Article.find(filter).sort({ submissionDate: -1, updatedAt: -1 });
		res.json(articles);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getAdminStats(req, res) {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [pendingCount, approvedCount, rejectedCount, draftCount, todaySubmissions] = await Promise.all([
			Article.countDocuments({ status: "pending" }),
			Article.countDocuments({ status: "approved" }),
			Article.countDocuments({ status: "rejected" }),
			Article.countDocuments({ status: "draft" }),
			Article.countDocuments({ submissionDate: { $gte: today } }),
		]);

		res.json({ pendingCount, approvedCount, rejectedCount, draftCount, todaySubmissions });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getArticleById(req, res) {
	try {
		const article = await Article.findOne({ articleId: req.params.articleId });

		if (!article) {
			return res.status(404).json({ message: "Article not found" });
		}

		res.json(article);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function approveArticle(req, res) {
	try {
		const article = await Article.findOne({ articleId: req.params.articleId });

		if (!article) {
			return res.status(404).json({ message: "Article not found" });
		}

		article.status = "approved";
		article.isPublished = true;
		article.categorySlug = categorySlugFromCategory(article.category);
		article.publishedAt = new Date();
		article.rejectionReason = "";
		article.approvedBy = {
			userId: req.user._id,
			name: req.user.name,
			email: req.user.email,
		};
		article.adminNotes = req.body.adminNotes || article.adminNotes;
		await article.save();

		if (article.author?.userId) {
			await User.findByIdAndUpdate(article.author.userId, {
				$push: {
					notifications: {
						articleId: article.articleId,
						articleTitle: article.title,
						message: "Your article has been approved and published.",
						type: "approval",
						read: false,
					},
				},
			});
		}

		res.json(article);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function rejectArticle(req, res) {
	try {
		const article = await Article.findOne({ articleId: req.params.articleId });

		if (!article) {
			return res.status(404).json({ message: "Article not found" });
		}

		article.status = "rejected";
		article.isPublished = false;
		article.publishedAt = null;
		article.rejectionReason = req.body.rejectionReason || "";
		article.adminNotes = req.body.adminNotes || article.adminNotes;
		article.approvedBy = undefined;
		await article.save();

		if (article.author?.userId) {
			await User.findByIdAndUpdate(article.author.userId, {
				$push: {
					notifications: {
						articleId: article.articleId,
						articleTitle: article.title,
						message: "Your article was not approved.",
						type: "rejection",
						read: false,
						reason: article.rejectionReason,
					},
				},
			});
		}

		res.json(article);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

module.exports = {
	createOrUpdateDraft,
	submitForApproval,
	getPublicArticles,
	getPublicCategoryArticles,
	getPublicArticleById,
	getAdminArticles,
	getAdminStats,
	getArticleById,
	approveArticle,
	rejectArticle,
};

