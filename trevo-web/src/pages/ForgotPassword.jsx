import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../lib/authApi";

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

    try {
      setIsSubmitting(true);
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "28rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>Esqueceste-te da password?</h1>
      <p>
        Envia o teu email e, se existir uma conta associada, vais receber instrucoes para
        redefinir a password.
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {submitted && (
        <p style={{ color: "green" }}>
          Se o email existir, enviamos as instrucoes de recuperacao.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "A enviar..." : "Enviar link de recuperacao"}
        </button>
      </form>

      <p>
        <Link to="/login">Voltar ao login</Link>
      </p>
    </div>
  );
}
