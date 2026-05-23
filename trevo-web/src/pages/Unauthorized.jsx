import { useTranslation } from "react-i18next";

export default function Unauthorized() {
  const { t } = useTranslation("common");

  return <div style={{ color: "black", fontSize: "32px" }}>{t("unauthorized")}</div>;
}
