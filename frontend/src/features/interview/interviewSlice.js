import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import interviewService from '../../services/interviewService'

export const fetchInterviews = createAsyncThunk(
  'interview/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await interviewService.getAll()
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchInterviewById = createAsyncThunk(
  'interview/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await interviewService.getById(id)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const createInterview = createAsyncThunk(
  'interview/create',
  async (data, { rejectWithValue }) => {
    try {
      return await interviewService.create(data)
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || error.message)
    }
  }
)

export const joinInterview = createAsyncThunk(
  'interview/join',
  async (interviewId, { rejectWithValue }) => {
    try {
      return await interviewService.join(interviewId)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const deleteInterview = createAsyncThunk(
  'interview/delete',
  async (interviewId, { rejectWithValue }) => {
    try {
      await interviewService.remove(interviewId)
      return interviewId
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || error.message)
    }
  }
)

export const completeInterview = createAsyncThunk(
  'interview/complete',
  async (arg, { rejectWithValue }) => {
    const interviewId = typeof arg === 'string' ? arg : arg.interviewId
    const reason = typeof arg === 'string' ? 'RECRUITER' : arg.reason ?? 'RECRUITER'
    try {
      return await interviewService.complete(interviewId, reason)
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || error.message)
    }
  }
)

const initialState = {
  currentInterview: null,
  interviewList: [],
  activeInterview: null,
  createdInterview: null,
  loading: false,
  error: null,
}

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    setCurrentInterview: (state, action) => {
      state.currentInterview = action.payload
    },
    setActiveInterview: (state, action) => {
      state.activeInterview = action.payload
    },
    clearCreatedInterview: (state) => {
      state.createdInterview = null
    },
    clearInterviewError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterviews.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchInterviews.fulfilled, (state, action) => {
        state.loading = false
        state.interviewList = action.payload
      })
      .addCase(fetchInterviews.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchInterviewById.fulfilled, (state, action) => {
        state.currentInterview = action.payload
      })
      .addCase(createInterview.fulfilled, (state, action) => {
        state.createdInterview = action.payload
        if (action.payload.interview) {
          state.interviewList.unshift(action.payload.interview)
        }
      })
      .addCase(joinInterview.fulfilled, (state, action) => {
        state.activeInterview = action.payload
      })
      .addCase(deleteInterview.fulfilled, (state, action) => {
        state.interviewList = state.interviewList.filter(
          (i) => i.id !== action.payload
        )
      })
      .addCase(completeInterview.fulfilled, (state, action) => {
        const updated = action.payload
        const updatedId = String(updated.id)
        const idx = state.interviewList.findIndex((i) => String(i.id) === updatedId)
        if (idx !== -1) {
          state.interviewList[idx] = { ...state.interviewList[idx], ...updated, id: updatedId }
        }
        if (state.currentInterview && String(state.currentInterview.id) === updatedId) {
          state.currentInterview = { ...state.currentInterview, ...updated, id: updatedId }
        }
      })
  },
})

export const {
  setCurrentInterview,
  setActiveInterview,
  clearCreatedInterview,
  clearInterviewError,
} = interviewSlice.actions
export default interviewSlice.reducer
