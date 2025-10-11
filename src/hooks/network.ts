import { NetworkHooks, HookContext } from "hardhat/types/hooks";
import { ChainType, NetworkConnection } from "hardhat/types/network";

export default async (): Promise<Partial<NetworkHooks>> => {
  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ): Promise<NetworkConnection<ChainTypeT>> {
      const connection = await next(context);

      console.log("Connection created wth ID", connection.id);

      // Get the accounts from the connection
      const accounts: string[] = await connection.provider.request({ method: 'eth_accounts' });

      connection.myAccount = accounts[0];

      return connection;
    },
    async onRequest(context, networkConnection, jsonRpcRequest, next) {
      console.log(`Request from connection ${networkConnection.id} is being processed - Method: ${jsonRpcRequest.method}`, );

      return next(context, networkConnection, jsonRpcRequest);
    },
  };

  return handlers;
};
