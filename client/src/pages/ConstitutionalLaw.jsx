import LegalContentPage from "../components/LegalContentPage";

function ConstitutionalLaw() {
  return (
    <LegalContentPage
      category="constitutional-law"
      title="Constitutional Law"
      breadcrumb={[{ label: "Constitutional Law" }]}
    />
  );
}

export default ConstitutionalLaw;
