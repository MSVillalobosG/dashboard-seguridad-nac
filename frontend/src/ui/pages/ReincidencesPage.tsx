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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { api, formatDateTimeCO } from "../api";

type Item = {
  hostname: string;
  ip: string;
  user: string;
  mac: string;
  segment: string;
  alert: string;
  alert_count: number;
  assigned_labels?: string | null;
  last_seen: string;
  has_confirmation?: boolean;
  confirmation_time?: string | null;
};
type Resp = { items: Item[] };

export default function ReincidencesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get<Resp>("/api/reincidences")
      .then((r) => setItems(r.data.items))
      .catch((e) => setErr(e?.message ?? "Error cargando reincidencias"));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const withRelative = useMemo(
    () =>
      items.map((r) => {
        const lastSeenDate = new Date(r.last_seen);
        const confirmationDate = r.confirmation_time ? new Date(r.confirmation_time) : null;
        return {
          ...r,
          relative_time: formatRelativeTime(lastSeenDate, now),
          confirmation_relative: confirmationDate ? formatRelativeTime(confirmationDate, now) : null,
        };
      }),
    [items, now],
  );

  const filtered = useMemo(() => {
    const qv = q.trim().toLowerCase();
    if (!qv) return withRelative;

    return withRelative.filter((r) => {
      const cumplimiento = r.has_confirmation ? "confirmado cumplimiento" : "pendiente";
      const haystack = [
        r.hostname,
        r.ip,
        r.user,
        r.segment,
        r.mac,
        r.alert,
        r.assigned_labels,
        r.last_seen,
        r.confirmation_time,
        cumplimiento,
        String(r.alert_count),
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
        Ranking de reincidencias
      </Typography>
      {err ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      ) : null}
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Equipos con más alertas (formato hoja Excel)
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
                placeholder="Hostname, IP, usuario, alerta, dictamen, pendiente, número de reincidencia…"
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
              aria-label="ranking reincidencias"
              sx={{
                "& th, & td": { px: 1, py: 0.75, fontSize: 12 },
              }}
            >
              <TableHead>
                <TableRow>
                  {[
                    "Hora de reporte",
                    "Hostname",
                    "Dirección IP",
                    "Usuario",
                    "Dirección MAC",
                    "Ubicación",
                    "Alerta",
                    "Reincidencia",
                    "Dictamen",
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
                {filtered.map((r, idx) => (
                  <TableRow
                    key={`${r.hostname}-${r.alert}-${idx}`}
                    hover
                    sx={{
                      "&:nth-of-type(odd)": { bgcolor: "rgba(15,23,42,0.02)" },
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatDateTimeCO(r.last_seen)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.relative_time}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.hostname || "-"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.ip || "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 140 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.user || "User"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {r.mac || "-"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.25, wordBreak: "break-word" }} title={r.segment || ""}>
                        {r.segment || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 520 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.alert || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={r.alert_count}
                        size="small"
                        color={r.alert_count >= 5 ? "warning" : "primary"}
                        variant={r.alert_count >= 5 ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25, wordBreak: "break-word" }}>
                        {r.assigned_labels || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {r.has_confirmation ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 18 }} />
                          {r.confirmation_time && r.confirmation_relative ? (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {formatDateTimeCO(r.confirmation_time)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {r.confirmation_relative}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Confirmado
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Pendiente" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 4, color: "text.secondary" }}>
                      {items.length === 0
                        ? "Sin datos (primero ejecuta “Actualizar”)."
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

