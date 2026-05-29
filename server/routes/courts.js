const router = require("express").Router();
const Court = require("../models/Court");
const slugify = require("../utils/slugify");


// Get all courts
router.get("/", async (req,res)=>{

    try{

        const courts=await Court.find();

        res.json(courts);

    }

    catch(err){

        res.status(500).json(err);

    }

});

// Single court
router.get("/:slug", async(req,res)=>{

try{

let court=await Court.findOne({

slug:req.params.slug

});

if(!court){
    const normalizedSlug = slugify(req.params.slug);
    court = await Court.findOne({ slug: normalizedSlug });

    if(!court){
        const allCourts = await Court.find();
        court = allCourts.find((item) => slugify(item.name) === normalizedSlug) || null;
    }
}

if(!court){
    return res.status(404).json({ message: "Court not found" });
}

res.json(court);

}

catch(err){

res.status(500).json(err);

}

});

module.exports=router;