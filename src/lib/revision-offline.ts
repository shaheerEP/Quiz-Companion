/**
 * Offline Cache & Sync Engine for Revision Cards
 * Provides IndexedDB persistence with localStorage fallback,
 * offline action queueing, and automatic reconnection synchronization.
 */

export interface ReviewState {
  _id?: string;
  status: "due" | "upcoming" | "done";
  intervalIndex: number;
  currentInterval: number;
  nextDueDate: string | null;
  completed: boolean;
}

export interface RevisionNote {
  _id: string;
  front: string;
  back: string;
  explanation?: string;
  subject?: string;
  createdAt: string;
  review: ReviewState | null;
  _isOffline?: boolean;
}

export type OfflineQueueAction = "CREATE" | "UPDATE" | "DELETE" | "RATE";

export interface OfflineQueueItem {
  id: string;
  action: OfflineQueueAction;
  studentId: string;
  payload: any;
  createdAt: number;
}

export interface StudentMeta {
  studentId: string;
  name: string | null;
  rewindDays: number[] | null;
  updatedAt: number;
}

export interface CachedStudentSummary {
  _id: string;
  name: string;
  revisionRewindDays?: number[];
  cardCount?: number;
}

const DB_NAME = "QuizCompanionRevisionDB";
const DB_VERSION = 1;
const STORE_NOTES = "revision_notes";
const STORE_META = "student_meta";
const STORE_QUEUE = "sync_queue";
const STORE_ALL_STUDENTS = "all_students";

const LS_NOTES_PREFIX = "qc_notes_";
const LS_META_PREFIX = "qc_meta_";
const LS_QUEUE_KEY = "qc_sync_queue";
const LS_STUDENTS_KEY = "qc_all_students";

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          db.createObjectStore(STORE_NOTES, { keyPath: "studentId" });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "studentId" });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_ALL_STUDENTS)) {
          db.createObjectStore(STORE_ALL_STUDENTS, { keyPath: "id" });
        }
      };

      request.onsuccess = (event: any) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

/* =========================================================================
 * 1. Revision Notes Cache
 * ========================================================================= */

export async function getCachedNotes(studentId: string): Promise<RevisionNote[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_NOTES, "readonly");
      const store = tx.objectStore(STORE_NOTES);
      const req = store.get(studentId);
      const result = await new Promise<any>((resolve) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (result && Array.isArray(result.notes)) {
        return result.notes;
      }
    }
  } catch (err) {
    console.warn("[OfflineStore] IDB getCachedNotes error:", err);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(`${LS_NOTES_PREFIX}${studentId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return [];
}

export async function saveCachedNotes(studentId: string, notes: RevisionNote[]): Promise<void> {
  if (typeof window === "undefined") return;

  // Always mirror in localStorage for instant sync
  try {
    localStorage.setItem(`${LS_NOTES_PREFIX}${studentId}`, JSON.stringify(notes));
  } catch {}

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_NOTES, "readwrite");
      const store = tx.objectStore(STORE_NOTES);
      store.put({
        studentId,
        notes,
        updatedAt: Date.now(),
      });
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch (err) {
    console.warn("[OfflineStore] IDB saveCachedNotes error:", err);
  }
}

/* =========================================================================
 * 2. Student Metadata Cache
 * ========================================================================= */

export async function getCachedStudentMeta(
  studentId: string
): Promise<{ name: string | null; rewindDays: number[] | null } | null> {
  if (typeof window === "undefined") return null;

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_META, "readonly");
      const store = tx.objectStore(STORE_META);
      const req = store.get(studentId);
      const result = await new Promise<any>((resolve) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (result) {
        return { name: result.name ?? null, rewindDays: result.rewindDays ?? null };
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem(`${LS_META_PREFIX}${studentId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return null;
}

export async function saveCachedStudentMeta(
  studentId: string,
  meta: { name: string | null; rewindDays: number[] | null }
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(`${LS_META_PREFIX}${studentId}`, JSON.stringify(meta));
  } catch {}

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_META, "readwrite");
      const store = tx.objectStore(STORE_META);
      store.put({
        studentId,
        name: meta.name,
        rewindDays: meta.rewindDays,
        updatedAt: Date.now(),
      });
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}
}

/* =========================================================================
 * 3. All Students Cache (For Offline Student Selection)
 * ========================================================================= */

export async function getCachedStudentsList(): Promise<any[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_ALL_STUDENTS, "readonly");
      const store = tx.objectStore(STORE_ALL_STUDENTS);
      const req = store.get("all");
      const result = await new Promise<any>((resolve) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (result && Array.isArray(result.students)) {
        return result.students;
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem(LS_STUDENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

export async function saveCachedStudentsList(students: any[]): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LS_STUDENTS_KEY, JSON.stringify(students));
  } catch {}

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_ALL_STUDENTS, "readwrite");
      const store = tx.objectStore(STORE_ALL_STUDENTS);
      store.put({
        id: "all",
        students,
        updatedAt: Date.now(),
      });
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}
}

/* =========================================================================
 * 4. Offline Action Sync Queue
 * ========================================================================= */

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_QUEUE, "readonly");
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();
      const result = await new Promise<any[]>((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (result && result.length > 0) {
        return result.sort((a, b) => a.createdAt - b.createdAt);
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem(LS_QUEUE_KEY);
    if (raw) {
      const items: OfflineQueueItem[] = JSON.parse(raw);
      return items.sort((a, b) => a.createdAt - b.createdAt);
    }
  } catch {}

  return [];
}

function saveQueueToLocalStorage(queue: OfflineQueueItem[]) {
  try {
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function addOfflineQueueItem(
  item: Omit<OfflineQueueItem, "id" | "createdAt">
): Promise<OfflineQueueItem> {
  const newItem: OfflineQueueItem = {
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  const queue = await getOfflineQueue();
  queue.push(newItem);
  saveQueueToLocalStorage(queue);

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_QUEUE);
      store.put(newItem);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}

  return newItem;
}

export async function removeOfflineQueueItem(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  saveQueueToLocalStorage(filtered);

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_QUEUE);
      store.delete(id);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}
}

export async function updateOfflineQueueItemPayload(
  noteTempId: string,
  newPayload: any
): Promise<void> {
  const queue = await getOfflineQueue();
  const updated = queue.map((item) => {
    if (item.payload?.tempId === noteTempId || item.payload?.noteId === noteTempId) {
      return {
        ...item,
        payload: {
          ...item.payload,
          ...newPayload,
        },
      };
    }
    return item;
  });
  saveQueueToLocalStorage(updated);

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_QUEUE);
      for (const item of updated) {
        store.put(item);
      }
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}
}

export async function clearOfflineQueue(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(LS_QUEUE_KEY);
  } catch {}

  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_QUEUE);
      store.clear();
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}
}

export async function getPendingQueueCount(studentId?: string): Promise<number> {
  const queue = await getOfflineQueue();
  if (!studentId) return queue.length;
  return queue.filter((item) => item.studentId === studentId).length;
}

/* =========================================================================
 * 5. Sync Offline Queue with Server
 * ========================================================================= */

export async function syncOfflineQueue(studentId?: string): Promise<{
  success: boolean;
  syncedCount: number;
  errors: any[];
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { success: false, syncedCount: 0, errors: ["Offline"] };
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, errors: [] };
  }

  const itemsToProcess = studentId
    ? queue.filter((item) => item.studentId === studentId)
    : queue;

  let syncedCount = 0;
  const errors: any[] = [];

  for (const item of itemsToProcess) {
    try {
      if (item.action === "CREATE") {
        const res = await fetch("/api/revision/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: item.payload.front,
            back: item.payload.back,
            explanation: item.payload.explanation,
            subject: item.payload.subject,
            studentId: item.studentId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        await removeOfflineQueueItem(item.id);
        syncedCount++;
      } else if (item.action === "UPDATE") {
        const res = await fetch("/api/revision/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (res.ok || res.status === 404) {
          await removeOfflineQueueItem(item.id);
          syncedCount++;
        } else {
          throw new Error(`Server returned ${res.status}`);
        }
      } else if (item.action === "DELETE") {
        const res = await fetch("/api/revision/notes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (res.ok || res.status === 404) {
          await removeOfflineQueueItem(item.id);
          syncedCount++;
        } else {
          throw new Error(`Server returned ${res.status}`);
        }
      } else if (item.action === "RATE") {
        const res = await fetch("/api/revision/due", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (res.ok || res.status === 404) {
          await removeOfflineQueueItem(item.id);
          syncedCount++;
        } else {
          throw new Error(`Server returned ${res.status}`);
        }
      }
    } catch (err: any) {
      console.error("[OfflineSync] Error syncing item:", item, err);
      errors.push({ id: item.id, error: err?.message || String(err) });
      if (!navigator.onLine) break;
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors,
  };
}
