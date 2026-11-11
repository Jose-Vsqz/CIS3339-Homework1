const express = require('express');
const cors = require('cors');
const path = require('node:path');

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
function requiredText(value, field) {
    if (typeof value !== 'string' || !value.trim()) fail(400, `${field} must be a nonempty string`);
    return value.trim();
}
function fields(body, names) {
    return Object.fromEntries(names.map((name) => [name, requiredText(body?.[name], name)]));
}

function createApp({ Student, Course, Enrollment }) {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '32kb' }));
    // Serialize mutations in this server to prevent enrollment/delete races.
    // This supports standalone MongoDB without transactions or a replica set.
    let pending = Promise.resolve();
    const mutate = (handler) => (req, res, next) => {
        const operation = pending.then(() => handler(req, res));
        pending = operation.catch(() => {});
        operation.catch(next);
    };
    const find = async (Model, query, label) => {
        const record = await Model.findOne(query);
        if (!record) fail(404, `${label} not found`);
        return record;
    };
    const addStudent = async (req, res) => {
        const student = await Student.create(fields(req.body, ['name', 'id', 'phone', 'zip']));
        res.status(201).json({ message: 'Student added successfully', student });
    };
    const deleteStudent = async (student, res) => {
        await Enrollment.deleteMany({ student: student._id });
        await Student.deleteOne({ _id: student._id });
        res.json({ message: 'Student deleted successfully', student });
    };
    app.get('/api/students', async (req, res) => {
        const query = req.query.name === undefined ? {} : { name: requiredText(req.query.name, 'name') };
        res.json(await Student.find(query).sort({ name: 1, id: 1 }));
    });
    app.get('/api/students/:id', async (req, res) => {
        res.json(await find(Student, { id: requiredText(req.params.id, 'id') }, 'Student'));
    });
    app.post('/api/students', mutate(addStudent));
    app.delete('/api/students/:id', mutate(async (req, res) => {
        await deleteStudent(await find(Student, { id: requiredText(req.params.id, 'id') }, 'Student'), res);
    }));
    app.post('/add-student', mutate(addStudent));
    app.post('/find-student', async (req, res) => {
        res.json(await find(Student, { name: requiredText(req.body?.name, 'name') }, 'Student'));
    });
    app.post('/delete-student', mutate(async (req, res) => {
        const name = requiredText(req.body?.name, 'name');
        const matches = await Student.find({ name }).limit(2);
        if (!matches.length) fail(404, 'Student not found');
        if (matches.length > 1) fail(409, 'Multiple students share this name; delete by student ID');
        await deleteStudent(matches[0], res);
    }));
    app.get('/api/courses', async (req, res) => res.json(await Course.find().sort({ id: 1 })));
    app.post('/api/courses', mutate(async (req, res) => {
        const course = await Course.create(fields(req.body, ['id', 'name']));
        res.status(201).json({ message: 'Course added successfully', course });
    }));
    app.delete('/api/courses/:id', mutate(async (req, res) => {
        const course = await find(Course, { id: requiredText(req.params.id, 'id') }, 'Course');
        await Enrollment.deleteMany({ course: course._id });
        await Course.deleteOne({ _id: course._id });
        res.json({ message: 'Course deleted successfully', course });
    }));
    app.post('/api/enrollments', mutate(async (req, res) => {
        const { studentId, courseId } = fields(req.body, ['studentId', 'courseId']);
        const student = await find(Student, { id: studentId }, 'Student');
        const course = await find(Course, { id: courseId }, 'Course');
        const enrollment = await Enrollment.create({ student: student._id, course: course._id });
        res.status(201).json({ message: 'Student enrolled successfully', enrollment });
    }));
    app.get('/api/courses/:id/students', async (req, res) => {
        const course = await find(Course, { id: requiredText(req.params.id, 'id') }, 'Course');
        const enrollments = await Enrollment.find({ course: course._id }).populate('student');
        res.json({ course, students: enrollments.map((item) => item.student).filter(Boolean) });
    });
    // Keep unknown API endpoints JSON-only, even when the browser accepts HTML.
    app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));

    const frontendDirectory = path.join(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendDirectory, { index: false, redirect: false }));
    // Explicit client routes preserve the existing JSON 404 for unknown endpoints
    // and missing assets. Express 5 also handles HEAD for these GET routes.
    app.get(['/', '/index.html', '/students', '/students/:id', '/courses', '/courses.html', '/enrollments'], (req, res, next) => {
        res.sendFile(path.join(frontendDirectory, 'index.html'), { maxAge: 0 }, (error) => {
            if (!error) return;
            if (res.headersSent) return next(error);
            if (error.code === 'ENOENT' || error.status === 404) {
                return res.status(503).json({ error: 'Frontend build missing. Run npm run build from the project root, then retry.' });
            }
            next(error);
        });
    });
    app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
    app.use((error, req, res, next) => {
        if (error.code === 11000) return res.status(409).json({ error: 'Student ID, course ID, or enrollment already exists' });
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ error: 'Validation failed', details: error.name === 'ValidationError'
                ? Object.values(error.errors).map((item) => item.message) : [error.message] });
        }
        if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
        if (error.status && error.status >= 400 && error.status < 500) {
            return res.status(error.status).json({ error: error.status === 413 ? 'Request body too large' : error.message });
        }
        if (/Mongo|Mongoose/.test(error.name)) return res.status(503).json({ error: 'Database unavailable; retry later' });
        console.error('Unexpected request failure:', error.name);
        res.status(500).json({ error: 'Internal server error' });
    });
    return app;
}
module.exports = { createApp };
