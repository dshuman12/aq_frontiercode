const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
function extractEnvVars(workflowPath, outputPath) {
  try {
    // Read the workflow file
    const fileContents = fs.readFileSync(workflowPath, "utf8");
    const workflow = yaml.load(fileContents);
    // Extract environment variables
    const envVars = workflow.jobs.staging_deploy.env || {};
    // Prepare the .env file content
    let envFileContent = "";
    for (const [key, value] of Object.entries(envVars)) {
      if (typeof value === "string" && value.startsWith("${{")) {
        envFileContent += `${key}=\n`;
      } else {
        envFileContent += `${key}=${value}\n`;
        if (key === "TF_VAR_ENVIRONMENT") {
          envFileContent += `ENVIRONMENT=${value}\n`;
        }
      }
    }
    // Write to .env file
    fs.writeFileSync(outputPath, envFileContent);
    console.log(`Environment variables extracted to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
  }
}
const workflowFile = path.join(__dirname, "..", ".github", "workflows", "staging.deploy.yaml");
const outputFile = path.join(__dirname, "..", ".env");
extractEnvVars(workflowFile, outputFile);
