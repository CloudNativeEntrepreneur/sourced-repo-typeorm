import { EventEmitter } from "eventemitter3";
import { createConnection, Connection, ConnectionOptions } from "typeorm";
import debug from "debug";

const log = debug("sourced-repo-typeorm");

export class PersistenceLayer extends EventEmitter {
  connection: Connection;

  constructor() {
    super();
    this.connection = null;
  }

  async connect(options: ConnectionOptions) {
    log("⏳ Initializing connection via typeorm...");

    try {
      this.connection = await createConnection(options);
      log("✅ Initialized connection via typeorm");
    } catch (err) {
      log(
        "🚨 PersistenceLayer Connection Error. Please make sure PersistenceLayer is running: ",
        err
      );
      throw new Error(err);
    }

    return this.connection;
  }

  async disconnect() {
    log("⏳ Closing sourced typeorm connection... ");
    try {
      await this.connection.close();
    } catch (err) {
      log("🚨 Error while closing PersistenceLayer Connection:", err);
      throw new Error(err);
    }
    log("✅ Closed sourced typeorm connection");
  }
}

export const persistenceLayer = new PersistenceLayer();
