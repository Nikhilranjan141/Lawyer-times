import axios from "axios";
import { slugify } from "../utils/slugify";

export const API =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

export const getNews = async () => {

    try {

        const response = await axios.get(
            `${API}/api/news`
        );

        return response.data;

    }
    catch (error) {

        console.log(
            "Error fetching news:",
            error
        );

        return [];

    }

};

export const getLegalContent = async (params = {}) => {

    const category =
        String(params.category || "")
        .toLowerCase();

    const court =
        String(params.court || "")
        .trim();

    let endpoint =
        "/api/legal/legalnews";

    if (court) {

        // fixed
        const courtSlug =
            slugify(court);

        endpoint =
            `/api/legal/highcourt/${courtSlug}`;

    }
    else if (
        category === "supreme-court"
    ) {

        endpoint =
            "/api/legal/supreme";

    }
    else if (
        category === "constitutional-law"
    ) {

        endpoint =
            "/api/legal/constitutional";

    }
    else if (
        category === "judgments"
    ) {

        endpoint =
            "/api/legal/judgments";

    }
    else if (
        category === "legal-news"
    ) {

        endpoint =
            "/api/legal/legalnews";

    }

    try {

        console.log(
            "Fetching:",
            `${API}${endpoint}`
        );

        const response =
            await axios.get(
                `${API}${endpoint}`,
                { params }
            );

        return response.data;

    }
    catch (error) {

        console.log(
            "Error fetching legal content:",
            error.response?.data ||
            error
        );

        throw error;

    }

};

export const getLegalContentItem = async (
    slug,
    params = {},
    options = {}
) => {

    try {

        const response =
            await axios.get(

                `${API}/api/legal/article/${encodeURIComponent(
                   String(
                    params.docid ||
                    slug ||
                    ""
                ).trim()
                )}`,

                {
                    params,
                    timeout: options.timeout
                }

            );

        return response.data;

    }

    catch (error) {

        console.log(
            "Error fetching legal content item:",
            error.response?.data ||
            error
        );

        throw error;

    }

};