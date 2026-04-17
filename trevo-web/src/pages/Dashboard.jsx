import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { token, role, isAuthenticated } = useAuth();

  return (
    <div style={{ color: "black", fontSize: "24px", padding: "20px" }}>
      <h1>Dashboard</h1>
      <p>Autenticado: {isAuthenticated ? "Sim" : "Não"}</p>
      <p>Role: {role || "Sem role"}</p>
      <p>Token: {token}</p>
    </div>
  );
}
