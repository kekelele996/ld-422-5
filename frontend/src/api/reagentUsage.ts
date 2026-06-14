import { API_PATHS } from "../constants/apiPaths";
import { request } from "../utils/request";
import type { ReagentUsage } from "../types/reagent";

export const reagentUsageApi = {
  list: (reagentId = "", userId = "", status = "") =>
    request<ReagentUsage[]>(
      `${API_PATHS.reagentUsages}?reagentId=${reagentId}&userId=${userId}&status=${status}`
    ),
  get: (id: string) => request<ReagentUsage>(`${API_PATHS.reagentUsages}/${id}`),
  create: (payload: Partial<ReagentUsage>) =>
    request<ReagentUsage>(API_PATHS.reagentUsages, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  approve: (id: string, comment = "") =>
    request<ReagentUsage>(`${API_PATHS.reagentUsages}/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ comment })
    }),
  reject: (id: string, comment = "") =>
    request<ReagentUsage>(`${API_PATHS.reagentUsages}/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ comment })
    })
};
