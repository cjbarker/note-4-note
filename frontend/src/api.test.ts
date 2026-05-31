import { afterEach, describe, expect, it, vi } from "vitest";
import { extractFetchError, midiBlobFromBase64, renotate, transcribe } from "./api";

function mockFetch(response: { ok: boolean; status?: number; body: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("transcribe", () => {
  it("returns the parsed transcription on success", async () => {
    const result = {
      musicXml: "<score/>",
      midiBase64: "TVRoZA==",
      stats: { note_count: 3, duration_seconds: 2, tempo_bpm: 120, time_signature: "4/4" },
    };
    vi.stubGlobal("fetch", mockFetch({ ok: true, body: result }));

    await expect(transcribe(new Blob(["x"]), "a.wav")).resolves.toEqual(result);
  });

  it("throws the backend detail message on error", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ok: false, status: 400, body: { detail: "Empty upload." } })
    );

    await expect(transcribe(new Blob([]))).rejects.toThrow("Empty upload.");
  });

  it("falls back to a status message when the error body has no detail", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 500, body: {} }));

    await expect(transcribe(new Blob([]))).rejects.toThrow("Request failed (500)");
  });
});

describe("renotate", () => {
  it("returns the re-notated result (including re-timed midiBase64)", async () => {
    const result = {
      musicXml: "<score/>",
      midiBase64: "TVRoZA==",
      stats: { note_count: 3, duration_seconds: 2, tempo_bpm: 90, time_signature: "3/4" },
    };
    vi.stubGlobal("fetch", mockFetch({ ok: true, body: result }));

    await expect(renotate("TVRoZA==", 90, "3/4")).resolves.toEqual(result);
  });

  it("throws the backend detail message on error", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ok: false, status: 400, body: { detail: "Renotation failed." } })
    );

    await expect(renotate("bad", 90, "3/4")).rejects.toThrow("Renotation failed.");
  });
});

describe("midiBlobFromBase64", () => {
  it("decodes base64 into an audio/midi blob", async () => {
    const blob = midiBlobFromBase64(btoa("MThd"));
    expect(blob.type).toBe("audio/midi");
    expect(blob.size).toBe(4);
    expect(await blob.text()).toBe("MThd");
  });
});

describe("extractFetchError", () => {
  it("prefers the backend detail message", async () => {
    const res = { status: 400, json: async () => ({ detail: "nope" }) } as Response;
    expect((await extractFetchError(res)).message).toBe("nope");
  });

  it("falls back to a status message when there is no detail", async () => {
    const res = { status: 503, json: async () => ({}) } as Response;
    expect((await extractFetchError(res)).message).toBe("Request failed (503)");
  });

  it("falls back when the error body is not JSON", async () => {
    const res = {
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as Response;
    expect((await extractFetchError(res)).message).toBe("Request failed (500)");
  });
});
