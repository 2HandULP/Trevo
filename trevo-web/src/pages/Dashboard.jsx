import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { token, isAuthenticated } = useAuth();

  return (
    <div style={{ color: "black", fontSize: "24px", padding: "20px" }}>
      <h1>Dashboard</h1>
      <p>Autenticado: {isAuthenticated ? "Sim" : "Não"}</p>
      <p>Token: {token}</p>
    </div>
  );
}