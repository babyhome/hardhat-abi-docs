import express, { Express } from "express";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { OpenAPIV3 } from "openapi-types";
import swaggerUi, { SwaggerUiOptions } from "swagger-ui-express";
import { generateOpenApiFromAbi } from "../tasks/abi-tasks.js";
import cors from "cors";

export async function generateInteractiveSwaggerUi(abi: ReadonlyArray<any>, contractName: string, port: number = 3000, hre?: HardhatRuntimeEnvironment): Promise<void> {
  const spec: OpenAPIV3.Document = generateOpenApiFromAbi(abi, contractName);

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
    console.log(` Interactive Swagger UI running at http://localhost:${port}/docs`);
    console.log(`OpenAPI spec available at ${contractName}-openapi.json`);
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log(`\nShutting down server...`);
    process.exit(0);
  });

}


