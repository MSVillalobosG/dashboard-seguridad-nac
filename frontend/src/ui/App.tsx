import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import DashboardPage from "./pages/DashboardPage";
import SearchPage from "./pages/SearchPage";
import ReincidencesPage from "./pages/ReincidencesPage";
import BlocksPage from "./pages/BlocksPage";
import ActaPage from "./pages/ActaPage";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#EEEEEE", paper: "#FFFFFF" },
    primary: { main: "#00BCD4" },
    secondary: { main: "#1A2035" },
    error: { main: "#F44336" },
    warning: { main: "#FB8C00" },
    success: { main: "#4CAF50" },
    text: { primary: "#3C4858", secondary: "#999999" },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: `"Roboto", "Helvetica", "Arial", sans-serif`,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#EEEEEE",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "none",
          boxShadow: "0 1px 4px 0 rgba(0, 0, 0, 0.14)",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(15, 23, 42, 0.08)",
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/reincidences" element={<ReincidencesPage />} />
          <Route path="/blocks" element={<BlocksPage />} />
          <Route path="/acta" element={<ActaPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

