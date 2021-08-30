import { Event } from "../../src/Event";

describe("Event", () => {
  it("should initialize and have correct properties", () => {
    const event = new Event();
    event.id = "test-1";
    event.data = { color: "blue" };
    event.entityType = "BlueGreenDeployment";
    event.method = "setColor";
    event.snapshotVersion = 0;
    event.version = 1;

    expect(event.id).toEqual("test-1");
  });
});
