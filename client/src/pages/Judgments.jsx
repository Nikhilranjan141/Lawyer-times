import LegalContentPage from "../components/LegalContentPage";

function Judgments() {
  return (
    <LegalContentPage
      category="judgments"
      title="Judgments"
      breadcrumb={[{ label: "Judgments" }]}
    />
  );
}

export default Judgments;
