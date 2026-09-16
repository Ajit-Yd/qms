import { ModuleRoute, resolveModule } from "@/app/module-routes";

export default async function NewModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <ModuleRoute module={resolveModule(module)} view="new" />;
}
