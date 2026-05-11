import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
});

export type AlertOut = {
  id: number;
  received_time: string;
  folder: string;
  alert: string;
  hostname: string;
  ip: string;
  mac: string;
  user: string;
  segment: string;
  policy_name?: string | null;
  domain?: string | null;
  gateway?: string | null;
  recurrence?: number | null;
  has_confirmation?: boolean | null;
  confirmation_time?: string | null;
   os?: string | null;
   nic_vendor?: string | null;
};

export type Dashboard = {
  total_alerts: number;
  top_alerts: { label: string; count: number }[];
  top_reincidences: { label: string; count: number }[];
  severity_breakdown: { label: string; count: number }[];
  latest_blocks: AlertOut[];
  /** Conteos reales por día (label YYYY-MM-DD), últimos 7 días */
  alerts_by_day: { label: string; count: number }[];
  blocks_by_day: { label: string; count: number }[];
  /** Hostnames con al menos 2 alertas en toda la base */
  hosts_with_reincidence: number;
};

export type OpsDashboard = {
  kpis: {
    window_days: number;
    pending_hours: number;
    total_blocks_window: number;
    confirmed_blocks_window: number;
    confirm_rate_window: number; // 0..1
    backlog_pending: number;
    backlog_over_24h: number;
    backlog_over_48h: number;
    p50_time_to_confirm_minutes?: number | null;
    p90_time_to_confirm_minutes?: number | null;
  };
  top_segments_pending: { label: string; count: number }[];
  pending_blocks: {
    received_time: string;
    age_minutes: number;
    recurrence: number;
    ip: string;
    mac: string;
    hostname: string;
    segment: string;
    policy_name?: string | null;
    os: string;
    nic_vendor: string;
    gateway?: string | null;
  }[];
  data_quality: {
    window_days: number;
    total_rows: number;
    pct_with_segment: number;
    pct_with_hostname: number;
    pct_with_ip: number;
    pct_with_mac: number;
    pct_with_os: number;
    pct_with_nic_vendor: number;
  };
};

export function formatDateTimeCO(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("es-CO", {
    hour12: true,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

