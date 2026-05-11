import { Box, Button, Stack, Typography } from "@mui/material";

function Check({ checked = false }: { checked?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: 12,
        height: 12,
        border: "1px solid #000",
        verticalAlign: "middle",
        position: "relative",
        mr: 0.5,
      }}
    >
      {checked ? (
        <Box
          component="span"
          sx={{
            position: "absolute",
            left: 1,
            top: -2,
            fontSize: 14,
            lineHeight: "12px",
          }}
        >
          ✓
        </Box>
      ) : null}
    </Box>
  );
}

function Field({
  label,
  value,
  w = "100%",
}: {
  label: string;
  value?: string;
  w?: string | number;
}) {
  return (
    <Box className="acta-field-row" sx={{ display: "flex", alignItems: "baseline", gap: 0.75, width: w }}>
      <Box component="span" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
        {label}
      </Box>
      <Box
        component="span"
        className="acta-field-value"
        sx={{
          flex: 1,
          borderBottom: "1px solid #000",
          minHeight: 14,
          px: 0.5,
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        {value ?? "#N/D"}
      </Box>
    </Box>
  );
}

export default function ActaPage() {
  const today = new Date().toLocaleDateString("es-CO");

  return (
    <Box>
      {/* Controles (no se imprimen) */}
      <Box className="no-print" sx={{ mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Typography variant="h5">Acta (vista previa)</Typography>
          <Button variant="contained" onClick={() => window.print()} sx={{ textTransform: "none", fontWeight: 700 }}>
            Imprimir
          </Button>
        </Stack>
      </Box>

      {/* Estilos impresión */}
      <Box
        component="style"
      >{`
        @page { size: A4 portrait; margin: 4mm 5mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .acta {
            font-size: 8px !important;
            line-height: 1.1 !important;
            border-width: 1px !important;
          }
          .acta .cell { padding: 2px 3px !important; }
          .acta .hdr-left { width: 84px !important; min-height: 20px !important; font-size: 8.5px !important; }
          .acta .hdr-mid { font-size: 8px !important; padding: 2px 3px !important; }
          .acta .hdr-right { width: 132px !important; font-size: 7.5px !important; }
          .acta .section-title { margin-bottom: 1px !important; font-size: 8px !important; }
          .acta .small { font-size: 8px !important; }
          .acta .xs { font-size: 7.25px !important; line-height: 1.12 !important; }
          .acta .grid-2 { gap: 2px 8px !important; }
          .acta .grid-3 { gap: 1px 6px !important; }
          .acta .line { min-height: 11px !important; padding: 0 2px !important; }
          .acta .acta-obs { min-height: 36px !important; }
          .acta .checkbox-line { gap: 5px !important; }
          .acta .acta-field-value { min-height: 11px !important; }
          .acta .note { font-size: 7.25px !important; line-height: 1.12 !important; padding: 2px 3px !important; }
        }
        .acta {
          background: #fff;
          color: #000;
          border: 2px solid #000;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
        }
        .acta * { box-sizing: border-box; }
        .acta .row { display: flex; width: 100%; }
        .acta .cell { border: 1px solid #000; padding: 5px 6px; }
        .acta .hdr-left { width: 110px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .acta .hdr-mid { flex: 1; text-align: center; font-weight: 800; }
        .acta .hdr-right { width: 180px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .acta .section-title { text-align: center; font-weight: 800; letter-spacing: 0.4px; }
        .acta .small { font-size: 11px; }
        .acta .xs { font-size: 10px; }
        .acta .label { font-weight: 800; }
        .acta .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
        .acta .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px 14px; }
        .acta .line { border-bottom: 1px solid #000; min-height: 14px; padding: 0 4px; font-weight: 700; text-align: center; }
        .acta .acta-obs { min-height: 48px; }
        .acta .checkbox-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .acta .note { font-weight: 700; }
      `}</Box>

      {/* Acta */}
      <Box className="acta">
        {/* Header */}
        <Box className="row">
          <Box className="cell hdr-left">GFT</Box>
          <Box className="cell hdr-mid">FORMATO DE ALISTAMIENTO Y ENTREGA DE EQUIPOS</Box>
          <Box className="cell hdr-right">CredicorpCapital</Box>
        </Box>

        {/* Top fields */}
        <Box className="row">
          <Box className="cell" sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Field label="* Orden de Servicio No." value={"#N/D"} w={320} />
              <Box component="span" className="small" sx={{ fontWeight: 700 }}>
                487582, esta es la placa del equipo
              </Box>
              <Field label="* Fecha:" value={today} w={220} />
            </Box>

            <Box className="xs" sx={{ mt: 0.5, color: "#333", textAlign: "center" }}>
              Los campos con asterisco * son obligatorios, este checklist debe ser diligenciado en todos los casos de alistamiento y/o formateo de equipos
            </Box>

            <Box sx={{ mt: 0.5, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Box className="label">* Tipo:</Box>
                <Box className="small" sx={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span>
                    Nueva Instalación <Check checked />
                  </span>
                  <span>
                    Formateo <Check />
                  </span>
                  <span>
                    Cambio <Check />
                  </span>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 0.75 }} className="grid-2">
              <Field label="* Nombre Usuario" value={"#N/D"} />
              <Field label="* Documento" value={"#N/D"} />
              <Field label="* Ubicación" value={"#N/D"} />
              <Field label="* Sede" value={"#N/D"} />
              <Field label="* Dependencia / Área" value={"#N/D"} />
              <Field label=" " value={"#N/D"} />
            </Box>
          </Box>
        </Box>

        {/* Características equipo nuevo */}
        <Box className="row">
          <Box className="cell" sx={{ flex: 1 }}>
            <Box className="section-title" sx={{ mb: 0.5 }}>
              CARACTERISTICAS (EQUIPO NUEVO)
            </Box>
            <Box className="grid-2 small">
              <Box sx={{ display: "grid", gap: 4 }}>
                <Field label="* Nombre de equipo:" value={"#N/D"} />
                <Field label="* Tipo:" value={"#N/D"} />
                <Field label="* Marca PC:" value={"#N/D"} />
                <Field label="* Modelo PC:" value={"#N/D"} />
                <Field label="* Serial Equipo:" value={"#N/D"} />
                <Field label="* Sistema Operativo:" value={"#N/D"} />
                <Field label="* Morral:" value={"#N/D"} />
                <Field label="* Direccion IP:" value={"#N/D"} />
                <Field label="* Placa Inventario:" value={"#N/D"} />
                <Field label="* Contrato" value={"#N/D"} />
              </Box>
              <Box sx={{ display: "grid", gap: 4 }}>
                <Field label="* Memoria RAM:" value={"#N/D"} />
                <Field label="* Tamaño de disco:" value={"#N/D"} />
                <Field label="* Monitor Serial:" value={"-"} />
                <Field label="* Monitor Marca:" value={"-"} />
                <Field label="* Placa Inventario:" value={"-"} />
                <Field label="* Contrato" value={"-"} />
                <Field label="* Modelo:" value={"-"} />
              </Box>
            </Box>

            <Box sx={{ mt: 0.75 }} className="small">
              <Box sx={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Box className="label">* BackUp Datos:</Box>
                <Box className="checkbox-line">
                  <span>
                    Descargas <Check checked />
                  </span>
                  <span>
                    Documentos <Check checked />
                  </span>
                  <span>
                    Escritorio <Check checked />
                  </span>
                  <span>
                    D: <Check />
                  </span>
                  <span>
                    Favoritos <Check checked />
                  </span>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 0.75 }}>
              <Box className="section-title small" sx={{ mb: 0.5 }}>
                APLICACIONES CORPORATIVAS INSTALADAS
              </Box>
              <Box className="grid-3 small">
                <Box sx={{ display: "grid", gap: 3 }}>
                  <span>
                    ORACLE 10 <Check checked />
                  </span>
                  <span>
                    ORACLE 11 <Check checked />
                  </span>
                  <span>
                    ZOOM <Check checked />
                  </span>
                  <span>
                    ORION <Check checked />
                  </span>
                  <span>
                    ANTIVIRUS TRENDMICRO <Check checked />
                  </span>
                </Box>
                <Box sx={{ display: "grid", gap: 3 }}>
                  <span>
                    SIF <Check checked />
                  </span>
                  <span>
                    SIFI <Check checked />
                  </span>
                  <span>
                    GLOBAL <Check checked />
                  </span>
                  <span>
                    CHROME <Check checked />
                  </span>
                  <span>
                    ENCRIPTADOR DE DISCO DURO <Check checked />
                  </span>
                </Box>
                <Box sx={{ display: "grid", gap: 3 }}>
                  <span>
                    HELP PEOPLE <Check checked />
                  </span>
                  <span>
                    CONTROLADORES <Check checked />
                  </span>
                  <span>
                    ADOBE READER <Check checked />
                  </span>
                  <span>
                    CITRIX <Check checked />
                  </span>
                  <span>
                    SYSTEM CENTER <Check checked />
                  </span>
                  <Box sx={{ mt: 0.25 }}>
                    <span>
                      UNIDADES DE RED <Check checked />
                    </span>
                    <Box />
                    <span>
                      FORMATEO <Check checked />
                    </span>
                  </Box>
                </Box>
              </Box>

              <Box className="small" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Box className="label">ACTUALIZACIONES AUTOMATICAS</Box>
                <span>
                  SI <Check checked />
                </span>
                <span>
                  NO <Check />
                </span>
                <Box sx={{ flex: 1 }} />
                <Box className="label">* MICROSOFT OFFICE</Box>
                <Box sx={{ width: 140, borderBottom: "1px solid #000", minHeight: 14 }} />
                <Box sx={{ width: 260, borderBottom: "1px solid #000", minHeight: 14 }}>
                  <Box component="span" className="label" sx={{ pl: 1 }}>
                    OTRA APLICACIÓN:
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Características equipo antiguo */}
        <Box className="row">
          <Box className="cell" sx={{ flex: 1 }}>
            <Box className="section-title" sx={{ mb: 0.5 }}>
              CARACTERISTICAS (EQUIPO ANTIGUO)
            </Box>
            <Box className="grid-2 small">
              <Box sx={{ display: "grid", gap: 4 }}>
                <Field label="* Nombre de equipo:" value={"#N/D"} />
                <Field label="* Tipo:" value={"#N/D"} />
                <Field label="* Marca PC:" value={"#N/D"} />
                <Field label="* Modelo PC:" value={"#N/D"} />
                <Field label="* Serial Equipo:" value={"#N/D"} />
                <Field label="* Sistema Operativo:" value={"#N/D"} />
                <Field label="* Morral:" value={"#N/D"} />
                <Field label="* Direccion IP:" value={"-"} />
                <Field label="* Placa Inventario:" value={"#N/D"} />
                <Field label="* Contrato" value={"#N/D"} />
              </Box>
              <Box sx={{ display: "grid", gap: 4 }}>
                <Field label="* RAM:" value={"#N/D"} />
                <Field label="* Tamaño de disco:" value={"#N/D"} />
                <Field label="* Monitor Serial:" value={"-"} />
                <Field label="* Monitor Marca:" value={"-"} />
                <Field label="* Placa Inventario:" value={"-"} />
                <Field label="* Contrato" value={"-"} />
                <Field label="* Modelo:" value={"-"} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Eliminación y borrado seguro */}
        <Box className="row">
          <Box className="cell" sx={{ flex: 1 }}>
            <Box className="section-title" sx={{ mb: 0.5 }}>
              ELIMINACION Y BORRADO SEGURO DE INFORMACION
            </Box>
            <Box className="small" sx={{ display: "grid", gap: 4 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, alignItems: "baseline" }}>
                <Box className="label">Motivo del borrado seguro:</Box>
                <Box className="line">#N/D</Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "180px 1fr 160px 1fr 120px 1fr", gap: 8 }}>
                <Box className="label" sx={{ gridColumn: "1 / 3" }}>
                  Información del equipo:
                </Box>
                <Box />
                <Box />
                <Box />
                <Box />
                <Box />

                <Box sx={{ gridColumn: "1 / 2" }}>Marca:</Box>
                <Box className="line">#N/D</Box>
                <Box>Modelo:</Box>
                <Box className="line">#N/D</Box>
                <Box>Serial:</Box>
                <Box className="line">#N/D</Box>

                <Box>Placa:</Box>
                <Box className="line">#N/D</Box>
                <Box>Contrato:</Box>
                <Box className="line">#N/D</Box>
                <Box>Estado:</Box>
                <Box className="line">#N/D</Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, alignItems: "baseline" }}>
                <Box className="label">Discos o particiones borrados:</Box>
                <Box className="line">#N/D</Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Observaciones + firmas */}
        <Box className="row">
          <Box className="cell" sx={{ flex: 1 }}>
            <Box className="small" sx={{ display: "grid", gap: 5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, alignItems: "baseline" }}>
                <Box className="label">Observaciones de equipo asignado:</Box>
                <Box className="line acta-obs">#N/D</Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Box className="line" sx={{ minHeight: 16 }} />
                  <Box sx={{ mt: 0.25 }}>Instalado Por:</Box>
                  <Box sx={{ mt: 0.5, fontWeight: 700 }}>Christian Camilo Castañeda Castro</Box>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Box className="line" sx={{ minHeight: 16 }} />
                  <Box sx={{ mt: 0.25 }}>Recibido Por: (usuario)</Box>
                  <Box sx={{ mt: 0.5, display: "grid", gap: 2, justifyItems: "center" }}>
                    <Box className="label">Numero de cedula:</Box>
                    <Box className="line" sx={{ width: 220 }}>
                      #N/D
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Nota final */}
        <Box className="row">
          <Box className="cell" sx={{ flex: 1 }}>
            <Box className="note small">
              Nota recepción del Equipo : Con la firma de la presente acta, confirmo que recibo a satisfacción todos los elementos de
              Software y Hardware. A su vez certifico que fueron probados todos los accesos, aplicaciones y funcionalidades las cuales
              operan correctamente.
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

