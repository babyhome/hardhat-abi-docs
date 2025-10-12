import { writeFileSync } from "fs";
import { Abi } from "hardhat/types/artifacts";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { OpenAPIV3 } from "openapi-types";
import { solidityTypeToSchema } from "../utils/abi-mapper.js";

interface MyTaskArguments {
  title: string;
  contract: string;
}

export default async function (
  taskArgs: MyTaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  const conn = await hre.network.connect();
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
    
    const abi: Abi = artifact.abi;
    const openApiSpec = generateOpenApiFromAbi(abi, taskArgs.contract);

    // save spec to JSON
    writeFileSync(`${taskArgs.contract}-openapi.json`, JSON.stringify(openApiSpec, null, 2));
    console.log(`OpenAPI spec generated: ${taskArgs.contract}-openapi.json`);

    

  } catch (error: any) {
    console.error('Error generating OpenAPI spec:', error.message);
  }
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

  abi.forEach((item: any, index: number) => {
    if (item.type === 'function') {
      const path = `/api/${contractName}/${item.name}`;
      const method = item.stateMutability === 'view' || item.stateMutability === 'pure' ? 'get' : 'post';

      let parameters: OpenAPIV3.ParameterObject[] = [];
      let requestBody: OpenAPIV3.RequestBodyObject | undefined;

      if (method === OpenAPIV3.HttpMethods.GET) {
        parameters = item.inputs.map((input: any) => ({
          name: input.name || input.internalType || 'param',
          in: 'query',
          required: true,
          schema: solidityTypeToSchema(input.type, input.components),
          description: input.type
        }));

      } else {
        const bodySchema: OpenAPIV3.SchemaObject = {
          type: 'object',
          properties: {},
          required: item.inputs.map((input: any) => input.name || input.internalType),
        };
        item.inputs.forEach((input: any) => {
          if (bodySchema.properties) {
            bodySchema.properties[input.name || input.internalType] = solidityTypeToSchema(input.type, input.components);
          }
        });
        requestBody = {
          required: true,
          content: { 'application/json': { schema: bodySchema } },
        }
      }

      // let responseSchema: OpenAPIV3.SchemaObject = item.outputs.length === 0 ? { type: 'string', example: 'Transaction hash or success' } : solidityTypeToSchema(item.outputs[0]?.type);
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