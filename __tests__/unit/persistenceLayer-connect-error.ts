import { persistenceLayer } from "../../src/persistenceLayer";

jest.mock("typeorm", () => ({
  createConnection: jest.fn(() => Promise.reject("Unable to connect")),
  Connection: jest.fn(),
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
