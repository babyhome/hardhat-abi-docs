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
  taskArguments: MyTaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  const conn = await hre.network.connect();
  console.log("Contract Name:", taskArguments.contract);

  try {
    const artifact = await hre.artifacts.readArtifact(taskArguments.contract);
    const abi: Abi = artifact.abi;
    const openApiSpec = generateOpenApiFromAbi(abi, taskArguments.contract);

    // save spec to JSON
    writeFileSync(`${taskArguments.contract}-openapi.json`, JSON.stringify(openApiSpec, null, 2));
    console.log(`OpenAPI spec generated: ${taskArguments.contract}-openapi.json`);


  } catch (error: any) {
    console.error('Error generating OpenAPI spec:', error.message);
  }
} 


function generateOpenApiFromAbi(abi: Abi, contractName: string) {
  const spec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: `${contractName} Smart Contract API`,
      version: '1.0.0',
      description: 'Generated API docs from Solidity ABI',
    },
    paths: {},
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
          schema: solidityTypeToSchema(input.type),
          description: input.type
        }));

      } else {
        const bodySchema: OpenAPIV3.SchemaObject = {
          type: 'object',
          properties: {},
          required: item.inputs.map((input: any) => input.name),
        };
        item.inputs.forEach((input: any) => {
          if (bodySchema.properties) {
            bodySchema.properties[input.name] = solidityTypeToSchema(input.type);
          }
        });
        requestBody = {
          required: true,
          content: { 'application/json': { schema: bodySchema } },
        }
      }

      let responseSchema: OpenAPIV3.SchemaObject = item.outputs.length === 0 ? { type: 'string', example: 'Transaction hash or success' } : solidityTypeToSchema(item.outputs[0]?.type);

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