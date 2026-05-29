const router = require("express").Router();
const {
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
} = require("../controllers/articleController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/public", getPublicArticles);
router.get("/public/category/:categorySlug", getPublicCategoryArticles);
router.get("/public/article/:articleId", getPublicArticleById);

router.get("/admin/stats", protect, adminOnly, getAdminStats);
router.get("/admin", protect, adminOnly, getAdminArticles);
router.get("/admin/:articleId", protect, adminOnly, getArticleById);
router.patch("/admin/:articleId/approve", protect, adminOnly, approveArticle);
router.patch("/admin/:articleId/reject", protect, adminOnly, rejectArticle);

router.post("/draft", protect, createOrUpdateDraft);
router.post("/submit", protect, submitForApproval);

module.exports = router;

