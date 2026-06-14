import { reagentUsages, reagents, users, experiments, members } from "../prisma/seeds/seed.ts";
import { ApprovalStatus } from "../types/enums.ts";
import type { ReagentUsage, User } from "../types/interfaces.ts";
import { ApiError } from "../utils/response.ts";

function canApprove(user: User, usage: ReagentUsage): boolean {
  if (user.role === "Admin") return true;
  if (user.role === "PI" || user.role === "SubPI") return true;
  if (user.role === "Researcher") {
    const experiment = experiments.find((e) => e.id === usage.experimentId);
    if (!experiment) return false;
    return experiment.reviewerId === user.id || experiment.experimenterId !== usage.userId;
  }
  return false;
}

export const reagentUsageService = {
  list(reagentId = "", userId = "", status = "") {
    return reagentUsages.filter(
      (item) =>
        (!reagentId || item.reagentId === reagentId) &&
        (!userId || item.userId === userId) &&
        (!status || item.approvalStatus === status)
    );
  },
  getById(id: string) {
    const usage = reagentUsages.find((item) => item.id === id);
    if (!usage) throw new ApiError(404, "USAGE_NOT_FOUND", "领用记录不存在");
    return usage;
  },
  create(input: Partial<ReagentUsage>, submitterId: string) {
    if (!input.reagentId || !input.experimentId)
      throw new ApiError(400, "USAGE_INVALID", "试剂和实验记录必填");
    const reagent = reagents.find((item) => item.id === input.reagentId);
    if (!reagent) throw new ApiError(404, "REAGENT_NOT_FOUND", "试剂不存在");
    const experiment = experiments.find((e) => e.id === input.experimentId);
    if (!experiment) throw new ApiError(404, "EXPERIMENT_NOT_FOUND", "实验记录不存在");
    const quantity = Number(input.quantity ?? 0);
    if (quantity <= 0) throw new ApiError(400, "QUANTITY_INVALID", "领用数量必须大于 0");
    if (reagent.stock < quantity)
      throw new ApiError(409, "INSUFFICIENT_STOCK", "库存不足，无法提交申请");
    const now = new Date().toISOString();
    const usage: ReagentUsage = {
      id: `use-${Date.now()}`,
      reagentId: input.reagentId,
      userId: submitterId,
      quantity,
      usedAt: input.usedAt ?? new Date().toISOString().slice(0, 10),
      experimentId: input.experimentId,
      purpose: input.purpose ?? "实验消耗",
      approvalStatus: ApprovalStatus.Pending,
      submittedAt: now
    };
    reagentUsages.unshift(usage);
    return usage;
  },
  approve(id: string, approver: User, comment = "") {
    const usage = this.getById(id);
    if (usage.approvalStatus !== ApprovalStatus.Pending)
      throw new ApiError(400, "STATUS_INVALID", "该领用记录无需审批");
    if (!canApprove(approver, usage))
      throw new ApiError(403, "FORBIDDEN", "您无权审批该领用记录");
    const reagent = reagents.find((item) => item.id === usage.reagentId);
    if (!reagent) throw new ApiError(404, "REAGENT_NOT_FOUND", "试剂不存在");
    if (reagent.stock < usage.quantity)
      throw new ApiError(409, "INSUFFICIENT_STOCK", "库存不足，无法批准");
    reagent.stock -= usage.quantity;
    usage.approvalStatus = ApprovalStatus.Approved;
    usage.approverId = approver.id;
    usage.approvedAt = new Date().toISOString();
    if (comment) usage.approvalComment = comment;
    return usage;
  },
  reject(id: string, approver: User, comment = "") {
    const usage = this.getById(id);
    if (usage.approvalStatus !== ApprovalStatus.Pending)
      throw new ApiError(400, "STATUS_INVALID", "该领用记录无需审批");
    if (!canApprove(approver, usage))
      throw new ApiError(403, "FORBIDDEN", "您无权驳回该领用记录");
    usage.approvalStatus = ApprovalStatus.Rejected;
    usage.approverId = approver.id;
    if (comment) usage.approvalComment = comment;
    return usage;
  },
  getDetail(id: string) {
    const usage = this.getById(id);
    return {
      ...usage,
      reagent: reagents.find((r) => r.id === usage.reagentId),
      user: users.find((u) => u.id === usage.userId),
      approver: usage.approverId ? users.find((u) => u.id === usage.approverId) : undefined,
      experiment: experiments.find((e) => e.id === usage.experimentId)
    };
  }
};
