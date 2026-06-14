<template>
  <div class="reagent-usages-page">
    <el-card class="header-card" shadow="never">
      <div class="header">
        <div>
          <h2 class="page-title">试剂领用管理</h2>
          <p class="page-subtitle">审批通过后自动扣减库存并生成记录</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
          提交领用申请
        </el-button>
      </div>
    </el-card>

    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filter" class="filter-form">
        <el-form-item label="审批状态">
          <el-select v-model="filter.status" placeholder="全部" clearable style="width: 140px" @change="loadUsages">
            <el-option label="待审批" value="Pending" />
            <el-option label="已批准" value="Approved" />
            <el-option label="已驳回" value="Rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="筛选试剂">
          <el-select v-model="filter.reagentId" placeholder="全部试剂" clearable style="width: 200px" @change="loadUsages">
            <el-option v-for="r in reagentStore.items" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table
        :data="usages"
        v-loading="loading"
        stripe
        style="width: 100%"
        empty-text="暂无领用记录"
      >
        <el-table-column prop="id" label="申请编号" width="140" />
        <el-table-column prop="usedAt" label="领用日期" width="120" />
        <el-table-column label="试剂信息" min-width="160">
          <template #default="{ row }">
            <div class="reagent-info">
              <span class="reagent-name">{{ getReagentName(row.reagentId) }}</span>
              <span v-if="getReagent(row.reagentId)" class="reagent-unit">
                {{ getReagent(row.reagentId)?.unit }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100" align="right">
          <template #default="{ row }">
            <span class="quantity">{{ row.quantity }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ getUserName(row.userId) }}</template>
        </el-table-column>
        <el-table-column prop="purpose" label="用途" min-width="140" show-overflow-tooltip />
        <el-table-column label="审批状态" width="110">
          <template #default="{ row }">
            <StatusBadge :value="row.approvalStatus" />
          </template>
        </el-table-column>
        <el-table-column label="审批人" width="110">
          <template #default="{ row }">{{ row.approverId ? getUserName(row.approverId) : "-" }}</template>
        </el-table-column>
        <el-table-column label="审批意见" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.approvalComment || "-" }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="row.approvalStatus === 'Pending'">
              <el-button type="success" size="small" :icon="Check" @click="handleApprove(row)">
                批准
              </el-button>
              <el-button type="danger" size="small" :icon="Close" @click="handleReject(row)">
                驳回
              </el-button>
            </template>
            <el-button type="primary" size="small" link @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showCreateDialog" title="提交领用申请" width="520px" @closed="resetCreateForm">
      <el-form :model="createForm" ref="createFormRef" :rules="createRules" label-width="90px">
        <el-form-item label="选择试剂" prop="reagentId">
          <el-select v-model="createForm.reagentId" placeholder="请选择试剂" style="width: 100%" filterable>
            <el-option v-for="r in reagentStore.items" :key="r.id" :label="`${r.name} (库存: ${r.stock}${r.unit})`" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="领用数量" prop="quantity">
          <el-input-number v-model="createForm.quantity" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="领用日期" prop="usedAt">
          <el-date-picker v-model="createForm.usedAt" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="关联实验" prop="experimentId">
          <el-select v-model="createForm.experimentId" placeholder="请选择实验记录" style="width: 100%" filterable>
            <el-option v-for="e in experiments" :key="e.id" :label="e.title" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用途说明" prop="purpose">
          <el-input v-model="createForm.purpose" type="textarea" :rows="2" placeholder="请说明领用用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">提交申请</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCommentDialog" :title="commentDialogTitle" width="460px">
      <el-form :model="commentForm" label-width="80px">
        <el-form-item label="审批意见">
          <el-input v-model="commentForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCommentDialog = false">取消</el-button>
        <el-button :type="commentAction === 'approve' ? 'success' : 'danger'" :loading="approving" @click="confirmAction">
          {{ commentAction === "approve" ? "确认批准" : "确认驳回" }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="showDetailDrawer" title="领用详情" size="480px">
      <template v-if="detailData">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="申请编号">{{ detailData.id }}</el-descriptions-item>
          <el-descriptions-item label="审批状态">
            <StatusBadge :value="detailData.approvalStatus" />
          </el-descriptions-item>
          <el-descriptions-item label="试剂名称">{{ getReagentName(detailData.reagentId) }}</el-descriptions-item>
          <el-descriptions-item label="领用数量">{{ detailData.quantity }} {{ getReagent(detailData.reagentId)?.unit }}</el-descriptions-item>
          <el-descriptions-item label="领用日期">{{ detailData.usedAt }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ getUserName(detailData.userId) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(detailData.submittedAt) }}</el-descriptions-item>
          <el-descriptions-item label="关联实验">{{ getExperimentTitle(detailData.experimentId) }}</el-descriptions-item>
          <el-descriptions-item label="用途说明">{{ detailData.purpose }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.approverId" label="审批人">{{ getUserName(detailData.approverId) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.approvedAt" label="审批时间">{{ formatDate(detailData.approvedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.approvalComment" label="审批意见">{{ detailData.approvalComment }}</el-descriptions-item>
        </el-descriptions>
        <el-divider v-if="detailData.approvalStatus === 'Pending'" />
        <div v-if="detailData.approvalStatus === 'Pending'" class="detail-actions">
          <el-button type="success" :icon="Check" @click="handleApprove(detailData)">批准</el-button>
          <el-button type="danger" :icon="Close" @click="handleReject(detailData)">驳回</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Check, Close } from "@element-plus/icons-vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import { reagentUsageApi } from "../api/reagentUsage";
import { useReagentStore } from "../stores/reagentStore";
import type { ReagentUsage } from "../types/reagent";
import type { ExperimentRecord } from "../types/experiment";
import type { User } from "../types";

const reagentStore = useReagentStore();
const loading = ref(false);
const submitting = ref(false);
const approving = ref(false);
const usages = ref<ReagentUsage[]>([]);
const experiments = ref<ExperimentRecord[]>([]);
const users = ref<User[]>([]);

const filter = reactive({
  status: "",
  reagentId: ""
});

const showCreateDialog = ref(false);
const createFormRef = ref<FormInstance>();
const createForm = reactive({
  reagentId: "",
  quantity: 1,
  usedAt: new Date().toISOString().slice(0, 10),
  experimentId: "",
  purpose: ""
});
const createRules: FormRules = {
  reagentId: [{ required: true, message: "请选择试剂", trigger: "change" }],
  quantity: [{ required: true, message: "请输入数量", trigger: "blur" }],
  experimentId: [{ required: true, message: "请选择实验记录", trigger: "change" }]
};

const showCommentDialog = ref(false);
const commentAction = ref<"approve" | "reject">("approve");
const commentForm = reactive({ comment: "" });
const currentActionRow = ref<ReagentUsage | null>(null);
const commentDialogTitle = computed(() => (commentAction.value === "approve" ? "批准领用申请" : "驳回领用申请"));

const showDetailDrawer = ref(false);
const detailData = ref<ReagentUsage | null>(null);

function resetCreateForm() {
  Object.assign(createForm, {
    reagentId: "",
    quantity: 1,
    usedAt: new Date().toISOString().slice(0, 10),
    experimentId: "",
    purpose: ""
  });
  createFormRef.value?.resetFields();
}

function getReagent(id: string) {
  return reagentStore.items.find((r) => r.id === id);
}

function getReagentName(id: string) {
  return getReagent(id)?.name ?? id;
}

function getUserName(id: string) {
  const nameMap: Record<string, string> = {
    "u-admin": "平台管理员",
    "u-pi": "王教授",
    "u-researcher": "李博士",
    "u-student": "赵同学"
  };
  return nameMap[id] ?? users.value.find((u) => u.id === id)?.name ?? id;
}

function getExperimentTitle(id: string) {
  return experiments.value.find((e) => e.id === id)?.title ?? id;
}

function formatDate(s: string) {
  return s ? new Date(s).toLocaleString("zh-CN") : "-";
}

async function loadUsages() {
  loading.value = true;
  try {
    usages.value = await reagentUsageApi.list(filter.reagentId, "", filter.status);
  } catch (e: any) {
    ElMessage.error(e.message ?? "加载失败");
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await reagentUsageApi.create({ ...createForm });
    ElMessage.success("领用申请已提交，等待审批");
    showCreateDialog.value = false;
    resetCreateForm();
    await loadUsages();
    await reagentStore.load();
  } catch (e: any) {
    ElMessage.error(e.message ?? "提交失败");
  } finally {
    submitting.value = false;
  }
}

function handleApprove(row: ReagentUsage) {
  currentActionRow.value = row;
  commentAction.value = "approve";
  commentForm.comment = "";
  showCommentDialog.value = true;
}

function handleReject(row: ReagentUsage) {
  currentActionRow.value = row;
  commentAction.value = "reject";
  commentForm.comment = "";
  showCommentDialog.value = true;
}

async function confirmAction() {
  if (!currentActionRow.value) return;
  approving.value = true;
  try {
    if (commentAction.value === "approve") {
      await reagentUsageApi.approve(currentActionRow.value.id, commentForm.comment);
      ElMessage.success("已批准，库存已扣减");
    } else {
      await reagentUsageApi.reject(currentActionRow.value.id, commentForm.comment);
      ElMessage.info("已驳回");
    }
    showCommentDialog.value = false;
    showDetailDrawer.value = false;
    await loadUsages();
    await reagentStore.load();
  } catch (e: any) {
    ElMessage.error(e.message ?? "操作失败");
  } finally {
    approving.value = false;
  }
}

function showDetail(row: ReagentUsage) {
  detailData.value = row;
  showDetailDrawer.value = true;
}

onMounted(async () => {
  await reagentStore.load();
  await loadUsages();
});
</script>

<style scoped lang="scss">
.reagent-usages-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .page-title {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 600;
    color: #1f2937;
  }
  .page-subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
  }
}

.filter-card {
  .filter-form {
    margin: 0;
  }
}

.table-card {
  .reagent-info {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .reagent-name {
    font-weight: 500;
    color: #1f2937;
  }
  .reagent-unit {
    font-size: 12px;
    color: #9ca3af;
  }
  .quantity {
    font-weight: 600;
    color: #2563eb;
  }
}

.detail-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
