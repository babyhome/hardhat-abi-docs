import { ethers } from "ethers";
import { Abi } from "hardhat/types/artifacts";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { OpenAPIV3 } from "openapi-types";

interface TaskArguments {
  title: string;
  contract: string;
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
    } catch (error: unknown) {
      throw new Error(`Contract "${taskArgs.contract}" not found. Run 'npx hardhat compile' first.`)
    }

    if (!artifact.abi || artifact.abi.length === 0) {
      throw new Error(`No functions found in ABI for ${taskArgs.contract}`);
    }

    const iface = new ethers.Interface(artifact.abi);
    console.log(iface);
    // const encoded = iface.encodeFunctionData()

    const outputDir = "docs";
    const openApiSpec = generateOpenApiFromAbi(artifact.abi, taskArgs.contract);
    

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

  for (let i = 0; i < abi.length; i++) {
    console.log("i:", i, abi[i]);
  }
  
}

