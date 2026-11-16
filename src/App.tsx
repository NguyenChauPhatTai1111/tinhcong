import { lazy, Suspense, type ReactNode } from "react";
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import { AppProvider } from "./contexts/AppContext";
import { Layout } from "./components/layout/Layout";
import { Empty } from "./components/common/UI";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Settings = lazy(() => import("./pages/Settings"));
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <Suspense
              fallback={
                <div className="app-loading">
                  <span className="loading-circle" />
                  <p>Đang mở không gian làm việc…</p>
                </div>
              }
            >
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="nhan-vien" element={<Employees />} />
                  <Route path="cham-cong" element={<Attendance />} />
                  <Route path="bang-luong" element={<Payroll />} />
                  <Route path="lich-su" element={<Payroll history />} />
                  <Route path="cai-dat" element={<Settings />} />
                  <Route
                    path="*"
                    element={
                      <Empty
                        title="Không tìm thấy trang"
                        action={
                          <Link className="btn primary" to="/">
                            Về tổng quan
                          </Link>
                        }
                      />
                    }
                  />
                </Route>
              </Routes>
            </Suspense>
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </HashRouter>
  );
}
function AuthGate({ children }: { children: ReactNode }) {
  const { session } = useAuth(),
    location = useLocation();
  if (!session)
    return location.pathname === "/dang-nhap" ? (
      <Login />
    ) : (
      <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />
    );
  if (location.pathname === "/dang-nhap") {
    const from = location.state?.from;
    const destination =
      typeof from === "string" &&
      /^\/(nhan-vien|cham-cong|bang-luong|lich-su|cai-dat)?$/.test(from)
        ? from
        : "/";
    return <Navigate to={destination} replace />;
  }
  return children;
}
