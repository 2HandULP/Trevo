import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, validatePasswordResetToken } from "../lib/authApi";

const cardStyle = {
  maxWidth: "28rem",
  margin: "4rem auto",
  padding: "2rem",
  borderRadius: "1rem",
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  boxShadow: "0 20px 45px rgba(30, 64, 175, 0.12)",
};

const fieldStyle = {
  width: "100%",
  padding: "0.85rem 1rem",
  marginTop: "0.5rem",
  borderRadius: "0.75rem",
  border: "1px solid #93c5fd",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  marginTop: "1rem",
  padding: "0.9rem 1rem",
  border: "none",
  borderRadius: "999px",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenStatus, setTokenStatus] = useState("checking");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function checkToken() {
      if (!token) {
        setTokenStatus("invalid");
        setError("O link de recuperacao nao inclui um token valido.");
        return;
      }

      try {
        await validatePasswordResetToken(token);
        if (!ignore) {
          setTokenStatus("valid");
        }
      } catch (validationError) {
        if (!ignore) {
          setTokenStatus("invalid");
          setError(validationError.message);
        }
      }
    }

    checkToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("A password tem de ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As passwords nao coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(token, newPassword);
      navigate("/login", {
        replace: true,
        state: { passwordResetSuccess: true },
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#1d4ed8", fontWeight: 700 }}>Nova password</p>
      <h1 style={{ marginTop: "0.5rem", color: "#172554" }}>Redefinir password</h1>

      {tokenStatus === "checking" && <p style={{ color: "#1e3a8a" }}>A validar o link...</p>}

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {tokenStatus === "valid" && (
        <form onSubmit={handleSubmit}>
          <label htmlFor="newPassword" style={{ color: "#172554", fontWeight: 600 }}>
            Nova password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Minimo de 8 caracteres"
            style={fieldStyle}
          />

          <label htmlFor="confirmPassword" style={{ color: "#172554", fontWeight: 600, marginTop: "1rem", display: "block" }}>
            Confirmar password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repete a password"
            style={fieldStyle}
          />

          <button type="submit" disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? "A guardar..." : "Guardar nova password"}
          </button>
        </form>
      )}

      {tokenStatus === "invalid" && (
        <p>
          <Link to="/forgot-password" style={{ color: "#1d4ed8", fontWeight: 700 }}>
            Pedir um novo link
          </Link>
        </p>
      )}
    </div>
  );
}
