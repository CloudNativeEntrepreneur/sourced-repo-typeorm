import { Repository } from "../../src/index";
import { persistenceLayer } from "../../src/persistenceLayer";
import { Entity } from "sourced";

class Example extends Entity {
  id: number;
  value: number;
  constructor(snapshot?: any, events?: any) {
    super();
    this.id = null;
    this.value = 0;
    this.rehydrate(snapshot, events);
  }

  init(id) {
    this.id = id;
  }

  increment() {
    this.value++;
    this.digest("increment", {});
    this.enqueue("incremented", this);
  }
}

const postgresConnectionUrl = "FAKE_CONNECTION_FOR_UNIT_TESTS";

jest.mock("../../src/persistenceLayer", () => ({
  persistenceLayer: {
    close: jest.fn(),
    connect: jest.fn(),
    connection: {
      getRepository: jest.fn(),
    },
  },
}));

describe("sourced-repo-postgresql", () => {
  it("should exist", () => {
    expect(Repository).toBeDefined();
  });

  it("should initialize after persistence layer connection has been established", async () => {
    try {
      await persistenceLayer.connect({
        type: "postgres",
        url: postgresConnectionUrl,
        connectTimeoutMS: 1000,
      });
    } finally {
      expect(persistenceLayer.connection.getRepository).toBeDefined();
    }

    const eventsRepository = new Repository(Example);
    expect(eventsRepository).toBeDefined();
    expect(eventsRepository.get).toBeDefined();
    expect(eventsRepository.commit).toBeDefined();
  });
});
