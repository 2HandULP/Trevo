import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, validatePasswordResetToken } from "../lib/authApi";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
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
        setError(t("missingResetToken"));
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
  }, [token, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    try {
      setIsSubmitting(true);
      await confirmPasswordReset(token, newPassword);
      navigate("/login", {
        replace: true,
        state: { message: t("passwordReset") },
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "28rem", margin: "4rem auto", padding: "2rem", color: "black" }}>
      <h1>{t("resetPasswordTitle")}</h1>

      {tokenStatus === "checking" && <p>{t("validatingLink")}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {tokenStatus === "valid" && (
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type="password"
              name="newPassword"
              placeholder={t("newPassword")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div>
            <input
              type="password"
              name="confirmPassword"
              placeholder={t("confirmPassword")}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving", { ns: "common" }) : t("resetPasswordSubmit")}
          </button>
        </form>
      )}

      {tokenStatus === "invalid" && (
        <p>
          <Link to="/forgot-password">{t("requestNewLink")}</Link>
        </p>
      )}
    </div>
  );
}
