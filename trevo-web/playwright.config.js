import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "bash -lc 'tmpdir=$(mktemp -d /tmp/trevo-api-e2e.XXXXXX) && cp -a /home/waeiz/Trevo/trevo-api/. \"$tmpdir\" && cd \"$tmpdir\" && ./mvnw spring-boot:run -Dspring-boot.run.profiles=e2e'",
      cwd: ".",
      url: "http://127.0.0.1:8080/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      cwd: ".",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
