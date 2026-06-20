import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import reportService from '../../services/reportService'

export const fetchReports = createAsyncThunk(
  'report/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await reportService.getAll()
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchReportById = createAsyncThunk(
  'report/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await reportService.getById(id)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const initialState = {
  reports: [],
  selectedReport: null,
  loading: false,
  error: null,
}

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setSelectedReport: (state, action) => {
      state.selectedReport = action.payload
    },
    clearSelectedReport: (state) => {
      state.selectedReport = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false
        state.reports = action.payload
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.selectedReport = action.payload
      })
  },
})

export const { setSelectedReport, clearSelectedReport } = reportSlice.actions
export default reportSlice.reducer
