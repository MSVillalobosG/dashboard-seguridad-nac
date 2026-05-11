import { useState } from "react";
import { Box, Button, Card, CardContent, Divider, TextField, Typography } from "@mui/material";
import { api } from "../api";

type RunResp = { job_id: string; started_at: string };
type StatusResp = {
  job_id: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  inserted: number;
  updated: number;
  error?: string | null;
};

export default function UpdatePage() {
  const [sinceDays, setSinceDays] = useState("7");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setErr(null);
    setLoading(true);
    try {
      const r = await api.post<RunResp>("/api/update/run", null, {
        params: { since_days: Number(sinceDays || "7") },
      });
      setJobId(r.data.job_id);
      setStatus(null);
    } catch (e: any) {
      setErr(e?.message ?? "Error ejecutando actualización");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!jobId) return;
    setErr(null);
    try {
      const r = await api.get<StatusResp>(`/api/update/status/${jobId}`);
      setStatus(r.data);
    } catch (e: any) {
      setErr(e?.message ?? "Error consultando estado");
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Actualizar datos (Outlook → SQLite)
      </Typography>
      {err ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      ) : null}
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Ejecutar importación
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              label="Días hacia atrás"
              value={sinceDays}
              onChange={(e) => setSinceDays(e.target.value)}
              sx={{ width: 220 }}
            />
            <Button variant="contained" onClick={run} disabled={loading}>
              {loading ? "Iniciando…" : "Ejecutar"}
            </Button>
            <Button variant="outlined" onClick={refresh} disabled={!jobId}>
              Refrescar estado
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Job: {jobId ?? "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estado: {status?.status ?? "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Insertados: {status?.inserted ?? 0} | Actualizados: {status?.updated ?? 0}
            </Typography>
            {status?.error ? (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Error: {status.error}
              </Typography>
            ) : null}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

