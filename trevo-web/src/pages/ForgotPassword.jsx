import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../lib/authApi";

const cardStyle = {
  maxWidth: "28rem",
  margin: "4rem auto",
  padding: "2rem",
  borderRadius: "1rem",
  border: "1px solid #d6d3d1",
  background: "#fff7ed",
  boxShadow: "0 20px 45px rgba(120, 53, 15, 0.12)",
};

const fieldStyle = {
  width: "100%",
  padding: "0.85rem 1rem",
  marginTop: "0.5rem",
  borderRadius: "0.75rem",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  marginTop: "1rem",
  padding: "0.9rem 1rem",
  border: "none",
  borderRadius: "999px",
  background: "#c2410c",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitted(false);

    if (!email.trim()) {
      setError("Preenche o email.");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#9a3412", fontWeight: 700 }}>Recuperar acesso</p>
      <h1 style={{ marginTop: "0.5rem", color: "#431407" }}>Esqueceste-te da password?</h1>
      <p style={{ color: "#7c2d12", lineHeight: 1.6 }}>
        Envia o teu email e, se existir uma conta associada, vais receber instrucoes para redefinir a password.
      </p>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {submitted && (
        <p style={{ color: "#166534" }}>
          Se o email existir, enviamos as instrucoes de recuperacao. Verifica a tua caixa de entrada.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="email" style={{ color: "#431407", fontWeight: 600 }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={fieldStyle}
        />

        <button type="submit" disabled={isSubmitting} style={buttonStyle}>
          {isSubmitting ? "A enviar..." : "Enviar link de recuperacao"}
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        <Link to="/login" style={{ color: "#9a3412", fontWeight: 700 }}>
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
