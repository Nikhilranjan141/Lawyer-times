const COURT_IMAGES = {
	supreme: "/images/sc.png",
	allahabad: "/images/allahabad-hc.png",
	delhi: "/images/delhi-hc.png",
	bombay: "/images/bombay-hc.png",
	patna: "/images/patna-hc.png",
	constitutional: "/images/constitutional-law.png",
	legalnews: "/images/legal-news.png",
	judgments: "/images/default-legal.png",
};

const COURT_NAME_IMAGES = {
	"Supreme Court": COURT_IMAGES.supreme,
	"Allahabad High Court": COURT_IMAGES.allahabad,
	"Delhi High Court": COURT_IMAGES.delhi,
	"Bombay High Court": COURT_IMAGES.bombay,
	"Patna High Court": COURT_IMAGES.patna,
	"Constitutional Law": COURT_IMAGES.constitutional,
	"Legal News": COURT_IMAGES.legalnews,
	Judgments: COURT_IMAGES.judgments,
};

function getCourtImage(docsource = "", category = "") {
	const source = String(docsource || "").toLowerCase();
	const section = String(category || "").toLowerCase();

	if (source.includes("supreme") || section.includes("supreme")) return COURT_IMAGES.supreme;
	if (source.includes("allahabad") || section.includes("allahabad")) return COURT_IMAGES.allahabad;
	if (source.includes("delhi") || section.includes("delhi")) return COURT_IMAGES.delhi;
	if (source.includes("bombay") || section.includes("bombay")) return COURT_IMAGES.bombay;
	if (source.includes("patna") || section.includes("patna")) return COURT_IMAGES.patna;
	if (source.includes("constitutional") || section.includes("constitutional")) return COURT_IMAGES.constitutional;
	if (source.includes("legal") || section.includes("legal")) return COURT_IMAGES.legalnews;
	if (source.includes("judgment") || section.includes("judgment")) return COURT_IMAGES.judgments;

	return COURT_NAME_IMAGES[docsource] || COURT_IMAGES.legalnews;
}

module.exports = {
	COURT_IMAGES,
	getCourtImage,
};