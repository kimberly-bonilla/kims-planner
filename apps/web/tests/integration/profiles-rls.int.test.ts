import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, createSignedInUser, deleteUser, hasLocalSupabase, type TestUser } from "./helpers";

describe.skipIf(!hasLocalSupabase)("profiles (ACC-2, NFR-3)", () => {
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    a = await createSignedInUser("Alice Example");
    b = await createSignedInUser("Bob Example");
  });

  afterAll(async () => {
    await deleteUser(a);
    await deleteUser(b);
  });

  it("creates a profile with the display name on sign-up", async () => {
    const { data } = await adminClient().from("profiles").select("display_name, is_admin").eq("id", a.id).single();
    expect(data).toEqual({ display_name: "Alice Example", is_admin: false });
  });

  it("lets a user read their own profile", async () => {
    const { data, error } = await a.client.from("profiles").select("id").eq("id", a.id);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: a.id }]);
  });

  it("hides other users' profiles", async () => {
    const { data } = await a.client.from("profiles").select("id").eq("id", b.id);
    expect(data).toEqual([]);
    const all = await a.client.from("profiles").select("id");
    expect(all.data?.map((r) => r.id)).toEqual([a.id]);
  });

  it("hides all profiles from signed-out visitors", async () => {
    const { data } = await anonClient().from("profiles").select("id");
    expect(data ?? []).toEqual([]);
  });

  it("lets a user change their own display name", async () => {
    const { error } = await a.client.from("profiles").update({ display_name: "Alice B" }).eq("id", a.id);
    expect(error).toBeNull();
    const { data } = await adminClient().from("profiles").select("display_name").eq("id", a.id).single();
    expect(data?.display_name).toBe("Alice B");
  });

  it("does not let a user change someone else's profile", async () => {
    await a.client.from("profiles").update({ display_name: "Hacked" }).eq("id", b.id);
    const { data } = await adminClient().from("profiles").select("display_name").eq("id", b.id).single();
    expect(data?.display_name).toBe("Bob Example");
  });

  it("does not let a user make themselves admin", async () => {
    const { error } = await a.client.from("profiles").update({ is_admin: true }).eq("id", a.id);
    expect(error).not.toBeNull();
    const { data } = await adminClient().from("profiles").select("is_admin").eq("id", a.id).single();
    expect(data?.is_admin).toBe(false);
  });

  it("does not let a user insert or delete profiles", async () => {
    const ins = await a.client.from("profiles").insert({ id: crypto.randomUUID(), display_name: "x" });
    expect(ins.error).not.toBeNull();
    await a.client.from("profiles").delete().eq("id", a.id);
    const { data } = await adminClient().from("profiles").select("id").eq("id", a.id);
    expect(data).toHaveLength(1);
  });
});
