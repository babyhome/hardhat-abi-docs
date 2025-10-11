import { HardhatRuntimeEnvironment } from "hardhat/types/hre";

interface MyTaskArguments {
  title: string;
  contract: string;
}

export default async function (
  taskArguments: MyTaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  const conn = await hre.network.connect();
  console.log("Contract Name: ", taskArguments.contract);

  try {

  } catch (error: any) {
    console.error('Error generating OpenAPI spec:', error.message);
  }
} 

