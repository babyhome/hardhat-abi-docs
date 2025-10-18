import express, { Express } from "express";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { OpenAPIV3 } from "openapi-types";
import swaggerUi, { SwaggerUiOptions } from "swagger-ui-express";
import { generateOpenApiFromAbi } from "../tasks/abi-tasks.js";
import cors from "cors";
import chalk from "chalk";
import { resolve } from "path";
import swaggerUiDist from "swagger-ui-dist";
import { writeFileSync } from "fs-extra";

export async function generateInteractiveSwaggerUi(
  abi: ReadonlyArray<any>, 
  contractName: string, 
  port: number = 3000, 
  hre?: HardhatRuntimeEnvironment,
  staticOutput?: string
): Promise<void> {
  const spec: OpenAPIV3.Document = generateOpenApiFromAbi(abi, contractName);

  if (staticOutput) {
    // Static HTML generation
    const swaggerUiPath = swaggerUiDist.getAbsoluteFSPath();
    const swaggerInitializer = `
      window.onload = function() {
        window.ui  =SwaggerUIBundle({
          spec: ${JSON.stringify(spec)},
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layouts: {
            SwaggerUIStandaloneLayout: SwaggerUIStandalonePreset
          }
        });
      };
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${contractName} Interactive Docs</title>
        <link rel="stylesheet" type="text/css" href="${swaggerUiPath}/swagger-ui.css">
        <style>.swagger-ui .topbar { display: none; }</style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="${swaggerUiPath}/swagger-ui-bundle.js"></script>
        <script src="${swaggerUiPath}/swagger-ui-standalone-preset.js"></script>
        <script>${swaggerInitializer}</script>
      </body>
      </html>
    `;
    writeFileSync(resolve(staticOutput), htmlContent);
    console.log(`Static Swagger UI generated at: ${staticOutput}`);
  } else {
    // Express server
    // Setup Express app
    const app: Express = express();
    app.use(cors());
    app.use(express.json());  // Parse JSON bodies

    // Serve Swagger UI
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec, {
      customCss: './swagger-ui .topbar { display: none }',
      customSiteTitle: `${contractName} Interactive Docs`,
      swaggerOptions: {
        persistAuthorization: true,
      },
    }));

    // Health check
    app.get('/', (req, res) => {
      res.json({ message: `Swagger UI fro ${contractName} at /docs` });
    });

    // Start server
    app.listen(port, () => {
      console.log(chalk.green(` Interactive Swagger UI running at http://localhost:${port}/docs`));
      console.log(chalk.green(`OpenAPI spec available at ${contractName}-openapi.json`));
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log(`\nShutting down server...`);
      process.exit(0);
    });
  }
}


