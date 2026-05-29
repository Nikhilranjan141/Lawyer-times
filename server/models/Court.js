const mongoose = require("mongoose");


// News schema

const newsSchema = new mongoose.Schema({

    title: {

        type: String,

        required: true

    },

    image: {

        type: String,

        default: ""

    },

    author: {

        type: String,

        default: "Lawyers Times"

    },

    description: {

        type: String,

        default: ""

    }

});



// Court schema

const courtSchema = new mongoose.Schema({

    name: {

        type: String,

        required: true

    },

    slug: {

        type: String,

        required: true,

        unique: true

    },

    image: {

        type: String,

        default: ""

    },

    description: {

        type: String,

        default: ""

    },


    news: [newsSchema]

},
{
    timestamps: true
});



module.exports = mongoose.model(
    "Court",
    courtSchema
);