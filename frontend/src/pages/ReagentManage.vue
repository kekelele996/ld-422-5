<template>
  <div class="reagent-manage-page">
    <el-card class="header-card" shadow="never">
      <div class="header">
        <div>
          <h2 class="page-title">试剂管理</h2>
          <p class="page-subtitle">查看试剂库存及领用历史记录</p>
        </div>
      </div>
    </el-card>

    <div class="content-layout">
      <el-card class="list-card" shadow="never">
        <el-table
          :data="reagentStore.items"
          v-loading="loading"
          stripe
          highlight-current-row
          @current-change="handleCurrentChange"
          style="width: 100%"
          empty-text="暂无试剂"
        >
          <el-table-column prop="name" label="试剂名称" min-width="140">
            <template #default="{ row }">
              <div class="reagent-name-cell">
                <span class="name">{{ row.name }}</span>
                <StatusBadge v-if="row.stock < row.minStock" value="Pending" :label-map="{ Pending: '低库存' }" />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="库存" width="130" align="right">
            <template #default="{ row }">
              <span :class="{ 'low-stock': row.stock < row.minStock }">
                {{ row.stock }}
                <span class="unit">{{ row.unit }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="存放位置" width="120" show-overflow-tooltip />
          <el-table-column label="危险性" width="100">
            <template #default="{ row }">
              <StatusBadge :value="row.hazardLevel" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card v-if="selected" class="detail-card" shadow="never">
        <div class="detail-header">
          <div>
            <h3 class="detail-title">{{ selected.name }}</h3>
            <p class="detail-subtitle">{{ selected.casNo }} · {{ selected.formula }}</p>
          </div>
          <StockAlert v-if="selected.stock < selected.minStock" :name="selected.name" :stock="selected.stock" :min-stock="selected.minStock" />
        </div>

        <el-descriptions :column="2" border class="info-section">
          <el-descriptions-item label="纯度">{{ selected.purity }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ selected.supplier }}</el-descriptions-item>
          <el-descriptions-item label="储存条件">
            <StatusBadge :value="selected.storageCondition" />
          </el-descriptions-item>
          <el-descriptions-item label="存放位置">{{ selected.location }}</el-descriptions-item>
          <el-descriptions-item label="当前库存" :span="2">
            <span :class="{ 'low-stock': selected.stock < selected.minStock, 'stock-ok': selected.stock >= selected.minStock }">
              <strong>{{ selected.stock }}</strong> {{ selected.unit }}
              <span class="min-stock-tip">（预警值：{{ selected.minStock }}）</span>
            </span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">
          <span class="divider-title">领用历史（含审批状态）</span>
        </el-divider>

        <el-table
          :data="detail?.usageHistory ?? []"
          stripe
          size="small"
          style="width: 100%"
          empty-text="暂无领用记录"
        >
          <el-table-column prop="usedAt" label="领用日期" width="110" />
          <el-table-column label="数量" width="90" align="right">
            <template #default="{ row }">
              <span :class="row.approvalStatus === 'Approved' ? 'qty-used' : 'qty-pending'">{{ row.quantity }}</span>
            </template>
          </el-table-column>
          <el-table-column label="申请人" width="90">
            <template #default="{ row }">{{ getUserName(row.userId) }}</template>
          </el-table-column>
          <el-table-column prop="purpose" label="用途" min-width="110" show-overflow-tooltip />
          <el-table-column label="审批状态" width="90">
            <template #default="{ row }">
              <StatusBadge :value="row.approvalStatus" />
            </template>
          </el-table-column>
          <el-table-column label="审批人" width="90">
            <template #default="{ row }">{{ row.approverId ? getUserName(row.approverId) : "-" }}</template>
          </el-table-column>
          <el-table-column label="审批意见" min-width="100" show-overflow-tooltip>
            <template #default="{ row }">{{ row.approvalComment || "-" }}</template>
          </el-table-column>
        </el-table>

        <el-empty v-if="(detail?.usageHistory?.length ?? 0) === 0" description="暂无领用记录" :image-size="80" />
      </el-card>

      <el-card v-else class="detail-card empty-detail" shadow="never">
        <el-empty description="请从左侧选择一个试剂查看详情" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import StockAlert from "../components/common/StockAlert.vue";
import { useReagentStore } from "../stores/reagentStore";
import { reagentApi } from "../api/reagent";
import type { Reagent, ReagentDetail } from "../types/reagent";

const reagentStore = useReagentStore();
const loading = ref(false);
const selectedId = ref<string>("");
const detail = ref<ReagentDetail | null>(null);

const selected = computed<Reagent | null>(() => {
  return reagentStore.items.find((r) => r.id === selectedId.value) ?? null;
});

function getUserName(id: string) {
  const nameMap: Record<string, string> = {
    "u-admin": "平台管理员",
    "u-pi": "王教授",
    "u-researcher": "李博士",
    "u-student": "赵同学"
  };
  return nameMap[id] ?? id;
}

function handleCurrentChange(row: Reagent | undefined) {
  if (row) selectedId.value = row.id;
}

async function loadDetail() {
  if (!selectedId.value) return;
  try {
    detail.value = await reagentApi.detail(selectedId.value);
  } catch (_) {
    detail.value = null;
  }
}

watch(selectedId, loadDetail);

onMounted(async () => {
  loading.value = true;
  try {
    await reagentStore.load();
    if (reagentStore.items.length > 0) {
      selectedId.value = reagentStore.items[0].id;
      await loadDetail();
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
.reagent-manage-page {
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

.content-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 16px;
  align-items: start;
}

.list-card {
  max-height: 70vh;
  overflow: auto;
}

.detail-card {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }
  .detail-title {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }
  .detail-subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
    font-family: monospace;
  }
  .info-section {
    margin-bottom: 4px;
  }
  .divider-title {
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }
  .stock-ok {
    color: #059669;
  }
  .low-stock {
    color: #dc2626;
    font-weight: 600;
  }
  .unit {
    font-size: 12px;
    color: #9ca3af;
    font-weight: normal;
    margin-left: 2px;
  }
  .min-stock-tip {
    font-size: 12px;
    color: #9ca3af;
    font-weight: normal;
    margin-left: 8px;
  }
  .qty-used {
    color: #059669;
    font-weight: 600;
  }
  .qty-pending {
    color: #d97706;
  }
}

.empty-detail {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reagent-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  .name {
    font-weight: 500;
  }
}
</style>
