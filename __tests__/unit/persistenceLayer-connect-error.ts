import { persistenceLayer } from "../../src/persistenceLayer";

jest.mock("typeorm", () => ({
  createConnection: jest.fn(() => Promise.reject("Unable to connect")),
  Connection: jest.fn(),
  PrimaryGeneratedColumn: jest.fn(),
  Column: jest.fn(),
  Entity: jest.fn(),
  Index: jest.fn(),
}));

describe("persistenceLayer", () => {
  it("should handle error connecting", async () => {
    try {
      await persistenceLayer.connect({
        type: "postgres",
        url: "FAKE_URL_FOR_TESTING",
      });
    } catch (err) {
      expect(err).toEqual(new Error("Unable to connect"));
    }
  });
});
