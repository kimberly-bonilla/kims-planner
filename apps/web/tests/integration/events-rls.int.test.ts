import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, createSignedInUser, deleteUser, hasLocalSupabase, type TestUser } from "./helpers";

const wedding = {
  name: "Alice & Sam's Wedding",
  type: "wedding",
  event_date: "2028-06-15",
  city: "Toronto",
  venue: "Rose Hall",
  currency: "cad",
};

describe.skipIf(!hasLocalSupabase)("events (EVT-1 to EVT-4, NFR-3)", () => {
  let a: TestUser;
  let b: TestUser;
  let aEventId: string;

  beforeAll(async () => {
    a = await createSignedInUser("Alice Example");
    b = await createSignedInUser("Bob Example");
    const { data, error } = await a.client.from("events").insert(wedding).select("id, owner_id").single();
    if (error) throw error;
    aEventId = data.id;
    expect(data.owner_id).toBe(a.id);
  });

  afterAll(async () => {
    await deleteUser(a);
    await deleteUser(b);
  });

  it("sets owner_id to the signed-in user automatically", async () => {
    const { data } = await adminClient().from("events").select("owner_id").eq("id", aEventId).single();
    expect(data?.owner_id).toBe(a.id);
  });

  it("lets the owner read their event", async () => {
    const { data } = await a.client.from("events").select("id, name").eq("id", aEventId);
    expect(data).toEqual([{ id: aEventId, name: wedding.name }]);
  });

  it("hides the event from other users and signed-out visitors", async () => {
    expect((await b.client.from("events").select("id").eq("id", aEventId)).data).toEqual([]);
    expect((await anonClient().from("events").select("id")).data ?? []).toEqual([]);
  });

  it("lets the owner edit every field (EVT-4)", async () => {
    const { error } = await a.client
      .from("events")
      .update({ name: "Renamed", type: "other", custom_type: "Vow renewal", event_date: "2029-01-01", currency: "usd" })
      .eq("id", aEventId);
    expect(error).toBeNull();
    const { data } = await adminClient().from("events").select("name, type, custom_type, currency").eq("id", aEventId).single();
    expect(data).toEqual({ name: "Renamed", type: "other", custom_type: "Vow renewal", currency: "usd" });
  });

  it("does not let another user edit the event", async () => {
    await b.client.from("events").update({ name: "Hacked" }).eq("id", aEventId);
    const { data } = await adminClient().from("events").select("name").eq("id", aEventId).single();
    expect(data?.name).not.toBe("Hacked");
  });

  it("does not let the owner hand the event to someone else", async () => {
    const { error } = await a.client.from("events").update({ owner_id: b.id }).eq("id", aEventId);
    expect(error).not.toBeNull();
  });

  it("does not let a user create an event owned by someone else", async () => {
    const { error } = await b.client.from("events").insert({ ...wedding, owner_id: a.id });
    expect(error).not.toBeNull();
  });

  it("blocks a second event on the free plan, even through the API (EVT-1)", async () => {
    const { error } = await a.client.from("events").insert({ ...wedding, name: "Second event" });
    expect(error?.message).toContain("event_limit_reached");
    const { count } = await adminClient().from("events").select("id", { count: "exact", head: true }).eq("owner_id", a.id);
    expect(count).toBe(1);
  });

  it("enforces the limit under simultaneous requests", async () => {
    const results = await Promise.all(
      [1, 2, 3].map((n) => b.client.from("events").insert({ ...wedding, name: `Race ${n}` })),
    );
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    const { count } = await adminClient().from("events").select("id", { count: "exact", head: true }).eq("owner_id", b.id);
    expect(count).toBe(1);
  });

  it("requires a custom type for Other and forbids one otherwise (EVT-3)", async () => {
    const c = await createSignedInUser("Carol Example");
    try {
      expect((await c.client.from("events").insert({ ...wedding, type: "other" })).error).not.toBeNull();
      expect((await c.client.from("events").insert({ ...wedding, custom_type: "Nope" })).error).not.toBeNull();
    } finally {
      await deleteUser(c);
    }
  });

  it("does not let users call the internal limit helper", async () => {
    const { error } = await a.client.rpc("max_events_for", { user_id: a.id });
    expect(error).not.toBeNull();
  });
});

describe.skipIf(!hasLocalSupabase)("profiles.default_currency", () => {
  let a: TestUser;

  beforeAll(async () => {
    a = await createSignedInUser("Dana Example");
  });

  afterAll(async () => {
    await deleteUser(a);
  });

  it("defaults to USD and can be changed by the user", async () => {
    const before = await a.client.from("profiles").select("default_currency").eq("id", a.id).single();
    expect(before.data?.default_currency).toBe("usd");
    const { error } = await a.client.from("profiles").update({ default_currency: "cad" }).eq("id", a.id);
    expect(error).toBeNull();
    const after = await adminClient().from("profiles").select("default_currency").eq("id", a.id).single();
    expect(after.data?.default_currency).toBe("cad");
  });

  it("still does not let the user make themselves admin", async () => {
    const { error } = await a.client.from("profiles").update({ is_admin: true }).eq("id", a.id);
    expect(error).not.toBeNull();
  });
});
