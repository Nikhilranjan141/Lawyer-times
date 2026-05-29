const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
	{
		articleId: String,
		articleTitle: String,
		message: String,
		type: {
			type: String,
			enum: ["approval", "rejection", "submission"],
			default: "submission",
		},
		read: {
			type: Boolean,
			default: false,
		},
		reason: String,
	},
	{ timestamps: true }
);

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
		},
		notifications: [notificationSchema],
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

