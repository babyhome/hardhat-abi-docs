import "hardhat/types/config";
declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    myConfig?: {};
  }

  interface HardhatConfig {
    myConfig?: {};
  }
}

import "hardhat/types/network";
declare module "hardhat/types/network" {
  // eslint comments...
  interface NetworkConnection {
    myAccount: string;
  }
}