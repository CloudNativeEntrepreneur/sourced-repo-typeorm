import { Event } from "../../src/Event";
import { persistenceLayer } from "../../src/persistenceLayer";

jest.mock("typeorm", () => ({
  createConnection: jest.fn(() =>
    Promise.resolve({
      close: jest.fn(),
    })
  ),
  Connection: jest.fn(),
  PrimaryGeneratedColumn: jest.fn(),
  PrimaryColumn: jest.fn(),
  Column: jest.fn(),
  Entity: jest.fn(),
  Index: jest.fn(),
}));

describe("persistenceLayer", () => {
  it("should be defined", () => {
    expect(persistenceLayer).toBeDefined();
    expect(persistenceLayer.connect).toBeDefined();
    expect(persistenceLayer.disconnect).toBeDefined();
    expect(persistenceLayer.connection).toEqual(null);
  });

  it("should connect and disconnect", async () => {
    const { createConnection } = await import("typeorm");

    await persistenceLayer.connect({
      type: "postgres",
      url: "FAKE_URL_FOR_TESTING",
    });

    expect(createConnection).toBeCalledWith({
      type: "postgres",
      url: "FAKE_URL_FOR_TESTING",
      entities: [Event],
      synchronize: true,
    });
    expect(persistenceLayer.connection).toBeDefined();
    expect(persistenceLayer.connection).toEqual({
      close: expect.any(Function),
    });
    expect(persistenceLayer.connection.close).not.toBeCalled();

    await persistenceLayer.disconnect();

    expect(persistenceLayer.connection.close).toBeCalled();
  });
});
