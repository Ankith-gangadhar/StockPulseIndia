import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface StockData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    timestamp?: string;
}

interface StockState {
    stocks: StockData[];
    status: 'idle' | 'connected' | 'error';
}

const initialState: StockState = {
    stocks: [],
    status: 'idle'
};

const stockSlice = createSlice({
    name: 'stock',
    initialState,
    reducers: {
        setStocks(state, action: PayloadAction<StockData[]>) {
            state.stocks = action.payload;
        },
        setConnectionStatus(state, action: PayloadAction<'idle' | 'connected' | 'error'>) {
            state.status = action.payload;
        }
    }
});

export const { setStocks, setConnectionStatus } = stockSlice.actions;
export default stockSlice.reducer;
