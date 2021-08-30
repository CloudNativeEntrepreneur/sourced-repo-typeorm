import { Repository } from "../../src/index";
import { persistenceLayer } from "../../src/persistenceLayer";
import { Entity } from "sourced";

class Person extends Entity {
  name: string;
  age: number;

  constructor(snapshot, events) {
    super();

    this.name = "";
    this.age = 0;

    this.rehydrate(snapshot, events);
  }

  setName(name: string) {
    this.name = name;
    this.digest("setName", name);
    this.enqueue("name.set");
  }

  setAge(age: number) {
    this.age = age;
    this.digest("setAge", age);
    this.enqueue("age.set");
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

    const eventsRepository = new Repository(Person);
    expect(eventsRepository).toBeDefined();
    expect(eventsRepository.get).toBeDefined();
    expect(eventsRepository.commit).toBeDefined();
  });
});
