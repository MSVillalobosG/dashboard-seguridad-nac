import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SearchIcon from "@mui/icons-material/Search";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import SecurityIcon from "@mui/icons-material/Security";
import DescriptionIcon from "@mui/icons-material/Description";
const drawerWidth = 260;

const items = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Buscador", path: "/search", icon: <SearchIcon /> },
  { label: "Reincidencias", path: "/reincidences", icon: <LeaderboardIcon /> },
  { label: "Bloqueos", path: "/blocks", icon: <SecurityIcon /> },
  { label: "Acta", path: "/acta", icon: <DescriptionIcon /> },
];

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/search")) return "Buscador";
  if (pathname.startsWith("/reincidences")) return "Reincidencias";
  if (pathname.startsWith("/blocks")) return "Bloqueos";
  if (pathname.startsWith("/acta")) return "Acta";
  return "Dashboard";
}

export default function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [search, setSearch] = useState("");

  const pageTitle = useMemo(() => titleForPath(loc.pathname), [loc.pathname]);

  function submitSearch() {
    const q = search.trim();
    if (!q) {
      nav("/search");
      return;
    }
    nav(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#EEEEEE" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid rgba(200, 200, 200, 0.6)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: 64, justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 400, color: "#3C4858", minWidth: 120 }}>
            {pageTitle}
          </Typography>
          <TextField
            size="small"
            placeholder="Buscar IP, MAC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
            sx={{
              maxWidth: 280,
              flex: 1,
              mx: 2,
              "& .MuiOutlinedInput-root": {
                bgcolor: "#F5F5F5",
                borderRadius: 1,
                "& fieldset": { border: "none" },
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" onClick={submitSearch} aria-label="buscar">
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(200, 200, 200, 0.6)",
            bgcolor: "#FFFFFF",
            boxShadow: "0 16px 38px -12px rgba(0,0,0,0.16)",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: "#00BCD4",
              display: "grid",
              placeItems: "center",
            }}
          >
            <ShieldIcon sx={{ color: "#fff", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, color: "#3C4858" }}>
              NAC Security
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dashboard
            </Typography>
          </Box>
        </Box>
        <Box sx={{ overflow: "auto", px: 1 }}>
          <List>
            {items.map((item) => {
              const selected = loc.pathname.startsWith(item.path);
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={selected}
                    onClick={() => nav(item.path)}
                    sx={{
                      borderRadius: 1,
                      my: 0.25,
                      "&.Mui-selected": {
                        bgcolor: "rgba(0, 188, 212, 0.12)",
                        borderLeft: "3px solid #00BCD4",
                        pl: 1.25,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: selected ? "#00BCD4" : "rgba(0,0,0,0.54)" }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: selected ? 600 : 400,
                        fontSize: 14,
                        color: "#3C4858",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          bgcolor: "#EEEEEE",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
