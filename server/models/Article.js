const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
	{
		articleId: {
			type: String,
			unique: true,
			index: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		shortDescription: {
			type: String,
			default: "",
		},
		content: {
			type: String,
			default: "",
		},
		featuredImage: {
			type: String,
			default: "",
		},
		category: {
			type: String,
			required: true,
			trim: true,
		},
		categorySlug: {
			type: String,
			required: true,
			index: true,
		},
		tags: [
			{
				type: String,
				trim: true,
			},
		],
		status: {
			type: String,
			enum: ["draft", "pending", "approved", "rejected"],
			default: "pending",
			index: true,
		},
		author: {
			userId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
			name: String,
			email: String,
		},
		submissionDate: {
			type: Date,
			default: Date.now,
			index: true,
		},
		publishedAt: Date,
		approvedBy: {
			userId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
			name: String,
			email: String,
		},
		rejectionReason: {
			type: String,
			default: "",
		},
		adminNotes: {
			type: String,
			default: "",
		},
		readTime: {
			type: String,
			default: "1 min read",
		},
		isPublished: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

articleSchema.pre("save", function saveArticle(next) {
	if (!this.articleId) {
		this.articleId = `ART-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
	}

	next();
});

module.exports = mongoose.model("Article", articleSchema);

