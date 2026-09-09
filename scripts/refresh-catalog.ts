import "./env";
import { maybeRefreshCatalog } from "../lib/catalog/refresh";

async function main() {
  const force = process.argv.includes("--force");
  const result = await maybeRefreshCatalog(force);
  if (result.skipped) {
    console.log(`Catalog refresh skipped (${result.reason}).`);
    return;
  }
  console.log(`Catalog refresh: ${result.added} added, ${result.updated} updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
