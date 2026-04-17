import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { isAuthenticated, token, role, logout } = useAuth();

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Home</h1>
      <p>Autenticado: {isAuthenticated ? "Sim" : "Não"}</p>
      <p>Role: {role || "Sem role"}</p>
      <p>Token: {token || "Sem token"}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
