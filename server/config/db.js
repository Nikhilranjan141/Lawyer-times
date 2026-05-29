// const mongoose=require("mongoose");

// const connectDB=async()=>{

// try{

// await mongoose.connect(
// process.env.MONGO_URI
// )

// console.log("MongoDB Connected")

// }

// catch(error){

// console.log(
// "DB Error:",
// error.message
// )

// process.exit(1)

// }

// }

// module.exports=connectDB














const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("MONGO URI EXISTS:", !!process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");
  } catch (error) {
    console.log("FULL DB ERROR:", error);
    console.log("DB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
