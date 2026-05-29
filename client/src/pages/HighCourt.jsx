import { useMemo } from "react";
import { useParams } from "react-router-dom";
import LegalContentPage from "../components/LegalContentPage";
import { HIGH_COURTS } from "../data/highCourts";
import { slugify } from "../utils/slugify";

function titleCaseFromSlug(value = "") {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function HighCourt() {
  const { slug } = useParams();

  const court = useMemo(() => {
    const normalizedSlug = slugify(slug || "");
    return HIGH_COURTS.find((entry) => entry.slug === normalizedSlug)?.name || titleCaseFromSlug(slug || "");
  }, [slug]);

  return (
    <LegalContentPage
      court={court}
      title={court}
      breadcrumb={[
        { label: "High Courts", href: "/highcourts" },
      ]}
    />
  );
}

export default HighCourt;
