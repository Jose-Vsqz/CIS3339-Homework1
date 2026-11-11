const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { startServer } = require('../backend/server');

test('production frontend and API work together with a fresh standalone database', async (t) => {
    const dbName = `cis3339_homework1_prod_test_${randomUUID().replaceAll('-', '')}`;
    const uri = `mongodb://127.0.0.1:27017/${dbName}`;
    const jsonPath = path.join(__dirname, '../backend/students.json');
    const before = await readFile(jsonPath);
    let runtime = await startServer({ uri, port: 0 });
    t.after(async () => { if (runtime) await runtime.close(); });
    console.log(`Isolated production test database retained: ${dbName}`);
    const url = (route) => `http://127.0.0.1:${runtime.server.address().port}${route}`;
    const api = async (method, route, body, expected = 200) => {
        const response = await fetch(url(route), {
            method, headers: { 'Content-Type': 'application/json', Accept: 'text/html,application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        assert.equal(response.status, expected, `${method} ${route}`);
        assert.match(response.headers.get('content-type'), /application\/json/);
        return response.json();
    };

    await t.test('fresh database automatically creates collections and unique indexes', async () => {
        assert.deepEqual(await api('GET', '/api/students'), []);
        assert.deepEqual(await api('GET', '/api/courses'), []);
        for (const model of [runtime.models.Student, runtime.models.Course]) {
            assert.ok((await model.collection.indexes()).some(index => index.unique && index.key.id === 1));
        }
        assert.ok((await runtime.models.Enrollment.collection.indexes()).some(index => index.unique && index.key.student && index.key.course));
    });

    await t.test('direct and refreshed Vue routes serve the actual build with working JS and CSS', async () => {
        const built = await readFile(path.join(__dirname, '../frontend/dist/index.html'), 'utf8');
        for (const route of ['/', '/index.html', '/students', '/students/1001', '/courses', '/courses.html', '/enrollments']) {
            for (let navigation = 0; navigation < 2; navigation++) {
                const response = await fetch(url(route), { headers: { Accept: 'text/html' } });
                assert.equal(response.status, 200, route);
                assert.match(response.headers.get('content-type'), /text\/html/);
                assert.equal(await response.text(), built);
            }
        }
        const assets = [...built.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
        assert.ok(assets.some(asset => asset.endsWith('.js')));
        assert.ok(assets.some(asset => asset.endsWith('.css')));
        for (const asset of assets) {
            const response = await fetch(url(asset));
            assert.equal(response.status, 200, asset);
            assert.match(response.headers.get('content-type'), asset.endsWith('.js') ? /javascript/ : /text\/css/);
            assert.ok((await response.text()).length > 0);
        }
        assert.equal((await fetch(url('/enrollments'), { method: 'HEAD' })).status, 200);
    });

    await t.test('unknown APIs, missing assets, and private files never return the SPA', async () => {
        for (const route of ['/api', '/api/missing', '/assets/missing.js', '/.env', '/backend/students.json', '/missing']) {
            assert.deepEqual(await api('GET', route, undefined, 404), { error: 'Endpoint not found' });
        }
        await api('POST', '/students', {}, 404);
        await api('POST', '/api/students', {}, 400);
    });

    const student = { name: 'Production Test Student', id: 'production-1001', phone: '555-1234', zip: '00770' };
    const course = { id: 'CIS 3339', name: 'Production Test Course' };
    const enrollment = { studentId: student.id, courseId: course.id };
    const courseUrl = `/api/courses/${encodeURIComponent(course.id)}`;
    await t.test('all student/course/enrollment endpoints retain their JSON behavior on the production origin', async () => {
        assert.equal((await api('POST', '/api/students', student, 201)).student.zip, '00770');
        await api('POST', '/api/students', student, 409);
        assert.equal((await api('GET', `/api/students/${student.id}`)).name, student.name);
        assert.equal((await api('GET', `/api/students?name=${encodeURIComponent(student.name)}`)).length, 1);
        assert.equal((await api('GET', '/api/students')).length, 1);
        await api('POST', '/api/courses', course, 201);
        await api('POST', '/api/courses', course, 409);
        assert.equal((await api('GET', '/api/courses')).length, 1);
        await api('POST', '/api/enrollments', { ...enrollment, studentId: 'missing' }, 404);
        await api('POST', '/api/enrollments', { ...enrollment, courseId: 'missing' }, 404);
        await api('POST', '/api/enrollments', enrollment, 201);
        await api('POST', '/api/enrollments', enrollment, 409);
        assert.equal((await api('GET', `${courseUrl}/students`)).students[0].id, student.id);
    });

    await t.test('production records persist across restart and both cascades work', async () => {
        await runtime.close();
        runtime = null;
        runtime = await startServer({ uri, port: 0 });
        assert.equal((await api('GET', '/api/students')).length, 1);
        assert.equal((await api('GET', `${courseUrl}/students`)).students.length, 1);
        await api('DELETE', `/api/students/${student.id}`);
        assert.deepEqual((await api('GET', `${courseUrl}/students`)).students, []);
        assert.equal(await runtime.models.Enrollment.countDocuments(), 0);
        await api('POST', '/add-student', student, 201);
        assert.equal((await api('POST', '/find-student', { name: student.name })).id, student.id);
        await api('POST', '/api/enrollments', enrollment, 201);
        await api('DELETE', courseUrl);
        assert.equal(await runtime.models.Enrollment.countDocuments(), 0);
        await api('POST', '/delete-student', { name: student.name });
        assert.deepEqual(await api('GET', '/api/students'), []);
    });
    assert.deepEqual(await readFile(jsonPath), before);
});
