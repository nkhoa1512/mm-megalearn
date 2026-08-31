import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cổng do nền tảng deploy cấp phát (Render / Railway / Fly / Heroku... đều dùng $PORT).
const port = Number(process.env.PORT) || undefined

// Phục vụ public/function.html tại đúng đường dẫn sạch "/function" (không đuôi
// .html, không hash). Trang này KHÔNG nằm trong HashRouter và không được link
// từ bất kỳ nav nào trong app — chỉ truy cập được khi gõ thẳng URL.
function hiddenFunctionSpecPage() {
  const filePath = path.resolve(__dirname, 'public/function.html')
  const middleware = (req, res, next) => {
    const cleanUrl = req.url.split('?')[0].replace(/\/$/, '')
    if (cleanUrl === '/function') {
      try {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(fs.readFileSync(filePath, 'utf-8'))
        return
      } catch {
        // rơi xuống next() nếu file chưa tồn tại
      }
    }
    next()
  }
  return {
    name: 'hidden-function-spec-page',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), hiddenFunctionSpecPage()],

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
