import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, AlertOut, formatDateTimeCO } from "../api";

export default function BlocksPage() {
  const [rows, setRows] = useState<AlertOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get<AlertOut[]>("/api/blocks/today")
      .then((r) => setRows(r.data))
      .catch((e) => setErr(e?.message ?? "Error cargando bloqueos"));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const withRelative = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        relative_time: formatRelativeTime(new Date(r.received_time), now),
      })),
    [rows, now],
  );

  const filtered = useMemo(() => {
    const qv = q.trim().toLowerCase();
    if (!qv) return withRelative;

    return withRelative.filter((r) => {
      const haystack = [
        r.hostname,
        r.ip,
        r.user,
        r.segment,
        r.mac,
        r.alert,
        r.policy_name,
        r.gateway,
        r.os,
        r.nic_vendor,
        r.domain,
        r.received_time,
        r.recurrence != null ? String(r.recurrence) : "",
      ]
        .map((x) => (x || "").toLowerCase())
        .join(" ");
      return haystack.includes(qv);
    });
  }, [withRelative, q]);

  function formatRelativeTime(date: Date, ref: Date): string {
    const diffMs = ref.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffH = Math.round(diffMin / 60);

    if (diffMin < 1) return "hace segundos";
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH < 24) return `hace ${diffH} hora${diffH === 1 ? "" : "s"}`;

    return date.toLocaleString();
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Bloqueos del día (EVENTO DE BLOQUEO)
      </Typography>
      {err ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      ) : null}
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Eventos de bloqueo de hoy (con reincidencias por IP/Hostname)
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: "rgba(15,23,42,0.03)",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: "text.secondary", letterSpacing: 0.4 }}>
              Filtros
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
              <TextField
                size="small"
                fullWidth
                label="Buscar en cualquier campo"
                placeholder="Hostname, IP, usuario, segmento, alerta, policy, MAC…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQ("");
                }}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <Button
                variant="outlined"
                sx={{
                  height: 40,
                  minWidth: { sm: 160 },
                  px: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  alignSelf: { xs: "stretch", sm: "auto" },
                }}
                onClick={() => setQ("")}
              >
                Limpiar
              </Button>
            </Stack>
          </Box>
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
              aria-label="bloqueos del día"
              sx={{
                "& th, & td": { px: 1, py: 0.75, fontSize: 12 },
              }}
            >
              <TableHead>
                <TableRow>
                  {[
                    "Fecha",
                    "Policy Name",
                    "Hostname",
                    "IP",
                    "MAC",
                    "Segment",
                    "OS",
                    "NIC Vendor",
                    "Gateway",
                    "User",
                    "Reincidencias",
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
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{
                      "&:nth-of-type(odd)": { bgcolor: "rgba(15,23,42,0.02)" },
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatDateTimeCO(r.received_time)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.relative_time}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, lineHeight: 1.25, wordBreak: "break-word" }}
                        title={r.policy_name ?? ""}
                      >
                        {r.policy_name ?? "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.hostname || "-"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.ip || "-"}</TableCell>
                    <TableCell sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {r.mac || "-"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography
                        variant="body2"
                        sx={{ lineHeight: 1.25, wordBreak: "break-word" }}
                        title={r.segment || ""}
                      >
                        {r.segment || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.os ?? "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 140 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.nic_vendor ?? "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.gateway ?? "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.user || "User"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.recurrence ?? 1}
                        size="small"
                        color={(r.recurrence ?? 1) >= 5 ? "warning" : "primary"}
                        variant={(r.recurrence ?? 1) >= 5 ? "filled" : "outlined"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} sx={{ py: 4, color: "text.secondary" }}>
                      {rows.length === 0
                        ? "Sin bloqueos hoy o aún no se han importado datos."
                        : "Sin resultados con los filtros actuales."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
