import { moduleCommentHandlers } from "@/src/lib/module-route-factory";
const handlers = moduleCommentHandlers("nonconformances");
export const GET = handlers.GET;
export const POST = handlers.POST;
