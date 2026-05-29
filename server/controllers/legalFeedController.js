const {
	getLegalArticleByDocId,
	listSectionFeed,
	refreshAllLegalFeeds,
	testIndianKanoonSearch,
} = require("../services/legalFeedService");

async function sendSectionFeed(res, section, court, params = {}) {
	const payload = await listSectionFeed(section, court, params);
	return res.json(payload);
}

async function listSupremeFeed(req, res) {
	try {
		return await sendSectionFeed(res, "supreme", "", req.query);
	} catch (error) {
		return res.status(500).json({ items: [], meta: { message: error.message } });
	}
}

async function listHighCourtFeed(req, res) {
	try {
		return await sendSectionFeed(res, req.params.courtSlug || "", req.params.courtSlug || "", req.query);
	} catch (error) {
		return res.status(500).json({ items: [], meta: { message: error.message } });
	}
}

async function listLegalNewsFeed(req, res) {
	try {
		return await sendSectionFeed(res, "legal-news", "", req.query);
	} catch (error) {
		return res.status(500).json({ items: [], meta: { message: error.message } });
	}
}

async function listConstitutionalFeed(req, res) {
	try {
		return await sendSectionFeed(res, "constitutional", "", req.query);
	} catch (error) {
		return res.status(500).json({ items: [], meta: { message: error.message } });
	}
}

async function listJudgmentsFeed(req, res) {
	try {
		return await sendSectionFeed(res, "judgments", "", req.query);
	} catch (error) {
		return res.status(500).json({ items: [], meta: { message: error.message } });
	}
}

async function getLegalArticle(req, res) {
	try {
		const payload = await getLegalArticleByDocId(req.params.docid, req.query);
		return res.json(payload);
	} catch (error) {
		return res.status(404).json({ message: error.message });
	}
}

async function refreshLegalFeed(req, res) {
	try {
		const payload = await refreshAllLegalFeeds();
		return res.json(payload || { ok: true });
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

async function testLegalApi(req, res) {
	try {
		const payload = await testIndianKanoonSearch();
		return res.json(payload);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
}

module.exports = {
	getLegalArticle,
	listConstitutionalFeed,
	listHighCourtFeed,
	listJudgmentsFeed,
	listLegalNewsFeed,
	listSupremeFeed,
	refreshLegalFeed,
	testLegalApi,
};