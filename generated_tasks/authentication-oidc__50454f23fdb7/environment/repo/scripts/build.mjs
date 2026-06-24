import * as esbuild from "esbuild";
import pkg from "esbuild-plugin-yaml";
const { yamlPlugin } = pkg;
import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";

const functionsDir = "src/functions";

const categories = readdirSync(functionsDir).filter((f) =>
  statSync(join(functionsDir, f)).isDirectory(),
);

for (const category of categories) {
  const categoryDir = join(functionsDir, category);
  const folders = readdirSync(categoryDir).filter((f) =>
    statSync(join(categoryDir, f)).isDirectory(),
  );

  for (const folder of folders) {
    const entry = join(categoryDir, folder, `${folder}.ts`);
    if (!existsSync(entry)) continue;

    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      // TODO: Upgrade to node24 when module-lambda-function and AWS provider
      // support nodejs24.x (requires module-lambda-function > 1.0.0,
      // hashicorp/aws >= 6.18, and Terraform >= 1.13.3)
      target: "node20",
      outdir: `build/${category}/${folder}`,
      external: ["@aws-sdk/*"],
      plugins: [yamlPlugin()],
      define: { __HANDLER_NAME__: JSON.stringify(folder) },
    });
  }
}
