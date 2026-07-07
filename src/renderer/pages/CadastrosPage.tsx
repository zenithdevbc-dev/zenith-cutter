import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsuariosPage } from "@/pages/UsuariosPage";
import { ClientesPage } from "@/pages/ClientesPage";

export function CadastrosPage() {
  return (
    <Tabs defaultValue="usuarios">
      <TabsList>
        <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
      </TabsList>
      <TabsContent value="usuarios">
        <UsuariosPage />
      </TabsContent>
      <TabsContent value="clientes">
        <ClientesPage />
      </TabsContent>
    </Tabs>
  );
}
