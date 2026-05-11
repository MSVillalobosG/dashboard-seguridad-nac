import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Divider,
} from "@mui/material";
import type { ReactNode } from "react";

export function MaterialStatCard(props: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  value: string | number;
  footer?: ReactNode;
}) {
  return (
    <Card
      sx={{
        position: "relative",
        overflow: "visible",
        mt: 3,
        height: "100%",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -20,
          left: 16,
          width: 64,
          height: 64,
          borderRadius: 1,
          bgcolor: props.iconBg,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.14), 0 7px 10px -5px rgba(0, 0, 0, 0.12)",
          "& svg": { color: "#fff", fontSize: 36 },
        }}
      >
        {props.icon}
      </Box>
      <CardContent sx={{ pt: 5, pb: 1.5, px: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right", fontSize: 13 }}>
          {props.title}
        </Typography>
        <Typography variant="h5" sx={{ textAlign: "right", fontWeight: 400, color: "#3C4858", mt: 0.5 }}>
          {props.value}
        </Typography>
      </CardContent>
      {props.footer ? (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1.25 }}>{props.footer}</Box>
        </>
      ) : null}
    </Card>
  );
}

export function StatCard(props: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {props.title}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5 }}>
          {props.value}
        </Typography>
        {props.subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {props.subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LoadingCard(props: { title: string }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            {props.title}
          </Typography>
        </Box>
        <LinearProgress />
      </CardContent>
    </Card>
  );
}

