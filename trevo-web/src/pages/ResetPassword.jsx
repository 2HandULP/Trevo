import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, validatePasswordResetToken } from "../lib/authApi";

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

    try {
      setIsSubmitting(true);
      await confirmPasswordReset(token, newPassword);
      navigate("/login", {
        replace: true,
        state: { message: "Password redefinida com sucesso. Podes iniciar sessao." },
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "28rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>Redefinir password</h1>

      {tokenStatus === "checking" && <p>A validar o link...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {tokenStatus === "valid" && (
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="password"
              name="newPassword"
              placeholder="Nova password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmar password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : "Guardar nova password"}
          </button>
        </form>
      )}

      {tokenStatus === "invalid" && (
        <p>
          <Link to="/forgot-password">Pedir um novo link</Link>
        </p>
      )}
    </div>
  );
}
