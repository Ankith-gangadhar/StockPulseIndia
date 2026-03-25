import { configureStore } from '@reduxjs/toolkit';
import stockReducer from './features/stockSlice';
import dashboardReducer from './features/dashboardSlice';

export const store = configureStore({
    reducer: {
        stock: stockReducer,
        dashboard: dashboardReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
