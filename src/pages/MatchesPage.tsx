import RFIDMatchesPanel from '../components/panels/RFIDMatchesPanel';
import PageHeader from '../components/PageHeader';

export default function MatchesPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Correspondências"
        subtitle="TIDs que corresponderam aos dados da planilha Excel"
      />

      <RFIDMatchesPanel />
    </div>
  );
}
