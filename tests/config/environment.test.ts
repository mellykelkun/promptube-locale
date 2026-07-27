import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "@/server/config/environment";
import { DEFAULT_APPLICATION_NAME } from "@/shared/constants/application";
import { parsePublicEnvironment } from "@/shared/config/public-environment";

describe("server environment configuration", () => {
  it("uses safe defaults when optional application metadata is absent", () => {
    expect(parseServerEnvironment({ NODE_ENV: "test" })).toEqual({
      environment: "test",
      version: "0.1.0",
    });
  });

  it("accepts explicit valid application metadata", () => {
    expect(
      parseServerEnvironment({
        APP_ENV: "production",
        APP_VERSION: "1.4.0-rc.1",
        NODE_ENV: "test",
      }),
    ).toEqual({
      environment: "production",
      version: "1.4.0-rc.1",
    });
  });

  it("fails explicitly without echoing an invalid value", () => {
    const invalidValue = "sensitive-invalid-value";

    expect(() =>
      parseServerEnvironment({
        APP_ENV: invalidValue,
      }),
    ).toThrow("Invalid server environment configuration: APP_ENV");

    try {
      parseServerEnvironment({ APP_ENV: invalidValue });
    } catch (error) {
      expect(String(error)).not.toContain(invalidValue);
    }
  });
});

describe("public environment configuration", () => {
  it("provides a non-sensitive default application name", () => {
    expect(parsePublicEnvironment({})).toEqual({
      applicationName: DEFAULT_APPLICATION_NAME,
    });
  });

  it("rejects an empty public application name", () => {
    expect(() => parsePublicEnvironment({ NEXT_PUBLIC_APP_NAME: " " })).toThrow(
      "Invalid public environment configuration: NEXT_PUBLIC_APP_NAME",
    );
  });
});
