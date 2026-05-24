import { useTranslation } from "react-i18next";

export default function Admin() {
  const { t } = useTranslation("common");

  return <div style={{ color: "black", fontSize: "32px" }}>{t("admin")}</div>;
}
