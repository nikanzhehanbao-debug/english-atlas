import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { database } from "../lib/storage/repository";
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(async () => {
  const db = await database();
  const tx = db.transaction(
    ["settings", "lessonProgress", "exerciseAttempts", "seenItems"],
    "readwrite",
  );
  await Promise.all(
    Array.from(tx.objectStoreNames).map((name) => tx.objectStore(name).clear()),
  );
  await tx.done;
});
