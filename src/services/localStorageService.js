// LocalStorage service for data persistence

const STORAGE_KEY = 'obe_system_data'

// Save all data to localStorage
export const saveData = (data) => {
  try {
    const dataToSave = {
      ...data,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    return { success: true }
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    return { success: false, error: error.message }
  }
}

// Load data from localStorage
export const loadData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return null
  }
}

// Clear all data
export const clearData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return { success: true }
  } catch (error) {
    console.error('Error clearing localStorage:', error)
    return { success: false, error: error.message }
  }
}

// Update specific part of data
export const updateData = (updates) => {
  try {
    const existingData = loadData() || {}
    const updatedData = {
      ...existingData,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    return saveData(updatedData)
  } catch (error) {
    console.error('Error updating localStorage:', error)
    return { success: false, error: error.message }
  }
}

