import { task } from "hardhat/config";
import { ArgumentType } from "hardhat/types/arguments";
import type { HardhatPlugin } from "hardhat/types/plugins";

import "./type-extensions.js";

const plugin: HardhatPlugin = {
  id: "hardhat-abi-docs",
  hookHandlers: {
    config: () => import("./hooks/config.js"),
    network: () => import("./hooks/network.js"),
  },
  tasks: [
    task("gen-abi-docs", "Generate OpenAPI spec from ABI")
    .addOption({
      name: "title",
      description: "Hello This title name.",
      type: ArgumentType.STRING,
      defaultValue: "Hardhat"
    })
    .addOption({
      name: "contract",
      description: "Contract Name",
      type: ArgumentType.STRING,
      defaultValue: "Hardhat"
    })
    .setAction(() => import("./tasks/abi-task.js"))
    .build(),
  ],
};


export default plugin;

