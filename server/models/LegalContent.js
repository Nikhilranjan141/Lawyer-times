const mongoose = require("mongoose");

const legalContentSchema = new mongoose.Schema(
	{
		docid: {
			type: String,
			default: "",
			unique: true,
			index: true,
		},
		sourceKey: {
			type: String,
			unique: true,
			index: true,
		},
		sourceId: {
			type: String,
			default: "",
			index: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		summary: {
			type: String,
			default: "",
		},
		headline: {
			type: String,
			default: "",
		},
		slug: {
			type: String,
			default: "",
			index: true,
		},
		fullContent: {
			type: String,
			default: "",
		},
		publishDate: {
			type: Date,
			default: Date.now,
			index: true,
		},
		publishdate: {
			type: Date,
			default: Date.now,
			index: true,
		},
		court: {
			type: String,
			default: "",
			index: true,
		},
		courtCategory: {
			type: String,
			default: "",
			index: true,
		},
		courtSlug: {
			type: String,
			default: "",
			index: true,
		},
		category: {
			type: String,
			default: "Legal News",
		},
		categorySlug: {
			type: String,
			default: "legal-news",
			index: true,
		},
		sectionKey: {
			type: String,
			default: "legal-news",
			index: true,
		},
		source: {
			type: String,
			enum: ["indian-kanoon", "rss", "admin"],
			required: true,
			index: true,
		},
		author: {
			type: String,
			default: "Lawyers Times",
		},
		link: {
			type: String,
			default: "",
		},
		sourceUrl: {
			type: String,
			default: "",
			index: true,
		},
		image: {
			type: String,
			default: "",
		},
		aliasesMatched: [
			{
				type: String,
				trim: true,
			},
		],
		classificationScore: {
			type: Number,
			default: 0,
			index: true,
		},
		tags: [
			{
				type: String,
				trim: true,
			},
		],
		readTime: {
			type: String,
			default: "1 min read",
		},
		score: {
			type: Number,
			default: 0,
		},
		raw: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
		sourceReference: {
			type: String,
			default: "",
		},
		sourceFetchedAt: {
			type: Date,
			default: Date.now,
			index: true,
		},
	},
	{ timestamps: true }
);

legalContentSchema.index({ categorySlug: 1, publishDate: -1 });
legalContentSchema.index({ courtSlug: 1, publishDate: -1 });
legalContentSchema.index({ title: "text", summary: "text", tags: "text" });

module.exports = mongoose.model("LegalContent", legalContentSchema);
