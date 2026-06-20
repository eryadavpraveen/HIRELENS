import { createSlice } from '@reduxjs/toolkit'
import { mockMonitoringStatuses } from '../../utils/mockData'

const defaultStatuses = {
  face: 'PENDING',
  identity: 'PENDING',
  object: 'PENDING',
  attention: 'PENDING',
  mouth: 'PENDING',
  lipsync: 'PENDING',
  voice: 'PENDING',
  voiceSimilarity: null,
}

const initialState = {
  // Raw violation timeline events (type, timestamp, duration, message).
  liveEvents: [],
  // Latest live status for each of the 8 monitoring signals.
  statuses: defaultStatuses,
  // Transient warning popups (student-facing).
  warnings: [],
  connected: false,
}

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    addLiveEvent: (state, action) => {
      state.liveEvents.unshift({
        id: action.payload.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        ...action.payload,
      })
      if (state.liveEvents.length > 200) {
        state.liveEvents = state.liveEvents.slice(0, 200)
      }
    },
    updateStatuses: (state, action) => {
      state.statuses = { ...state.statuses, ...action.payload }
    },
    setStatuses: (state, action) => {
      state.statuses = { ...defaultStatuses, ...action.payload }
    },
    pushWarning: (state, action) => {
      state.warnings.unshift({
        id: `warn-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...action.payload,
      })
      state.warnings = state.warnings.slice(0, 10)
    },
    dismissWarning: (state, action) => {
      state.warnings = state.warnings.filter((w) => w.id !== action.payload)
    },
    setConnected: (state, action) => {
      state.connected = action.payload
    },
    setLiveEvents: (state, action) => {
      state.liveEvents = action.payload
    },
    clearMonitoring: (state) => {
      state.liveEvents = []
      state.statuses = defaultStatuses
      state.warnings = []
      state.connected = false
    },
    /** Seed the recruiter demo with realistic live statuses. */
    seedDemoStatuses: (state) => {
      state.statuses = { ...defaultStatuses, ...mockMonitoringStatuses }
      state.connected = true
    },
  },
})

export const {
  addLiveEvent,
  updateStatuses,
  setStatuses,
  pushWarning,
  dismissWarning,
  setConnected,
  setLiveEvents,
  clearMonitoring,
  seedDemoStatuses,
} = monitoringSlice.actions

export default monitoringSlice.reducer
