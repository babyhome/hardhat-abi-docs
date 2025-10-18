import path from "path";
import { ethers } from "ethers";
import { Abi } from "hardhat/types/artifacts";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { OpenAPIV3 } from "openapi-types";
import fs from "fs-extra";
import chalk from "chalk";
import { solidityTypeToSchema } from "../utils/abi-mapper.js";

interface TaskArguments {
  title: string;
  contract: string;
}

interface ParsedFunction {
  name: string;
  inputs: { name: string, type: string; openapiType: any }[];
  outputs: { name: string, type: string; openapiType: any }[];
  stateMutability: string;
}

export default async function (
  taskArgs: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  // const conn = await hre.network.connect();
  console.log("Contract Name:", taskArgs.contract);

  try {
    // Validate
    if (!taskArgs.contract || typeof taskArgs.contract !== 'string') {
      throw new Error('Invalid contract name');
    }

    let artifact;
    try {
      artifact = await hre.artifacts.readArtifact(taskArgs.contract);
    } catch (error) {
      throw new Error(`Contract "${taskArgs.contract}" not found. Run 'npx hardhat compile' first.`)
    }

    if (!artifact.abi || artifact.abi.length === 0) {
      throw new Error(`No functions found in ABI for ${taskArgs.contract}`);
    }

    const outputDir = "docs";
    const abi: Abi = artifact.abi;
    const openApiSpec = generateOpenApiFromAbi(abi, taskArgs.contract);


    // const iface = new ethers.Interface(artifact.abi);
    // iface.forEachFunction((item: ethers.FunctionFragment) => {
    //   console.log(" -> item: ", item.name);
    //   console.log(" --> : ", item);
    // });
    // console.log();
    // const functions = artifact.abi.filter((item: any) => item.type === 'function');
    // console.log(chalk.greenBright(`Found ${functions.length} functions in ${taskArgs.contract}`));

    console.log(chalk.green("✓ Generated API specification"));

    await fs.ensureDir(outputDir);

    const specPath: string = path.join(outputDir, `${taskArgs.contract}-opanapi.json`);
    await fs.outputJSON(specPath, openApiSpec, { spaces: 2 });
    

  } catch (error: unknown) {
    // Narrow the unknown to Error to safely access .message
    if (error instanceof Error) {
      console.error('Error generating OpenAPI spec:', error.message);
    } else {
      console.error('Error generating OpenAPI spec:', String(error));
    }
    process.exit(1);
  }

  console.log(`${hre.config.myConfig.title} !!!`);
}

export function generateOpenApiFromAbi(abi: Abi, contractName: string) {
   const spec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: `${contractName} Smart Contract API`,
      version: '1.0.0',
      description: 'Generated API docs from Solidity ABI',
    },
    paths: {},
    components: { schemas: {} }
  };

  const iface: ethers.Interface = new ethers.Interface(abi);
  console.log("iface: ", iface);
  console.log(iface.fragments);


  abi.forEach((item: any, index: number) => {
    if (item.type === 'function') {
      const path = `/api/${contractName}/${item.name}`;
      const method = item.stateMutability === 'view' || item.stateMutability === 'pure' ? 'get' : 'post';

      let parameters: OpenAPIV3.ParameterObject[] = [];
      let requestBody: OpenAPIV3.RequestBodyObject | undefined;

      if (method === OpenAPIV3.HttpMethods.GET) {
        parameters = item.inputs.map((input: any, index: number) => ({
          name: input.name || input.internalType || `param${index}`,
          in: 'query',
          required: true,
          schema: solidityTypeToSchema(input.type, input.components),
          description: input.type
        }));

      } else {
        const bodySchema: OpenAPIV3.SchemaObject = {
          type: 'object',
          properties: {},
          required: item.inputs.map((input: any) => input.name || input.internalType || `param${index}`),
        };
        item.inputs.forEach((input: any, index: number) => {
          if (bodySchema.properties) {
            bodySchema.properties[input.name || input.internalType || `param${index}`] = solidityTypeToSchema(input.type, input.components);
          }
        });

        if (item.stateMutability === 'payable') {
          if (bodySchema.properties) {
            bodySchema.properties['value'] = { type: 'integer', description: 'ETH amount in wei' };
            bodySchema.required = bodySchema.required || [];
            bodySchema.required.push('value');
          }
        }
        requestBody = {
          required: true,
          content: { 'application/json': { schema: bodySchema } },
        }
      }

      let responseSchema: OpenAPIV3.SchemaObject;
      if (item.outputs.length === 0) {
        responseSchema = { type: 'string', example: 'Transaction hash or success' };
      } else if (item.outputs.length === 1) {
        responseSchema = solidityTypeToSchema(item.outputs[0].type, item.outputs[0].components);
      } else {
        responseSchema = {
          type: 'object',
          properties: {}
        };
        item.outputs.forEach((output: any, index: number) => {
          if (responseSchema.properties) {
            const key = output.name || `return${index}`;
            responseSchema.properties[key] = solidityTypeToSchema(output.type, output.components);
          }
        });
      }

      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }

      spec.paths[path]![method] = {
        summary: `Call ${item.name} function`,
        parameters,
        requestBody,
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: responseSchema }},
          },
          '400': {
            description: 'Invalid input',
          },
          '500': {
            description: 'Contract error' },
        },
      };
    }
  })

  return spec;
}




