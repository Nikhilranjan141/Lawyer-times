const router = require("express").Router();

const {
    listLegalContent,
    getLegalContentArticle,
    refreshLegalContentEndpoint,
} = require("../controllers/legalContentController");


// All legal content
router.get("/", listLegalContent);


// High Court pages
router.get(
    "/highcourt/:slug",
    listLegalContent
);


// Supreme Court
router.get(
    "/supreme",
    listLegalContent
);


// Constitutional Law
router.get(
    "/constitutional",
    listLegalContent
);


// Judgments
router.get(
    "/judgments",
    listLegalContent
);


// Legal News
router.get(
    "/legalnews",
    listLegalContent
);


// Single article
router.get(
    "/article/:slug",
    getLegalContentArticle
);


// Refresh
router.post(
    "/refresh",
    refreshLegalContentEndpoint
);

module.exports = router;