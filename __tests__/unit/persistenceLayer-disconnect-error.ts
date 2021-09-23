import { persistenceLayer } from "../../src/persistenceLayer";

jest.mock("typeorm", () => ({
  createConnection: jest.fn(() =>
    Promise.resolve({
      close: jest.fn(() => Promise.reject("Unable to close connection")),
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
  it("should handle error closing connection", async () => {
    await persistenceLayer.connect({
      type: "postgres",
      url: "FAKE_URL_FOR_TESTING",
    });

    try {
      await persistenceLayer.disconnect();
    } catch (err) {
      expect(err).toEqual(new Error("Unable to close connection"));
    }
  });
});
