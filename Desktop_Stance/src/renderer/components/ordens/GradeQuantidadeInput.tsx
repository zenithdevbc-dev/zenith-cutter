import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProdutoTamanho } from "@shared/models";

interface GradeQuantidadeInputProps {
  grade: ProdutoTamanho[];
  quantidades: Record<string, string>;
  onChange: (produtoTamanhoId: string, value: string) => void;
}

/**
 * Quantidade por tamanho da grade — grade compacta (tipo tabela) em
 * vez de lista contínua de uma linha por tamanho, pra aproveitar
 * melhor o espaço em grades com muitos tamanhos (pedido do usuário,
 * 2026-07-16). Compartilhado entre Criar e Editar Ordem de Corte.
 */
export function GradeQuantidadeInput({
  grade,
  quantidades,
  onChange,
}: GradeQuantidadeInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Quantidade por tamanho</Label>
      {grade.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este produto ainda não tem grade de tamanhos cadastrada.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {grade.map((t) => (
            <div key={t.id} className="flex flex-col gap-1 rounded-md border p-2">
              <span className="truncate text-center text-xs font-medium text-muted-foreground">
                {t.tamanho}
              </span>
              <Input
                type="number"
                min={0}
                value={quantidades[t.id] ?? ""}
                onChange={(e) => onChange(t.id, e.target.value)}
                className="h-8 px-1 text-center"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
