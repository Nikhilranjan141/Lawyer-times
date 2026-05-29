const mongoose=require("mongoose")

const newsSchema=
new mongoose.Schema({

title:{
type:String,
required:true
},

category:String,

description:String,

image:String

},
{
timestamps:true
}
)

module.exports=
mongoose.model(
"News",
newsSchema
)