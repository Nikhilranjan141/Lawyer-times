const router = require("express").Router();

const News = require("../models/News");


// Add News
router.post("/add", async (req, res) => {

    try {

        const news = await News.create(req.body);

        res.status(201).json(news);

    } 
    catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

});



// Get All News
router.get("/", async (req, res) => {

    try {

        const news = await News.find();

        res.status(200).json(news);

    } 
    catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

});


module.exports = router;