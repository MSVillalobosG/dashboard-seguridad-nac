import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BugReportIcon from "@mui/icons-material/BugReport";
import PeopleIcon from "@mui/icons-material/People";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { api, Dashboard, OpsDashboard, formatDateTimeCO } from "../api";
import { LoadingCard, MaterialStatCard } from "../components";

type KV = { label: string; count: number };

const C = {
  orange: "#FB8C00",
  navy: "#1A2035",
  red: "#F44336",
  cyan: "#00BCD4",
  green: "#4CAF50",
};

function padSeries(data: KV[], targetLen: number): KV[] {
  if (data.length >= targetLen) return data.slice(0, targetLen);
  const out = [...data];
  while (out.length < targetLen) {
    out.push({ label: `·`, count: 0 });
  }
  return out;
}

/** Gráfico de línea blanco sobre fondo de color (cabecera de tarjeta). */
function HeaderLineChart(props: { data: KV[]; height?: number; padTo?: number }) {
  const h = props.height ?? 100;
  const w = 400;
  const pad = 12;
  const raw = props.data?.length ? props.data : [{ label: "-", count: 0 }];
  const series = props.padTo != null ? padSeries(raw, props.padTo) : raw;
  const max = Math.max(1, ...series.map((d) => d.count));
  const n = series.length;
  const pts = series.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
    const y = pad + (1 - d.count / max) * (h - pad * 2);
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      <path d={line} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Barras blancas en cabecera. */
function HeaderBarChart(props: { data: KV[]; height?: number }) {
  const h = props.height ?? 100;
  const w = 400;
  const pad = 10;
  const series = padSeries(props.data, 12);
  const max = Math.max(1, ...series.map((d) => d.count));
  const n = series.length;
  const gap = 4;
  const barW = Math.max(4, Math.floor((w - pad * 2 - gap * (n - 1)) / n));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden>
      {series.map((d, i) => {
        const x = pad + i * (barW + gap);
        const bh = Math.max(3, Math.round(((h - pad * 2) * d.count) / max));
        const y = h - pad - bh;
        return <rect key={i} x={x} y={y} width={barW} height={bh} rx={2} fill="#fff" opacity={0.95} />;
      })}
    </svg>
  );
}

function ChartCard(props: {
  headerColor: string;
  chart: ReactNode;
  title: string;
  subtitle: string;
  updated: string;
}) {
  return (
    <Card sx={{ overflow: "hidden", height: "100%" }}>
      <Box sx={{ bgcolor: props.headerColor, px: 1.5, pt: 1.5, pb: 0.5 }}>{props.chart}</Box>
      <CardContent sx={{ pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 400, fontSize: 18, color: "#3C4858" }}>
          {props.title}
        </Typography>
        <Typography variant="body2" color="success.main" sx={{ mt: 0.5, fontWeight: 500 }}>
          {props.subtitle}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 2, color: "text.secondary" }}>
          <AccessTimeIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption">{props.updated}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [ops, setOps] = useState<OpsDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [taskTab, setTaskTab] = useState<"alerts" | "reinc" | "blocks">("alerts");
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .get<Dashboard>("/api/dashboard")
      .then((d) => {
        if (!alive) return;
        setData(d.data);
      })
      .catch((e) => setErr(e?.message ?? "Error cargando dashboard"));
    api
      .get<OpsDashboard>("/api/dashboard/ops", { params: { days: 7, pending_hours: 48, limit: 20 } })
      .then((o) => {
        if (!alive) return;
        setOps(o.data);
      })
      .catch(() => {
        /* KPIs operativos opcionales: el dashboard principal sigue funcionando */
      });
    return () => {
      alive = false;
    };
  }, []);

  const { blocksCount, totalAlerts, otherAlerts } = useMemo(() => {
    const total = data?.total_alerts ?? 0;
    const blocks = (data?.severity_breakdown ?? []).find((x) => x.label === "EVENTO DE BLOQUEO")?.count ?? 0;
    return { blocksCount: blocks, totalAlerts: total, otherAlerts: Math.max(0, total - blocks) };
  }, [data]);

  const confirmRatePct = useMemo(() => {
    const r = ops?.kpis?.confirm_rate_window;
    if (r == null) return null;
    return Math.round(r * 1000) / 10;
  }, [ops]);

  const backlog = ops?.kpis?.backlog_pending ?? 0;

  const barAlerts = useMemo(() => data?.top_alerts ?? [], [data]);
  const alertsByDay = useMemo(() => data?.alerts_by_day ?? [], [data]);
  const blocksByDay = useMemo(() => data?.blocks_by_day ?? [], [data]);
  const alerts7dSum = useMemo(() => alertsByDay.reduce((a, x) => a + x.count, 0), [alertsByDay]);
  const blocks7dSum = useMemo(() => blocksByDay.reduce((a, x) => a + x.count, 0), [blocksByDay]);

  const tableRows = useMemo(() => {
    const fromDash = data?.latest_blocks ?? [];
    if (fromDash.length) return fromDash.slice(0, 12);
    const pending = ops?.pending_blocks ?? [];
    return pending.slice(0, 12).map((p, i) => ({
      id: i,
      received_time: p.received_time,
      folder: "EVENTO DE BLOQUEO",
      alert: "",
      hostname: p.hostname,
      ip: p.ip,
      mac: p.mac,
      user: "",
      segment: p.segment,
      os: p.os,
      nic_vendor: p.nic_vendor,
    }));
  }, [data, ops]);

  const lastUpdated = useMemo(() => {
    const t = tableRows[0]?.received_time;
    if (!t) return "Sin datos recientes";
    return `Actualizado ${formatDateTimeCO(t)}`;
  }, [tableRows]);

  const taskItems = useMemo(() => {
    if (taskTab === "alerts") return (data?.top_alerts ?? []).slice(0, 8);
    if (taskTab === "reinc") return (data?.top_reincidences ?? []).slice(0, 8);
    return (ops?.pending_blocks ?? []).slice(0, 8).map((p) => ({
      label: `${p.hostname || p.ip || p.mac} — ${p.segment || "sin segmento"}`,
      count: p.recurrence,
    }));
  }, [data, ops, taskTab]);

  function openSearchFromLabel(label: string) {
    const t = label.split("—")[0]?.trim() ?? label;
    nav(`/search?q=${encodeURIComponent(t)}`);
  }

  return (
    <Box sx={{ pb: 2 }}>
      {err ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} lg={3}>
          {data ? (
            <MaterialStatCard
              icon={<StorageIcon />}
              iconBg={C.orange}
              title="Total alertas"
              value={totalAlerts.toLocaleString("es-CO")}
              footer={
                <Typography variant="caption" color="text.secondary">
                  Registros en base local (importación Outlook)
                </Typography>
              }
            />
          ) : (
            <LoadingCard title="Total alertas" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {data ? (
            <MaterialStatCard
              icon={<TrendingUpIcon />}
              iconBg={C.navy}
              title="Bloqueos (carpeta)"
              value={blocksCount.toLocaleString("es-CO")}
              footer={
                <Typography variant="caption" color="text.secondary">
                  EVENTO DE BLOQUEO · {otherAlerts.toLocaleString("es-CO")} otras alertas
                </Typography>
              }
            />
          ) : (
            <LoadingCard title="Bloqueos" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {ops ? (
            <MaterialStatCard
              icon={<BugReportIcon />}
              iconBg={C.red}
              title="Backlog sin confirmar"
              value={backlog.toLocaleString("es-CO")}
              footer={
                <Typography variant="caption" color="text.secondary">
                  Ventana {ops.kpis.pending_hours}h · tasa confirmación {confirmRatePct ?? 0}%
                </Typography>
              }
            />
          ) : data ? (
            <MaterialStatCard
              icon={<BugReportIcon />}
              iconBg={C.red}
              title="Backlog sin confirmar"
              value="—"
              footer={
                <Typography variant="caption" color="text.secondary">
                  Panel operativo no disponible (revisa API /dashboard/ops)
                </Typography>
              }
            />
          ) : (
            <LoadingCard title="Backlog" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {data ? (
            <MaterialStatCard
              icon={<PeopleIcon />}
              iconBg={C.cyan}
              title="Hosts con reincidencia"
              value={(data.hosts_with_reincidence ?? 0).toLocaleString("es-CO")}
              footer={
                <Typography variant="caption" color="text.secondary">
                  Hostnames con ≥2 alertas (histórico completo)
                </Typography>
              }
            />
          ) : (
            <LoadingCard title="Reincidencias" />
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {data ? (
            <ChartCard
              headerColor={C.green}
              chart={<HeaderLineChart data={alertsByDay} />}
              title="Volumen de alertas"
              subtitle={`${alerts7dSum.toLocaleString("es-CO")} alertas en los últimos 7 días (por día calendario)`}
              updated={lastUpdated}
            />
          ) : (
            <Card>
              <LinearProgress />
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {data ? (
            <ChartCard
              headerColor={C.orange}
              chart={<HeaderBarChart data={barAlerts} />}
              title="Top señales NAC"
              subtitle={`${barAlerts[0]?.label?.slice(0, 40) ?? "—"}${barAlerts[0]?.label && barAlerts[0].label.length > 40 ? "…" : ""}`}
              updated="Conteos reales agrupados por asunto (top 12)"
            />
          ) : (
            <Card>
              <LinearProgress />
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {data ? (
            <ChartCard
              headerColor={C.navy}
              chart={<HeaderLineChart data={blocksByDay} />}
              title="Bloqueos por día"
              subtitle={`${blocks7dSum.toLocaleString("es-CO")} eventos EVENTO DE BLOQUEO en 7 días`}
              updated={lastUpdated}
            />
          ) : (
            <Card>
              <LinearProgress />
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ overflow: "hidden" }}>
            <Box sx={{ bgcolor: C.navy, color: "#fff", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>
                Acciones rápidas:
              </Typography>
              <Tabs
                value={taskTab}
                onChange={(_, v) => setTaskTab(v)}
                textColor="inherit"
                TabIndicatorProps={{ style: { backgroundColor: "#fff" } }}
                sx={{
                  minHeight: 36,
                  "& .MuiTab-root": { minHeight: 36, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", fontSize: 11 },
                  "& .Mui-selected": { color: "#fff !important", fontWeight: 700 },
                }}
              >
                <Tab value="alerts" icon={<BugReportIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Alertas" />
                <Tab value="reinc" icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Hosts" />
                <Tab value="blocks" icon={<StorageIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Pendientes" />
              </Tabs>
            </Box>
            <CardContent sx={{ pt: 0, px: 0 }}>
              <Stack divider={<Box sx={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }} />}>
                {taskItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
                    Sin datos en esta pestaña.
                  </Typography>
                ) : (
                  taskItems.map((item, idx) => (
                    <Stack
                      key={`${taskTab}-${idx}`}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ px: 2, py: 1.25, "&:hover": { bgcolor: "rgba(0,0,0,0.02)" } }}
                    >
                      <Checkbox size="small" disabled sx={{ p: 0.5 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={item.label}>
                          {item.label}
                        </Typography>
                        {"count" in item && item.count > 1 ? (
                          <Typography variant="caption" color="text.secondary">
                            ×{item.count}
                          </Typography>
                        ) : null}
                      </Box>
                      <IconButton size="small" aria-label="abrir en buscador" onClick={() => openSearchFromLabel(item.label)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="cerrar" disabled>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ overflow: "hidden", height: "100%" }}>
            <Box sx={{ bgcolor: C.orange, color: "#fff", px: 2, py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 400, fontSize: 18 }}>
                Últimos bloqueos
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Host, IP, segmento, SO y fabricante NIC
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small" aria-label="últimos bloqueos">
                <TableHead>
                  <TableRow>
                    {["IP", "Hostname", "Segmento", "OS", "NIC Vendor"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "uppercase",
                          color: C.orange,
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: "pointer" }} onClick={() => nav(`/search?q=${encodeURIComponent(row.mac || row.ip)}`)}>
                      <TableCell sx={{ color: C.orange, fontWeight: 500, fontSize: 13 }}>{row.ip || "—"}</TableCell>
                      <TableCell sx={{ color: C.orange, fontSize: 13 }}>{row.hostname || "—"}</TableCell>
                      <TableCell sx={{ color: C.orange, fontSize: 13 }}>{row.segment || "—"}</TableCell>
                      <TableCell sx={{ color: C.orange, fontSize: 13 }}>{row.os || "—"}</TableCell>
                      <TableCell sx={{ color: C.orange, fontSize: 13, maxWidth: 160 }} title={row.nic_vendor || ""}>
                        {row.nic_vendor || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 3, color: "text.secondary" }}>
                        Sin bloqueos recientes.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
