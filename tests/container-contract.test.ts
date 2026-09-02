// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('production container contract', () => {
  it('builds the frontend against the same-origin API path', () => {
    const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
    expect(dockerfile).toContain('node:20.19.4-alpine')
    expect(dockerfile).toContain('nginx:1.27.5-alpine')
    expect(dockerfile).toContain('ARG VITE_API_BASE_URL=/api')
    expect(dockerfile).toContain('npm ci')
  })

  it('disables buffering for streamed chat responses', () => {
    const nginx = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8')
    expect(nginx).toContain('location /api/')
    expect(nginx).toContain('proxy_pass http://api:8000/')
    expect(nginx).toContain('proxy_buffering off')
    expect(nginx).toContain('try_files $uri $uri/ /index.html')
  })
})
