const { getLegalContent, getLegalContentItem, refreshLegalContent } = require("../services/legalContentService");

function inferRouteContext(req) {
	const routePath = String(req.route?.path || "");

	if (req.params?.slug && routePath.includes("highcourt")) {
		return { court: req.params.slug };
	}

	if (routePath.includes("supreme")) return { category: "supreme-court" };
	if (routePath.includes("constitutional")) return { category: "constitutional-law" };
	if (routePath.includes("judgments")) return { category: "judgments" };
	if (routePath.includes("legalnews")) return { category: "legal-news" };

	return {};
}

async function listLegalContent(req, res) {
	try {
		const routeContext = inferRouteContext(req);
		const payload = await getLegalContent({
			category: req.query.category || routeContext.category,
			court: req.query.court || routeContext.court,
			search: req.query.search,
			sort: req.query.sort,
		});

		res.json(payload);
	} catch (error) {
		res.status(500).json({
			items: [],
			meta: {
				message: "Unable to load legal content",
				error: error.message,
			},
		});
	}
}

async function refreshLegalContentEndpoint(req, res) {
	try {
		const payload = await refreshLegalContent({
			category: req.body.category || req.query.category,
			court: req.body.court || req.query.court,
			search: req.body.search || req.query.search,
		});

		res.json(payload);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function getLegalContentArticle(req, res) {
	try {
		const payload = await getLegalContentItem(req.params.slug, {
			docid: req.query.docid,
			slug: req.params.slug,
			category: req.query.category,
			court: req.query.court,
			search: req.query.search,
		});

		res.json(payload);
	} catch (error) {
		res.status(404).json({
			message: error.message,
		});
	}
}

module.exports = {
	listLegalContent,
	getLegalContentArticle,
	refreshLegalContentEndpoint,
};
