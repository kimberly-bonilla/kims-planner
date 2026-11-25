import { describe, expect, it } from "vitest";
import { firstFieldErrors, friendlyAuthError, logInSchema, safeRedirectPath, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  it("accepts valid input and normalises email", () => {
    const r = signUpSchema.parse({ displayName: "  Kim ", email: " Kim@Example.COM ", password: "longenough" });
    expect(r).toEqual({ displayName: "Kim", email: "kim@example.com", password: "longenough" });
  });

  it("reports one message per field", () => {
    const r = signUpSchema.safeParse({ displayName: "", email: "nope", password: "short" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(firstFieldErrors(r.error)).toEqual({
      displayName: "Enter your name.",
      email: "Enter a valid email address.",
      password: "Use at least 8 characters.",
    });
  });

  it("rejects passwords over 72 characters", () => {
    expect(signUpSchema.safeParse({ displayName: "Kim", email: "k@x.co", password: "a".repeat(73) }).success).toBe(false);
  });
});

describe("logInSchema", () => {
  it("requires email and password", () => {
    const r = logInSchema.safeParse({ email: "", password: "" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(firstFieldErrors(r.error)).toEqual({ email: "Enter your email address.", password: "Enter your password." });
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/app", "/app"],
    ["/app/events/1?tab=guests", "/app/events/1?tab=guests"],
  ])("allows %s", (input, expected) => expect(safeRedirectPath(input)).toBe(expected));

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "app", "", null, undefined, 42, "/a\nb"])(
    "falls back for %s",
    (input) => expect(safeRedirectPath(input)).toBe("/app"),
  );
});

describe("friendlyAuthError", () => {
  it("maps known Supabase messages", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe("Your email or password is incorrect.");
    expect(friendlyAuthError("Email not confirmed")).toMatch(/confirm your email/);
    expect(friendlyAuthError("User already registered")).toMatch(/already exists/);
  });

  it("never leaks unknown technical messages", () => {
    expect(friendlyAuthError("connection refused at 10.0.0.1")).toBe("Something went wrong. Please try again.");
  });
});
