import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div style={{ padding: "20px", color: "black" }}>
      <h1>Home</h1>
      <p>Autenticado: {isAuthenticated ? "Sim" : "Não"}</p>
      <p>
        <Link to="/register">Registar</Link> | <Link to="/login">Login</Link> |{" "}
        <Link to="/dashboard">Dashboard</Link>
      </p>
      {isAuthenticated && <button onClick={handleLogout}>Logout</button>}
    </div>
  );
}
