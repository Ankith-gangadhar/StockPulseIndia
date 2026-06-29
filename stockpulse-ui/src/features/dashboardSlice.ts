import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Insight {
    type: string;
    message: string;
    sentiment: string;
}

export interface News {
    headline: string;
    impact: string;
    time: string;
}

interface DashboardState {
    insights: Insight[];
    news: News[];
    loading: boolean;
}

const initialState: DashboardState = {
    insights: [],
    news: [],
    loading: false
};

export const fetchDashboardData = createAsyncThunk(
    'dashboard/fetchData',
    async () => {
        const baseUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5200'
            : 'https://stockpulseindia.onrender.com';
        const [insightsRes, newsRes] = await Promise.all([
            fetch(`${baseUrl}/api/dashboard/insights`),
            fetch(`${baseUrl}/api/dashboard/news`)
        ]);

        const insights = await insightsRes.json();
        const news = await newsRes.json();

        return { insights, news };
    }
);

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardData.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchDashboardData.fulfilled, (state, action) => {
                state.loading = false;
                state.insights = action.payload.insights;
                state.news = action.payload.news;
            })
            .addCase(fetchDashboardData.rejected, (state) => {
                state.loading = false;
            });
    }
});

export default dashboardSlice.reducer;
