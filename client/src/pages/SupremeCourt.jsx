import LegalContentPage from "../components/LegalContentPage";

function SupremeCourt() {
  return (
    <LegalContentPage
      category="supreme-court"
      title="Supreme Court"
      breadcrumb={[{ label: "Supreme Court" }]}
    />
  );
}

export default SupremeCourt;
