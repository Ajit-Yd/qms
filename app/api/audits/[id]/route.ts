import { moduleItemHandlers } from "@/src/lib/module-route-factory";
const handlers = moduleItemHandlers("audits");
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
