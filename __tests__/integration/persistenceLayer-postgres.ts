import { Repository, persistenceLayer } from "../../src/index";
import { Entity } from "sourced";
import { v4 as uuid } from "uuid";
import debug from "debug";

const log = debug("sourced-repo-typeorm:integration-tests");
log("Starting integration tests");

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
    this.enqueue("id.assigned", this.state());
  }

  setName(name: string) {
    this.name = name;
    this.digest("setName", name);
    this.enqueue("name.set", this.state());
  }

  setAge(age: number) {
    this.age = age;
    this.digest("setAge", age);
    this.enqueue("age.set", this.state());
  }

  birthday() {
    this.age = this.age + 1;
    this.digest("birthday", {});
    this.enqueue("birthday", this.state());
  }
}

const postgresConnectionUrl =
  process.env.POSTGRES_URL ||
  "postgresql://sourced:sourced@localhost:5432/sourced";

describe("sourced-repo-typeorm", () => {
  afterAll(async () => {
    await persistenceLayer.disconnect();
  });
  it("should throw an error if trying to initialize a repository before connection has been established", () => {
    try {
      new Repository(Person);
    } catch (err) {
      expect(err).toEqual(
        new Error(
          "🚨 persistenceLayer has not been initialized. you must call require('sourced-repo/persistenceLayer').connect(connectionOptions); before instantiating a Repository"
        )
      );
    }
  });

  it("should connect to persistenceLayer, get and commit Entities, then disconnect", async () => {
    try {
      await persistenceLayer.connect({
        type: "postgres",
        url: postgresConnectionUrl,
        connectTimeoutMS: 1000,
      });
    } finally {
      expect(persistenceLayer.connection).toBeDefined();
    }

    const personRepository = new Repository(Person);

    const person1 = await personRepository.get(1);
    expect(person1).toBe(null);

    const person2 = new Person();
    const harryPotterId = uuid();
    person2.assignId(harryPotterId);
    person2.setName("Harry Potter");
    person2.setAge(17);

    await personRepository.commit(person2);

    const harryPotter = await personRepository.get(harryPotterId);

    expect(harryPotter.id).toEqual(person2.id);
    expect(harryPotter.name).toEqual(person2.name);
    expect(harryPotter.age).toEqual(person2.age);
    expect(harryPotter.version).toEqual(person2.version);

    let x = 0;
    while (x < 10) {
      harryPotter.birthday();
      x++;
    }

    await personRepository.commit(harryPotter);

    const hpFromSnapshot = await personRepository.get(harryPotterId);

    expect(hpFromSnapshot.age).toBe(27);
    expect(hpFromSnapshot.version).toBe(13);
    expect(hpFromSnapshot.snapshotVersion).toBe(13);

    hpFromSnapshot.birthday();
    hpFromSnapshot.birthday();
    hpFromSnapshot.birthday();

    await personRepository.commit(hpFromSnapshot);

    const hpFromSnapshotWithExtraEvent = await personRepository.get(
      harryPotterId
    );

    expect(hpFromSnapshotWithExtraEvent.age).toBe(30);
    expect(hpFromSnapshotWithExtraEvent.snapshotVersion).toBe(13);
    expect(hpFromSnapshotWithExtraEvent.version).toBe(16);

    let y = 0;
    while (y < 10) {
      hpFromSnapshotWithExtraEvent.birthday();
      y++;
    }

    await personRepository.commit(hpFromSnapshotWithExtraEvent);

    const hpFromMultipleSnapshots = await personRepository.get(harryPotterId);

    expect(hpFromMultipleSnapshots.snapshotVersion).toBe(26);
    expect(hpFromMultipleSnapshots.age).toBe(40);

    hpFromMultipleSnapshots.on("birthday", async (wizard) => {
      log("birthday event handler");
      expect(wizard.age).toBe(41);

      try {
        await persistenceLayer.disconnect();
      } finally {
        expect(persistenceLayer.connection).toBeDefined();
      }
    });

    hpFromMultipleSnapshots.birthday();

    await personRepository.commit(hpFromMultipleSnapshots);
  });

  it("should handle inserting a duplicate event", async () => {
    const now = Date.now();
    log("duplicate event test...");

    try {
      await persistenceLayer.connect({
        type: "postgres",
        url: postgresConnectionUrl,
        connectTimeoutMS: 1000,
      });
    } finally {
      expect(persistenceLayer.connection).toBeDefined();
    }

    const id = `test-dupe-${now}`;

    const personRepository = new Repository(Person);

    const person = new Person();
    person.assignId(id);

    await personRepository.commit(person);

    const person2 = await personRepository.get(id);

    log("person 2", { person2 });
    expect(person2.id).toEqual(id);

    const person3 = new Person();
    person3.assignId(id);

    try {
      await personRepository.commit(person3);
    } catch (err) {
      log("🚨 The Error", { detail: err.detail, code: err.code });
      expect(err).toBeDefined();
      expect(err.detail).toBeDefined();
      expect(err.code).toBe("23505");
    }
  });
});
