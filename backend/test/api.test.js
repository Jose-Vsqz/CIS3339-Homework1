const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { startServer } = require('../server');

test('MongoDB API integration (isolated database, no existing data removed)', async (t) => {
    const dbName = `cis3339_homework1_test_${randomUUID().replaceAll('-', '')}`;
    const uri = `mongodb://127.0.0.1:27017/${dbName}`;
    const originalJson = await readFile(path.join(__dirname, '../students.json'), 'utf8');
    let runtime = await startServer({ uri, port: 0 });
    t.after(async () => { if (runtime) await runtime.close(); });
    console.log(`Isolated test database retained: ${dbName}`);
    const request = async (method, route, body, expected = 200) => {
        const response = await fetch(`http://127.0.0.1:${runtime.server.address().port}${route}`, {
            method, headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const result = await response.json();
        assert.equal(response.status, expected, JSON.stringify(result));
        return result;
    };
    const student = { name: 'John', id: '1001', phone: '555-1234', zip: '77001' };
    const course = { id: 'CIS 3339', name: 'Enterprise Applications Development' };
    const enrollment = { studentId: student.id, courseId: course.id };
    await t.test('empty database initializes collections and unique indexes', async () => {
        assert.deepEqual(await request('GET', '/api/students'), []);
        assert.deepEqual(await request('GET', '/api/courses'), []);
        for (const model of [runtime.models.Student, runtime.models.Course]) {
            assert.ok((await model.collection.indexes()).some((index) => index.unique && index.key.id === 1));
        }
        assert.ok((await runtime.models.Enrollment.collection.indexes()).some((index) => index.unique && index.key.student && index.key.course));
    });
    await t.test('validation and malformed requests return JSON errors', async () => {
        for (const body of [{}, { ...student, name: ' ' }, { ...student, id: {} }, { ...student, phone: null }, { ...student, zip: 'x'.repeat(21) }]) {
            await request('POST', '/api/students', body, 400);
        }
        await request('POST', '/api/courses', { id: ' ' }, 400);
        await request('POST', '/api/enrollments', {}, 400);
        await request('POST', '/find-student', {}, 400);
        await request('POST', '/delete-student', {}, 400);
        const invalid = await fetch(`http://127.0.0.1:${runtime.server.address().port}/api/students`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
        });
        assert.equal(invalid.status, 400);
        assert.ok((await invalid.json()).error);
        await request('GET', '/missing', undefined, 404);
    });
    await t.test('student CRUD, exact-name search, duplicates, and legacy compatibility', async () => {
        assert.equal((await request('POST', '/add-student', student, 201)).student.id, student.id);
        await request('POST', '/api/students', student, 409);
        assert.equal((await request('POST', '/find-student', { name: 'John' })).id, student.id);
        await request('POST', '/find-student', { name: 'john' }, 404);
        assert.equal((await request('GET', '/api/students/1001')).name, 'John');
        assert.equal((await request('GET', '/api/students?name=John')).length, 1);
        await request('GET', '/api/students/absent', undefined, 404);
        await request('DELETE', '/api/students/absent', undefined, 404);
        await request('POST', '/api/students', { ...student, id: '1002', name: 'Jane' }, 201);
    });
    await t.test('courses, valid references, duplicate enrollments, and rosters', async () => {
        await request('POST', '/api/courses', course, 201);
        await request('POST', '/api/courses', course, 409);
        assert.equal((await request('GET', '/api/courses')).length, 1);
        assert.deepEqual((await request('GET', '/api/courses/CIS%203339/students')).students, []);
        await request('POST', '/api/enrollments', { ...enrollment, studentId: 'missing' }, 404);
        await request('POST', '/api/enrollments', { ...enrollment, courseId: 'missing' }, 404);
        await request('POST', '/api/enrollments', enrollment, 201);
        await request('POST', '/api/enrollments', enrollment, 409);
        await request('POST', '/api/enrollments', { ...enrollment, studentId: '1002' }, 201);
        assert.equal((await request('GET', '/api/courses/CIS%203339/students')).students.length, 2);
        await request('GET', '/api/courses/missing/students', undefined, 404);
        await request('DELETE', '/api/courses/missing', undefined, 404);
    });
    await t.test('records survive full server and database connection restart', async () => {
        await runtime.close();
        runtime = null;
        runtime = await startServer({ uri, port: 0 });
        assert.equal((await request('GET', '/api/students')).length, 2);
        assert.equal((await request('GET', '/api/courses')).length, 1);
        assert.equal((await request('GET', '/api/courses/CIS%203339/students')).students.length, 2);
    });
    await t.test('student and course deletions cascade without deleting unrelated records', async () => {
        await request('DELETE', '/api/students/1001');
        assert.equal(await runtime.models.Enrollment.countDocuments(), 1);
        assert.equal((await request('GET', '/api/courses/CIS%203339/students')).students[0].id, '1002');
        await request('DELETE', '/api/courses/CIS%203339');
        assert.equal(await runtime.models.Enrollment.countDocuments(), 0);
        assert.equal((await request('GET', '/api/students')).length, 1);
        await request('POST', '/delete-student', { name: 'Jane' });
        await request('POST', '/delete-student', { name: 'Jane' }, 404);
    });
    await t.test('concurrent duplicate requests and enrollment/deletion cannot orphan records', async () => {
        await request('POST', '/api/students', student, 201);
        await request('POST', '/api/courses', course, 201);
        const responses = await Promise.all([1, 2].map(() => fetch(`http://127.0.0.1:${runtime.server.address().port}/api/enrollments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enrollment)
        })));
        assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
        await Promise.all([
            request('DELETE', '/api/students/1001'),
            fetch(`http://127.0.0.1:${runtime.server.address().port}/api/enrollments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enrollment)
            }).then(async (response) => { await response.json(); assert.ok([404, 409].includes(response.status)); })
        ]);
        assert.equal(await runtime.models.Enrollment.countDocuments(), 0);
    });
    await t.test('legacy name deletion rejects ambiguous names', async () => {
        await request('POST', '/api/students', student, 201);
        await request('POST', '/api/students', { ...student, id: '1003' }, 201);
        await request('POST', '/delete-student', { name: 'John' }, 409);
        assert.equal((await request('GET', '/api/students')).length, 2);
    });
    await t.test('database disconnection returns a JSON service error', async () => {
        await runtime.connection.close();
        await request('GET', '/api/students', undefined, 503);
    });
    assert.equal(await readFile(path.join(__dirname, '../students.json'), 'utf8'), originalJson);
});

test('startup rejects missing configuration and unavailable MongoDB', async () => {
    await assert.rejects(startServer({ uri: '', port: 0 }), /MONGODB_URI/);
    await assert.rejects(startServer({ uri: 'mongodb://127.0.0.1:1/unavailable', port: 0 }));
    await assert.rejects(startServer({ port: 'invalid' }), /PORT/);
});
