const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeLiveLawCourt(
	url = "",
	court = ""
) {

	try {

		const response =
			await axios.get(url, {

				headers: {

					"User-Agent":
						"Mozilla/5.0"

				}

			});

		const $ =
			cheerio.load(
				response.data
			);

		const articles =
			[];

		$("a").each(
			(_, el) => {

				const href =
					$(el).attr("href");

				const title =
					$(el)
						.text()
						.trim();

				const image =
					$(el)
						find("img")
						.attr("src");

				if (
					!href ||
					!title
				) {

					return;

				}

				if (
					title.length < 20
				) {

					return;

				}

				if (
					!href.includes(
						"/high-court/"
					)
				) {

					return;

				}

				const fullLink =
					href.startsWith(
						"http"
					)
						? href
						: `https://www.livelaw.in${href}`;

				articles.push({

					id:
						fullLink,

					docid:
						fullLink,

					title,

					summary:
						title,

					content:
						title,

					link:
						fullLink,

					sourceUrl:
						fullLink,

					image:
						image || "",

					court,

					category:
						"highcourt",

					source:
						"LiveLaw",

					publishDate:
						new Date(),

					slug:
						title
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, "-")

				});

			}
		);

		const unique =
			Array.from(

				new Map(

					articles.map(
						(item) => [

							item.link,

							item

						]
					)

				).values()

			);

		console.log(
			"LIVELAW SCRAPED",
			court,
			unique.length
		);

		return unique.slice(0, 20);

	}

	catch (error) {

		console.log(
			"LIVELAW SCRAPER ERROR",
			error.message
		);

		return [];

	}

}

module.exports = {

	scrapeLiveLawCourt

};