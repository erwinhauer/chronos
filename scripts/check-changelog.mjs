// Controle vóór het pushen naar beta/main: als er app-code of migraties zijn gewijzigd ten
// opzichte van de remote, moet er ook een nieuwe changelog-entry bij (scripts/release-changelog.mjs
// aangepast én package.json "version" opgehoogd). Gebruik: `npm run check:changelog [remote-branch]`,
// standaard origin/beta.
import { execSync } from "node:child_process";

const basis = process.argv[2] ?? "origin/beta";
const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const gewijzigd = run(`git diff --name-only ${basis}...HEAD`).split("\n").filter(Boolean);
const appCode = gewijzigd.filter((f) => f.startsWith("src/") || f.startsWith("supabase/migrations/"));

if (appCode.length === 0) {
  console.log(`✓ Geen app-wijzigingen t.o.v. ${basis}, geen changelog-entry nodig.`);
  process.exit(0);
}

const changelogAangepast = gewijzigd.includes("scripts/release-changelog.mjs");
const versieAangepast = run(`git diff ${basis}...HEAD -- package.json`).includes('"version"');

if (!changelogAangepast || !versieAangepast) {
  console.error(
    `✗ Er zijn ${appCode.length} app-bestanden gewijzigd t.o.v. ${basis}, maar de changelog is niet bijgewerkt:\n` +
      `  - scripts/release-changelog.mjs aangepast: ${changelogAangepast ? "ja" : "NEE"}\n` +
      `  - package.json "version" opgehoogd: ${versieAangepast ? "ja" : "NEE"}\n` +
      `Voeg een nieuwe release-entry toe (zie de REGEL bovenaan release-changelog.mjs).`
  );
  process.exit(1);
}
console.log(`✓ Changelog en versienummer zijn bijgewerkt t.o.v. ${basis}.`);
