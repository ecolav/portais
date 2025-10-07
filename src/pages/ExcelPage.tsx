import ExcelUploadPanel from '../components/panels/ExcelUploadPanel';
import PageHeader from '../components/PageHeader';

export default function ExcelPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Planilha Excel"
        subtitle="Upload e gerenciamento de dados para comparação com TIDs"
      />

      <ExcelUploadPanel />
    </div>
  );
}
