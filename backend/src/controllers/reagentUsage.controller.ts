import type { User } from "../types/interfaces.ts";
import { reagentUsageService } from "../services/reagentUsage.service.ts";
import { auditLogMiddleware } from "../middlewares/auditLog.middleware.ts";

export const reagentUsageController = {
  list(query: URLSearchParams) {
    return reagentUsageService.list(
      query.get("reagentId") ?? "",
      query.get("userId") ?? "",
      query.get("status") ?? ""
    );
  },
  get(id: string) {
    return reagentUsageService.getDetail(id);
  },
  create(user: User, body: Record<string, unknown>) {
    const usage = reagentUsageService.create(body as never, user.id);
    auditLogMiddleware(user, "CREATE_REAGENT_USAGE", "ReagentUsage", usage.id);
    return usage;
  },
  approve(user: User, id: string, body: Record<string, unknown>) {
    const usage = reagentUsageService.approve(id, user, (body.comment as string) ?? "");
    auditLogMiddleware(user, "APPROVE_REAGENT_USAGE", "ReagentUsage", usage.id);
    return usage;
  },
  reject(user: User, id: string, body: Record<string, unknown>) {
    const usage = reagentUsageService.reject(id, user, (body.comment as string) ?? "");
    auditLogMiddleware(user, "REJECT_REAGENT_USAGE", "ReagentUsage", usage.id);
    return usage;
  }
};
