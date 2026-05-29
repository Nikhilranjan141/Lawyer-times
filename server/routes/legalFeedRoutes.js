const router = require("express").Router();
const {
	getLegalArticle,
	listConstitutionalFeed,
	listHighCourtFeed,
	listJudgmentsFeed,
	listLegalNewsFeed,
	listSupremeFeed,
	refreshLegalFeed,
	testLegalApi,
} = require("../controllers/legalFeedController");

router.get("/test-ik", testLegalApi);
router.get("/supreme", listSupremeFeed);
router.get("/highcourt/:courtSlug", listHighCourtFeed);
router.get("/legalnews", listLegalNewsFeed);
router.get("/constitutional", listConstitutionalFeed);
router.get("/judgments", listJudgmentsFeed);
router.get("/article/:docid", getLegalArticle);
router.post("/refresh", refreshLegalFeed);

module.exports = router;