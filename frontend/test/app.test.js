import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import App from '../src/App.vue'
import { router as appRouter } from '../src/router.js'
import RecordForm from '../src/components/RecordForm.vue'
import { studentFields } from '../src/fields.js'

const require = createRequire(import.meta.url)
const { startServer } = require('../../backend/server.js')
const networkFetch = globalThis.fetch
let runtime, base, wrapper, router
let offline = false
const jsonPath = resolve(process.cwd(), '../backend/students.json')
const originalJson = readFileSync(jsonPath, 'utf8')
const dbName = `cis3339_homework1_vue_test_${randomUUID().replaceAll('-', '')}`

beforeAll(async () => {
  runtime = await startServer({ uri: `mongodb://127.0.0.1:27017/${dbName}`, port: 0 })
  base = `http://127.0.0.1:${runtime.server.address().port}`
  // jsdom supplies a browser DOM; HTTP requests still go to the real Express API.
  vi.stubGlobal('fetch', (url, options) => {
    if (offline) return Promise.reject(new TypeError('Network unavailable'))
    return networkFetch(new URL(url, base), options)
  })
  console.log(`Retained isolated Vue integration database: ${dbName}`)
}, 15000)
afterAll(async () => {
  vi.unstubAllGlobals()
  if (runtime) await runtime.close()
  expect(readFileSync(jsonPath, 'utf8')).toBe(originalJson)
})
afterEach(() => { wrapper?.unmount(); wrapper = null; offline = false })

async function api(path, body) {
  const response = await networkFetch(`${base}/api${path}`, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  expect(response.ok).toBe(true)
  return response.json()
}
async function open(path) {
  router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes })
  await router.push(path)
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
  await idle()
}
async function idle() {
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.findAll('.loading')).toHaveLength(0))
}
async function click(text) {
  const button = wrapper.findAll('button').find(item => item.text() === text)
  expect(button, `Button: ${text}`).toBeTruthy()
  await button.trigger('click')
  await idle()
}

describe('Vue views with real Express/MongoDB responses', () => {
  it('adds/searches/displays/deletes students and shows duplicate-ID errors', async () => {
    await open('/students')
    expect(wrapper.text()).toContain('No students yet')
    for (const [field, value] of Object.entries({ name: 'John', id: '1001', phone: '555-1234', zip: '00770' })) {
      await wrapper.get(`#student-${field}`).setValue(value)
    }
    await wrapper.get('form').trigger('submit')
    await idle()
    expect(wrapper.text()).toContain('Student added successfully')
    expect(wrapper.get('#student-name').element.value).toBe('')
    expect(wrapper.text()).toContain('00770')
    for (const [field, value] of Object.entries({ name: 'Other', id: '1001', phone: '555', zip: '77001' })) {
      await wrapper.get(`#student-${field}`).setValue(value)
    }
    await wrapper.get('form').trigger('submit'); await idle()
    expect(wrapper.get('[role="alert"]').text()).toContain('student ID already exists')
    expect(wrapper.get('#student-name').element.value).toBe('Other')
    await wrapper.get('#student-search').setValue('Missing')
    await wrapper.get('.search-form').trigger('submit'); await idle()
    expect(wrapper.text()).toContain('No students match that name')
    await wrapper.get('#student-search').setValue('John')
    await wrapper.get('.search-form').trigger('submit'); await idle()
    expect(wrapper.get('tbody').text()).toContain('John')
    await wrapper.get('tbody a').trigger('click'); await idle()
    expect(wrapper.text()).toContain('Student details')
    expect(wrapper.get('dd').text()).toBe('1001')
    await click('Delete')
    await click('Cancel')
    expect((await api('/students')).length).toBe(1)
    await click('Delete')
    await click('Confirm delete')
    expect(wrapper.text()).toContain('Student and related enrollments deleted')
    expect(await api('/students')).toEqual([])
  })

  it('uses exact course fields, reports duplicates, and confirms deletion', async () => {
    await open('/courses')
    await wrapper.get('#course-id').setValue('CIS 3339')
    await wrapper.get('#course-name').setValue('Enterprise Applications Development')
    await wrapper.get('form').trigger('submit'); await idle()
    expect(wrapper.text()).toContain('Course added successfully')
    const courses = await api('/courses')
    expect(courses[0]).toMatchObject({ id: 'CIS 3339', name: 'Enterprise Applications Development' })
    await wrapper.get('#course-id').setValue('CIS 3339')
    await wrapper.get('#course-name').setValue('Duplicate')
    await wrapper.get('form').trigger('submit'); await idle()
    expect(wrapper.get('[role="alert"]').text()).toContain('course ID already exists')
    await click('Delete')
    expect((await api('/courses')).length).toBe(1)
    await click('Confirm delete')
    expect(await api('/courses')).toEqual([])
  })

  it('populates enrollment choices, rejects duplicates, refreshes rosters after deletion', async () => {
    await api('/students', { name: 'Jane', id: '1002', phone: '555-5678', zip: '77002' })
    await api('/courses', { id: 'CIS 3368', name: 'Advanced Object-Oriented Programming' })
    await open('/enrollments')
    expect(wrapper.get('#enroll-student').text()).toContain('Jane (1002)')
    expect(wrapper.get('#enroll-course').text()).toContain('CIS 3368')
    await wrapper.get('#enroll-student').setValue('1002')
    await wrapper.get('#enroll-course').setValue('CIS 3368')
    await wrapper.get('form').trigger('submit'); await idle()
    expect(wrapper.text()).toContain('Student enrolled successfully')
    expect(wrapper.get('tbody').text()).toContain('Jane')
    await wrapper.get('form').trigger('submit'); await idle()
    expect(wrapper.get('[role="alert"]').text()).toContain('already enrolled')
    await router.push('/students'); await idle()
    await click('Delete'); await click('Confirm delete')
    await router.push('/enrollments'); await idle()
    expect(wrapper.get('#enroll-student').text()).not.toContain('Jane')
    await wrapper.get('#roster-course').setValue('CIS 3368'); await idle()
    expect(wrapper.text()).toContain('No students enrolled in this course yet')
    expect((await api(`/courses/${encodeURIComponent('CIS 3368')}/students`)).students).toEqual([])
  })

  it('handles API 404 and network errors with a working retry', async () => {
    await open('/students/not-present')
    expect(wrapper.get('[role="alert"]').text()).toContain('Student not found')
    await router.push('/students'); await idle()
    offline = true
    await click('Refresh all')
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to reach the server')
    offline = false
    await click('Refresh all')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await router.push('/unknown'); await idle()
    expect(wrapper.text()).toContain('Page not found')
  })
})

it('validates whitespace-only fields and trims emitted values without DOM scripts', async () => {
  wrapper = mount(RecordForm, { props: { fields: studentFields, prefix: 'test' } })
  await wrapper.get('#test-name').setValue('   ')
  await wrapper.get('form').trigger('submit')
  expect(wrapper.get('[role="alert"]').text()).toContain('Name is required')
  expect(wrapper.emitted('submit')).toBeUndefined()
  for (const [field, value] of Object.entries({ name: ' <John> ', id: ' 001 ', phone: ' 555-1234 ', zip: ' 00770 ' })) {
    await wrapper.get(`#test-${field}`).setValue(value)
  }
  await wrapper.get('form').trigger('submit')
  expect(wrapper.emitted('submit')[0][0]).toEqual({ name: '<John>', id: '001', phone: '555-1234', zip: '00770' })
})
