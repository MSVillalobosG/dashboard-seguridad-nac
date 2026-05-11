import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { api, AlertOut, formatDateTimeCO } from "../api";

type SearchResp = { total: number; items: AlertOut[] };

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [ip, setIp] = useState("");
  const [mac, setMac] = useState("");
  const [hostname, setHostname] = useState("");
  const [user, setUser] = useState("");
  const [days, setDays] = useState("7");
  const [rows, setRows] = useState<AlertOut[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  const canSearch = useMemo(() => !!(ip || mac || hostname || user), [ip, mac, hostname, user]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q) return;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(q) || (q.includes(".") && /\d/.test(q))) {
      setIp(q);
      setMac("");
    } else {
      setMac(q.replace(/[^0-9a-fA-F]/g, ""));
      setIp("");
    }
    setHostname("");
    setUser("");
  }, [searchParams]);

  const rowsWithRelative = useMemo(
    () =>
      rows.map((r) => {
        const receivedDate = new Date(r.received_time);
        const confirmationDate = r.confirmation_time ? new Date(r.confirmation_time) : null;
        return {
          ...r,
          relative_time: formatRelativeTime(receivedDate, now),
          confirmation_relative: confirmationDate ? formatRelativeTime(confirmationDate, now) : null,
        };
      }),
    [rows, now],
  );

  function formatRelativeTime(date: Date, ref: Date): string {
    const diffMs = ref.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffH = Math.round(diffMin / 60);
    const diffD = Math.round(diffH / 24);

    if (diffMin < 1) return "hace segundos";
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH < 24) return `hace ${diffH} hora${diffH === 1 ? "" : "s"}`;
    return `hace ${diffD} día${diffD === 1 ? "" : "s"}`;
  }

  async function run() {
    setErr(null);
    setLoading(true);
    try {
      const r = await api.get<SearchResp>("/api/alerts/search", {
        params: {
          ip: ip || undefined,
          mac: mac || undefined,
          hostname: hostname || undefined,
          user: user || undefined,
          days: Number(days || "7"),
          limit: 200,
          offset: 0,
        },
      });
      setRows(r.data.items);
      setTotal(r.data.total);
    } catch (e: any) {
      setErr(e?.message ?? "Error buscando");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Buscador NAC
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="IP" value={ip} onChange={(e) => setIp(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="MAC (sin separadores)" value={mac} onChange={(e) => setMac(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="HOSTNAME" value={hostname} onChange={(e) => setHostname(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth label="USER" value={user} onChange={(e) => setUser(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Días hacia atrás"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" disabled={!canSearch || loading} onClick={run}>
              {loading ? "Buscando…" : "Buscar"}
            </Button>
            {loading ? (
              <Box sx={{ minWidth: 200, maxWidth: 300 }}>
                <LinearProgress />
              </Box>
            ) : null}
            {err ? (
              <Typography color="error" sx={{ display: "inline-block" }}>
                {err}
              </Typography>
            ) : null}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Resultados ({total})
              </Typography>
              <TableContainer
                sx={{
                  mt: 1,
                  borderRadius: 2,
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                <Table
                  stickyHeader
                  size="small"
                  aria-label="resultados buscador nac"
                  sx={{
                    minWidth: 1500,
                    "& th, & td": { px: 1, py: 0.75, fontSize: 12 },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {[
                        "Fecha",
                        "Hostname",
                        "IP",
                        "MAC",
                        "Usuario",
                        "OS",
                        "NIC Vendor",
                        "Alerta",
                        "Segmento",
                        "Carpeta",
                        "Cumplimiento",
                      ].map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: 0.6,
                            textTransform: "uppercase",
                            color: "text.secondary",
                            bgcolor: "background.paper",
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rowsWithRelative.map((r) => (
                      <TableRow
                        key={r.id}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": { bgcolor: "rgba(15,23,42,0.02)" },
                        }}
                      >
                        <TableCell sx={{ whiteSpace: "nowrap", minWidth: 170 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatDateTimeCO(r.received_time)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.relative_time}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{r.hostname || "-"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.ip || "-"}</TableCell>
                        <TableCell sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                          {r.mac || "-"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.user || "-"}</TableCell>
                        <TableCell>{r.os || "-"}</TableCell>
                        <TableCell sx={{ maxWidth: 180 }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                            {r.nic_vendor || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 320, maxWidth: 420 }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                            {r.alert || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 180 }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                            {r.segment || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.folder || "-"}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          {r.has_confirmation && r.confirmation_relative && r.confirmation_time ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 18 }} />
                                <Typography variant="caption">{formatDateTimeCO(r.confirmation_time)}</Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                                {r.confirmation_relative}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ py: 4, color: "text.secondary" }}>
                          Sin resultados (o aún no importaste datos).
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

