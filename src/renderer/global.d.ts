/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.svg?raw' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

// window.tony global type được khai báo ở src/preload/index.d.ts (TonyAPI)
export {}
