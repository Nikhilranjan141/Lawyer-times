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

const LEGAL_IMAGE_POOL = [
	"https://images.unsplash.com/photo-1589578527966-fdac0f44566c?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1528747045269-390fe33c19f2?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1453945619913-79ec89a82c51?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80",
];

const TOPIC_IMAGE_RULES = [
	{ terms: ["constitution", "article 14", "article 19", "article 21", "fundamental right"], image: LEGAL_IMAGE_POOL[0] },
	{ terms: ["bail", "criminal", "fir", "arrest", "custody", "accused"], image: LEGAL_IMAGE_POOL[2] },
	{ terms: ["property", "land", "revenue", "tenant", "lease"], image: LEGAL_IMAGE_POOL[3] },
	{ terms: ["tax", "gst", "income tax", "customs", "excise"], image: LEGAL_IMAGE_POOL[4] },
	{ terms: ["privacy", "digital", "data", "technology", "cyber"], image: LEGAL_IMAGE_POOL[7] },
	{ terms: ["election", "parliament", "assembly", "government"], image: LEGAL_IMAGE_POOL[6] },
	{ terms: ["contract", "company", "corporate", "insolvency", "arbitration"], image: LEGAL_IMAGE_POOL[5] },
	{ terms: ["family", "marriage", "divorce", "maintenance", "custody"], image: LEGAL_IMAGE_POOL[1] },
];

const IMAGE_MAP = {
	"Allahabad High Court": LEGAL_IMAGE_POOL[0],
	"Andhra Pradesh High Court": LEGAL_IMAGE_POOL[1],
	"Bombay High Court": LEGAL_IMAGE_POOL[2],
	"Calcutta High Court": LEGAL_IMAGE_POOL[3],
	"Chhattisgarh High Court": LEGAL_IMAGE_POOL[4],
	"Delhi High Court": LEGAL_IMAGE_POOL[5],
	"Gauhati High Court": LEGAL_IMAGE_POOL[6],
	"Gujarat High Court": LEGAL_IMAGE_POOL[7],
	"Himachal Pradesh High Court": LEGAL_IMAGE_POOL[0],
	"Jammu & Kashmir and Ladakh High Court": LEGAL_IMAGE_POOL[1],
	"Jharkhand High Court": LEGAL_IMAGE_POOL[2],
	"Karnataka High Court": LEGAL_IMAGE_POOL[3],
	"Kerala High Court": LEGAL_IMAGE_POOL[4],
	"Madhya Pradesh High Court": LEGAL_IMAGE_POOL[5],
	"Madras High Court": LEGAL_IMAGE_POOL[6],
	"Manipur High Court": LEGAL_IMAGE_POOL[7],
	"Meghalaya High Court": LEGAL_IMAGE_POOL[0],
	"Orissa High Court": LEGAL_IMAGE_POOL[1],
	"Patna High Court": LEGAL_IMAGE_POOL[2],
	"Punjab and Haryana High Court": LEGAL_IMAGE_POOL[3],
	"Rajasthan High Court": LEGAL_IMAGE_POOL[4],
	"Sikkim High Court": LEGAL_IMAGE_POOL[5],
	"Telangana High Court": LEGAL_IMAGE_POOL[6],
	"Tripura High Court": LEGAL_IMAGE_POOL[7],
	"Uttarakhand High Court": LEGAL_IMAGE_POOL[0],
	"Supreme Court": LEGAL_IMAGE_POOL[0],
	"Constitutional Law": LEGAL_IMAGE_POOL[0],
	"Legal News": LEGAL_IMAGE_POOL[6],
	Judgments: LEGAL_IMAGE_POOL[1],
	Articles: LEGAL_IMAGE_POOL[5],
};

const DEFAULT_LEGAL_IMAGE = "/images/default-legal.png";

const IMAGE_LOOKUP_ALIASES = {
	"supreme-court": "Supreme Court",
	supreme: "Supreme Court",
	supremecourt: "Supreme Court",
	"legal-news": "Legal News",
	legalnews: "Legal News",
	"constitutional-law": "Constitutional Law",
	constitutional: "Constitutional Law",
	judgments: "Judgments",
	judgment: "Judgments",
	articles: "Articles",
	article: "Articles",
	allahabad: "Allahabad High Court",
	"allahabad-high-court": "Allahabad High Court",
	delhi: "Delhi High Court",
	"delhi-high-court": "Delhi High Court",
	bombay: "Bombay High Court",
	"bombay-high-court": "Bombay High Court",
	patna: "Patna High Court",
	"patna-high-court": "Patna High Court",
	madras: "Madras High Court",
	"madras-high-court": "Madras High Court",
	karnataka: "Karnataka High Court",
	"karnataka-high-court": "Karnataka High Court",
};

function resolveImageKey(key = "") {
	const normalized = String(key || "").trim().toLowerCase();
	if (!normalized) return "";

	if (IMAGE_MAP[key]) return key;
	if (IMAGE_LOOKUP_ALIASES[normalized]) return IMAGE_LOOKUP_ALIASES[normalized];

	const slug = slugify(normalized);
	if (IMAGE_LOOKUP_ALIASES[slug]) return IMAGE_LOOKUP_ALIASES[slug];

	if (normalized.includes("supreme")) return "Supreme Court";
	if (normalized.includes("constitutional")) return "Constitutional Law";
	if (normalized.includes("legal news") || normalized.includes("legal-news")) return "Legal News";
	if (normalized.includes("judgment")) return "Judgments";

	for (const courtName of Object.keys(IMAGE_MAP)) {
		const courtSlug = slugify(courtName);
		if (normalized.includes(courtName.toLowerCase()) || normalized.includes(courtSlug)) {
			return courtName;
		}
	}

	return "";
}

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
	const resolvedKey = resolveImageKey(key);
	if (IMAGE_MAP[resolvedKey]) return IMAGE_MAP[resolvedKey];
	return pickImageFromText(key || "legal update");
}

function getArticleImage(article = {}, context = {}) {
	if (article.featuredImage && !isFallbackImage(article.featuredImage)) return article.featuredImage;
	if (article.image && !isFallbackImage(article.image)) return article.image;
	return "";
}

function hashText(value = "") {
	return String(value || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function pickImageFromText(value = "") {
	const hash = Math.abs(hashText(value || "legal update"));
	return LEGAL_IMAGE_POOL[hash % LEGAL_IMAGE_POOL.length];
}

function getTopicImage(value = "") {
	const text = String(value || "").toLowerCase();
	const rule = TOPIC_IMAGE_RULES.find((entry) => entry.terms.some((term) => text.includes(term)));
	return rule?.image || "";
}

function isFallbackImage(image = "") {
	const value = String(image || "").trim().toLowerCase();
	if (!value) return true;
	if (value.startsWith("data:")) return true;
	if (value.includes("/images/")) return true;
	if (value.includes("default-legal")) return true;
	if (value.includes("images.unsplash.com")) return true;
	if (value.includes("logo") || value.includes("favicon")) return true;
	if (value.includes("news.google") || value.includes("encrypted-tbn")) return true;
	if (value.includes("gstatic") || value.includes("googleusercontent")) return true;
	return false;
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
	isFallbackImage,
	buildLegalQuery,
	getArticleImage,
	courtFromSlug,
	getCategoryConfig,
	getFallbackImage,
};
