import { reagentUsageController } from "../controllers/reagentUsage.controller.ts";

export function reagentUsageRoutes(
  method: string,
  path: string,
  query: URLSearchParams,
  user: never,
  body: Record<string, unknown>
) {
  if (method === "GET" && path === "/api/reagent-usages")
    return reagentUsageController.list(query);
  if (method === "POST" && path === "/api/reagent-usages")
    return reagentUsageController.create(user, body);
  const detailMatch = path.match(/^\/api\/reagent-usages\/([^/]+)$/);
  if (detailMatch) {
    const id = detailMatch[1];
    if (method === "GET") return reagentUsageController.get(id);
  }
  const approveMatch = path.match(/^\/api\/reagent-usages\/([^/]+)\/approve$/);
  if (approveMatch && method === "POST")
    return reagentUsageController.approve(user, approveMatch[1], body);
  const rejectMatch = path.match(/^\/api\/reagent-usages\/([^/]+)\/reject$/);
  if (rejectMatch && method === "POST")
    return reagentUsageController.reject(user, rejectMatch[1], body);
  return undefined;
}
