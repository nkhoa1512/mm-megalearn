import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isDarkMode: false,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
  },
});

export const { toggleDarkMode } = appSlice.actions;

export default appSlice.reducer;
