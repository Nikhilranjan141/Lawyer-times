import { slugify } from "../utils/slugify";

const SUPREME_COURT_ITEMS = [
  "SC Judgements",
];

export const SUPREME_COURT = SUPREME_COURT_ITEMS.map((name) => ({
  name,
  slug: slugify(name),
}));
