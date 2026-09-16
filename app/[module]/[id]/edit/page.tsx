import { ModuleRoute, resolveModule } from "@/app/module-routes";

export default async function EditModulePage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  return <ModuleRoute module={resolveModule(module)} view="edit" recordId={id} />;
}
