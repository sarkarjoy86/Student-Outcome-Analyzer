/**
 * Client-Side Persistent Storage for Teacher's Reference Notes Documents
 * Uses standard browser IndexedDB to persist binary Blobs (DOCX, PDF, PPTX, TXT)
 * without exceeding localStorage size limits.
 */

const DB_NAME = 'OBE_Teacher_Notes_DB'
const DB_VERSION = 1
const STORE_NAME = 'note_documents'

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this browser environment.'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Key: composite string `${courseKey}::${fileName}`
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function makeDocKey(courseId, fileName) {
  const normCourse = (courseId || 'general').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_')
  return `${normCourse}::${fileName}`
}

/**
 * Save a document Blob to IndexedDB
 */
export async function saveNoteBlobToIDB(courseId, fileName, blob) {
  try {
    const db = await openDB()
    const key = makeDocKey(courseId, fileName)
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const record = {
        key,
        courseId: (courseId || '').trim().toUpperCase(),
        fileName,
        blob,
        updatedAt: Date.now()
      }
      const req = store.put(record)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[IndexedDB Notes] Failed to save note blob:', err)
    return false
  }
}

/**
 * Retrieve a document Blob from IndexedDB
 */
export async function getNoteBlobFromIDB(courseId, fileName) {
  try {
    const db = await openDB()
    const key = makeDocKey(courseId, fileName)
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[IndexedDB Notes] Failed to get note blob:', err)
    return null
  }
}

/**
 * Delete a specific document Blob from IndexedDB
 */
export async function deleteNoteBlobFromIDB(courseId, fileName) {
  try {
    const db = await openDB()
    const key = makeDocKey(courseId, fileName)
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(key)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[IndexedDB Notes] Failed to delete note blob:', err)
    return false
  }
}

/**
 * Clear all document Blobs for a given course
 */
export async function clearCourseBlobsFromIDB(courseId) {
  try {
    const db = await openDB()
    const targetCourse = (courseId || '').trim().toUpperCase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.openCursor()

      req.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
          if (cursor.value && cursor.value.courseId === targetCourse) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve(true)
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[IndexedDB Notes] Failed to clear course blobs:', err)
    return false
  }
}
