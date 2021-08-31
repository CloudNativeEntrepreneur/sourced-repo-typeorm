import { Repository } from "../../src/index";
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

jest.mock("../../src/persistenceLayer", () => ({
  persistenceLayer: {
    connect: jest.fn(),
  },
}));

describe("sourced-repo-typeorm", () => {
  it("should throw an error if trying to initialize a repository before connection has been established", () => {
    try {
      new Repository(Person);
    } catch (err) {
      expect(err).toEqual(
        new Error(
          "persistenceLayer has not been initialized. you must call require('sourced-repo/persistenceLayer').connect(connectionOptions); before instantiating a Repository"
        )
      );
    }
  });
});
