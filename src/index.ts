import { task } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";
import { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const abiDocsPlugin: HardhatPlugin = {
  id: "hardhat-abi-docs",
  hookHandlers: {
    network: () => import("./hooks/network.js"),
  },
  tasks: [
    task("gen-abi-docs", "Generate OpenAPI spec from ABI")
    .addOption({
      name: "title",
      description: "Title Name",
      type: ArgumentType.STRING,
      defaultValue: "Hardhat"
    })
    .addOption({
      name: "contract",
      description: "Contract Name",
      type: ArgumentType.STRING,
      defaultValue: "Hardhat"
    })
    .setAction(() => import("./tasks/abi-tasks.js"))
    .build(),
  ]
};

export default abiDocsPlugin;
