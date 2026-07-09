import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProdutoDialog } from "@/components/produtos/CreateProdutoDialog";
import { EditProdutoDialog } from "@/components/produtos/EditProdutoDialog";
import { listProdutos, updateProduto } from "@/lib/produtos";
import type { Produto } from "@shared/models";

export function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);

  useEffect(() => {
    listProdutos()
      .then(setProdutos)
      .catch(() => toast.error("Não foi possível carregar a lista de produtos."));
  }, []);

  function upsertLocal(produto: Produto) {
    setProdutos((prev) => {
      if (!prev) return [produto];
      const idx = prev.findIndex((p) => p.id === produto.id);
      if (idx === -1) return [...prev, produto].sort((a, b) => a.nome.localeCompare(b.nome));
      const next = [...prev];
      next[idx] = produto;
      return next;
    });
  }

  async function handleToggleAtivo(produto: Produto, ativo: boolean) {
    try {
      const updated = await updateProduto(produto.id, { ativo });
      upsertLocal(updated);
      toast.success(ativo ? "Produto reativado." : "Produto desativado.");
    } catch {
      toast.error("Não foi possível atualizar o status do produto.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Produtos</CardTitle>
        <CreateProdutoDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent>
        {produtos === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : produtos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {produto.codigo ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {produto.descricao ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={produto.ativo}
                      onCheckedChange={(checked) => handleToggleAtivo(produto, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditProdutoDialog produto={produto} onUpdated={upsertLocal} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
