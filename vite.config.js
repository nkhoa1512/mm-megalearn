import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cổng do nền tảng deploy cấp phát (Render / Railway / Fly / Heroku... đều dùng $PORT).
const port = Number(process.env.PORT) || undefined

export default defineConfig({
  plugins: [react()],

  // Asset dùng đường dẫn tương đối để bản build chạy được cả khi host ở
  // thư mục con (vd. https://example.com/lms/). App dùng HashRouter nên
  // không cần rewrite route phía server.
  base: './',

  server: {
    // `host: true` bind 0.0.0.0 — nếu nền tảng chạy dev server trong container
    // thì bên ngoài mới truy cập được (bind localhost là không ai thấy).
    host: true,
    port: port || 5173,
  },

  preview: {
    host: true,
    port: port || 4173,
    // Nền tảng phục vụ qua domain riêng nên phải cho phép mọi Host header.
    allowedHosts: true,
  },
})
