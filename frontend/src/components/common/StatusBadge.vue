<template>
  <el-tag :type="type" effect="light">{{ displayValue }}</el-tag>
</template>

<script setup lang="ts">
const props = defineProps<{ value: string; labelMap?: Record<string, string> }>();
const type =
  ["Active", "Approved", "Safe", "Completed"].includes(props.value)
    ? "success"
    : ["Rejected", "Toxic", "Explosive", "Suspended", "Archived"].includes(props.value)
    ? "danger"
    : ["Pending", "Submitted", "Irritant", "Corrosive", "Flammable", "RevisionRequired"].includes(props.value)
    ? "warning"
    : "info";
const defaultMap: Record<string, string> = {
  Pending: "待审批",
  Approved: "已批准",
  Rejected: "已驳回",
  Submitted: "已提交",
  Draft: "草稿",
  RevisionRequired: "需修订"
};
const displayValue = (props.labelMap ?? defaultMap)[props.value] ?? props.value;
</script>
