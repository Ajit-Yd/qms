import { moduleCollectionHandlers } from "@/src/lib/module-route-factory";
const handlers = moduleCollectionHandlers("nonconformances");
export const GET = handlers.GET;
export const POST = handlers.POST;
