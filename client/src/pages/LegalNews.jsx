import LegalContentPage from "../components/LegalContentPage";

function LegalNews() {
  return (
    <LegalContentPage
      category="legal-news"
      title="Legal News"
      breadcrumb={[{ label: "Legal News" }]}
    />
  );
}

export default LegalNews;
