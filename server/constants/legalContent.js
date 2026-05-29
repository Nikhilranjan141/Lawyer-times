const slugify = require("../utils/slugify");

const HIGH_COURT_NAMES = [
	"Allahabad High Court",
	"Andhra Pradesh High Court",
	"Bombay High Court",
	"Calcutta High Court",
	"Chhattisgarh High Court",
	"Delhi High Court",
	"Gauhati High Court",
	"Gujarat High Court",
	"Himachal Pradesh High Court",
	"Jammu & Kashmir and Ladakh High Court",
	"Jharkhand High Court",
	"Karnataka High Court",
	"Kerala High Court",
	"Madhya Pradesh High Court",
	"Madras High Court",
	"Manipur High Court",
	"Meghalaya High Court",
	"Orissa High Court",
	"Patna High Court",
	"Punjab and Haryana High Court",
	"Rajasthan High Court",
	"Sikkim High Court",
	"Telangana High Court",
	"Tripura High Court",
	"Uttarakhand High Court",
];

const CATEGORY_CONFIG = {
	"supreme-court": {
		label: "Supreme Court",
		query: "Supreme Court latest judgments India",
		sections: ["Latest Updates", "Featured Judgments", "Recent Proceedings"],
	},
	judgments: {
		label: "Judgments",
		query: "latest judgments India",
		sections: ["Recent Judgments", "Top Judgments", "Trending Judgments"],
	},
	"legal-news": {
		label: "Legal News",
		query: "India legal news",
		sections: ["Breaking Legal Stories", "Court Updates", "Constitutional News"],
	},
	"constitutional-law": {
		label: "Constitutional Law",
		query: "Constitutional law India",
		sections: ["Fundamental Rights", "Constitution Bench", "Constitutional Updates"],
	},
	articles: {
		label: "Articles",
		query: "India legal articles court analysis constitutional law",
		sections: ["Approved Articles", "Legal Analysis", "Opinions"],
	},
};

const IMAGE_MAP = {
	"Allahabad High Court": "/images/allahabad-hc.png",
	"Delhi High Court": "/images/delhi-hc.png",
	"Bombay High Court": "/images/bombay-hc.png",
	"Patna High Court": "/images/patna-hc.png",
	"Madras High Court": "/images/madras-hc.png",
	"Karnataka High Court": "/images/karnataka-hc.png",
	"Supreme Court": "/images/sc.png",
	"Constitutional Law": "/images/constitutional-law.png",
	"Legal News": "/images/legal-news.png",
	Judgments: "/images/default-legal.png",
	Articles: "/images/default-legal.png",
};

const DEFAULT_LEGAL_IMAGE = "/images/default-legal.png";

const COURT_DOCTYPE_MAP = {
	"Supreme Court": "supremecourt",
	"Allahabad High Court": "allahabad",
	"Andhra Pradesh High Court": "andhra",
	"Bombay High Court": "bombay",
	"Calcutta High Court": "kolkata",
	"Chhattisgarh High Court": "chattisgarh",
	"Delhi High Court": "delhi",
	"Gauhati High Court": "gauhati",
	"Gujarat High Court": "gujarat",
	"Himachal Pradesh High Court": "himachal_pradesh",
	"Jammu & Kashmir and Ladakh High Court": "jammu,srinagar",
	"Jharkhand High Court": "jharkhand",
	"Karnataka High Court": "karnataka",
	"Kerala High Court": "kerala",
	"Madhya Pradesh High Court": "madhyapradesh",
	"Madras High Court": "chennai",
	"Manipur High Court": "manipur",
	"Meghalaya High Court": "meghalaya",
	"Orissa High Court": "orissa",
	"Patna High Court": "patna,patna_orders",
	"Punjab and Haryana High Court": "punjab",
	"Rajasthan High Court": "rajasthan,jodhpur",
	"Sikkim High Court": "sikkim",
	"Telangana High Court": "telangana",
	"Tripura High Court": "tripura",
	"Uttarakhand High Court": "uttaranchal",
};

const HIGH_COURT_QUERY_MAP = {
	"Allahabad High Court": "Allahabad High Court latest judgments",
	"Andhra Pradesh High Court": "Andhra Pradesh High Court latest judgments",
	"Bombay High Court": "Bombay High Court latest judgments",
	"Calcutta High Court": "Calcutta High Court latest judgments",
	"Chhattisgarh High Court": "Chhattisgarh High Court latest judgments",
	"Delhi High Court": "Delhi High Court latest judgments",
	"Gauhati High Court": "Gauhati High Court latest judgments",
	"Gujarat High Court": "Gujarat High Court latest judgments",
	"Himachal Pradesh High Court": "Himachal Pradesh High Court latest judgments",
	"Jammu & Kashmir and Ladakh High Court": "Jammu & Kashmir and Ladakh High Court latest judgments",
	"Jharkhand High Court": "Jharkhand High Court latest judgments",
	"Karnataka High Court": "Karnataka High Court latest judgments",
	"Kerala High Court": "Kerala High Court latest judgments",
	"Madhya Pradesh High Court": "Madhya Pradesh High Court latest judgments",
	"Madras High Court": "Madras High Court latest judgments",
	"Manipur High Court": "Manipur High Court latest judgments",
	"Meghalaya High Court": "Meghalaya High Court latest judgments",
	"Orissa High Court": "Orissa High Court latest judgments",
	"Patna High Court": "Patna High Court latest judgments",
	"Punjab and Haryana High Court": "Punjab and Haryana High Court latest judgments",
	"Rajasthan High Court": "Rajasthan High Court latest judgments",
	"Sikkim High Court": "Sikkim High Court latest judgments",
	"Telangana High Court": "Telangana High Court latest judgments",
	"Tripura High Court": "Tripura High Court latest judgments",
	"Uttarakhand High Court": "Uttarakhand High Court latest judgments",
};

function titleCaseFromSlug(slug = "") {
	return String(slug)
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function courtFromSlug(value = "") {
	const normalizedSlug = slugify(value);
	return HIGH_COURT_NAMES.find((court) => slugify(court) === normalizedSlug) || titleCaseFromSlug(value);
}

function getCategoryConfig(category = "") {
	const categorySlug = slugify(category || "");
	return CATEGORY_CONFIG[categorySlug] || null;
}

function getFallbackImage(key = "") {
	return IMAGE_MAP[key] || DEFAULT_LEGAL_IMAGE;
}

function getArticleImage(article = {}, context = {}) {
	if (article.featuredImage) return article.featuredImage;

	const text = `${article.title || ""} ${article.category || ""} ${article.categorySlug || ""} ${(article.tags || []).join(" ")} ${context.courtName || ""}`.toLowerCase();

	if (text.includes("allahabad")) return IMAGE_MAP["Allahabad High Court"];
	if (text.includes("delhi")) return IMAGE_MAP["Delhi High Court"];
	if (text.includes("bombay")) return IMAGE_MAP["Bombay High Court"];
	if (text.includes("patna")) return IMAGE_MAP["Patna High Court"];
	if (text.includes("madras")) return IMAGE_MAP["Madras High Court"];
	if (text.includes("karnataka")) return IMAGE_MAP["Karnataka High Court"];
	if (text.includes("supreme")) return IMAGE_MAP["Supreme Court"];
	if (text.includes("constitutional")) return IMAGE_MAP["Constitutional Law"];
	if (text.includes("legal news")) return IMAGE_MAP["Legal News"];
	if (text.includes("judgment") || text.includes("judgments")) return IMAGE_MAP.Judgments;

	return getFallbackImage(context.courtName || article.category || article.categorySlug || "");
}

function buildLegalQuery({ category, court, search } = {}) {
	const cleanSearch = String(search || "").trim();
	const courtName = court ? courtFromSlug(court) : "";
	const categoryConfig = getCategoryConfig(category);

	if (courtName) {
		return cleanSearch || HIGH_COURT_QUERY_MAP[courtName] || `${courtName} latest judgments`;
	}

	if (cleanSearch) {
		return categoryConfig ? `${categoryConfig.query} ${cleanSearch}` : cleanSearch;
	}

	return categoryConfig?.query || "India legal news latest judgments";
}

module.exports = {
	CATEGORY_CONFIG,
	COURT_DOCTYPE_MAP,
	DEFAULT_LEGAL_IMAGE,
	HIGH_COURT_NAMES,
	HIGH_COURT_QUERY_MAP,
	IMAGE_MAP,
	buildLegalQuery,
	getArticleImage,
	courtFromSlug,
	getCategoryConfig,
	getFallbackImage,
};
