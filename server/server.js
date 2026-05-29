require("dotenv").config();

if (process.env.INDIA_KANOON_API_KEY) {
    process.env.INDIA_KANOON_API_KEY = process.env.INDIA_KANOON_API_KEY.trim();
}

console.log("IK KEY EXISTS:", !!process.env.INDIA_KANOON_API_KEY);

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { refreshAllLegalFeeds, startLegalFeedScheduler } = require("./services/legalFeedService");

const app = express();


// Database Connect
connectDB();


// Middleware
app.use(cors());

app.use(express.json());


// Routes
app.use(
    "/api/news",
    require("./routes/news")
);

app.use(
    "/api/courts",
    require("./routes/courts")
);

app.use(
    "/api/auth",
    require("./routes/auth")
);

app.use(
    "/api/articles",
    require("./routes/articles")
);

app.use(
    "/api/legal-content",
    require("./routes/legalContent")
);

app.use(
	"/api/legal",
	require("./routes/legalFeedRoutes")
);


// Test Route
app.get("/", (req, res) => {

    res.send(
        "Lawyers Times Backend Running"
    );

});


// Port
const PORT = process.env.PORT || 5000;


// Server Start
app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

   startLegalFeedScheduler();

refreshAllLegalFeeds();

setInterval(() => {

	refreshAllLegalFeeds();

}, 1000 * 60 * 5);

});
