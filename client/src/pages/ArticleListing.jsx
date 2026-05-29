import LegalContentPage from "../components/LegalContentPage";

function ArticleListing() {
  return (
    <LegalContentPage
      category="articles"
      title="Articles"
      breadcrumb={[{ label: "Articles" }]}
      headerAction={{ label: "Publish Article", href: "/articles/submit" }}
    />
  );
}

export default ArticleListing;
