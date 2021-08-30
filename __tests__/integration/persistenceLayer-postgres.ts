import { Repository } from "../../src/index";
import { persistenceLayer } from "../../src/persistenceLayer";
import { Entity } from "sourced";
import { v4 as uuid } from "uuid"
import debug from 'debug'

const log = debug('sourced-repo-typeorm')

class Person extends Entity {
  id: string;
  name: string;
  age: number;

  constructor(snapshot?: any, events?: any) {
    super();

    this.name = "";
    this.age = 0;

    this.rehydrate(snapshot, events);
  }

  assignId(id: string) {
    this.id = id;
    this.digest("assignId", id);
    this.enqueue("id.assigned");
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

  birthday() {
    this.age = this.age + 1;
    this.digest('birthday', {})
    this.enqueue('birthday')
  }
}

const postgresConnectionUrl =
  process.env.POSTGRES_URL ||
  "postgresql://sourced:sourced@localhost:5432/sourced";

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

  it("should initialize after persistence layer connection has been established and then disconnect", async () => {
    try {
      await persistenceLayer.connect({
        type: "postgres",
        url: postgresConnectionUrl,
        connectTimeoutMS: 1000,
      });
    } finally {
      expect(persistenceLayer.connection).toBeDefined()
    }
    
    try {
      await persistenceLayer.disconnect();
    } finally {
      expect(persistenceLayer.connection).toBeDefined()
    }
  });

  it("should get and commit Entities", async () => {
    try {
      await persistenceLayer.connect({
        type: "postgres",
        url: postgresConnectionUrl,
        connectTimeoutMS: 1000
      });
    } finally {
      expect(persistenceLayer.connection).toBeDefined()
    }
    
    const personRepository = new Repository(Person)

    let person1 = await personRepository.get(1)
    expect(person1).toBe(null)

    const person2 = new Person()
    const harryPotterId = uuid()
    person2.assignId(harryPotterId)
    person2.setName('Harry Potter')
    person2.setAge(17)

    await personRepository.commit(person2)

    let harryPotter = await personRepository.get(harryPotterId)

    expect(harryPotter.id).toEqual(person2.id)
    expect(harryPotter.name).toEqual(person2.name)
    expect(harryPotter.age).toEqual(person2.age)
    expect(harryPotter.version).toEqual(person2.version)

    let x = 0
    while (x < 10) {
      harryPotter.birthday();
      x++;
    }

    await personRepository.commit(harryPotter)

    try {
      await persistenceLayer.disconnect();
    } finally {
      expect(persistenceLayer.connection).toBeDefined()
    }
  });
});
