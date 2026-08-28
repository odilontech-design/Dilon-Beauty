import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { listCategories } from "@/app/actions/financeiro";
import { ImportClient } from "./ImportClient";

export default async function ImportarExtratoPage() {
  await requireTenant();
  const categories = await listCategories();

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-1">Importar Extrato</h1>
      <p className="text-xs text-gray-500 mb-6">
        Envie o extrato (CSV ou OFX) de qualquer banco. A gente sugere a categoria de cada
        lançamento — você revisa e confirma antes de salvar.
      </p>

      <Card className="mb-6">
        <div className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-navy">Antes de importar:</strong> separe os extratos por conta.
          Um arquivo é sempre de <strong>uma</strong> conta só — Pessoa Jurídica (CNPJ) ou Pessoa
          Física (CPF). Se você movimenta as duas contas, importe uma de cada vez.
        </div>
      </Card>

      <ImportClient
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          flow: c.flow,
          owner: c.owner,
        }))}
      />
    </div>
  );
}
