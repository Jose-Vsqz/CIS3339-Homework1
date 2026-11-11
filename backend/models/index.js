const mongoose = require('mongoose');
const text = (maxlength) => ({ type: String, required: true, trim: true, maxlength });
const options = { versionKey: false, bufferCommands: false };

function createModels(connection) {
    const studentSchema = new mongoose.Schema({
        name: text(200), id: text(100), phone: text(50), zip: text(20)
    }, options);
    studentSchema.index({ id: 1 }, { unique: true });
    const courseSchema = new mongoose.Schema({ id: text(100), name: text(200) }, options);
    courseSchema.index({ id: 1 }, { unique: true });
    const enrollmentSchema = new mongoose.Schema({
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }
    }, options);
    enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
    enrollmentSchema.index({ course: 1 });
    return {
        Student: connection.model('Student', studentSchema),
        Course: connection.model('Course', courseSchema),
        Enrollment: connection.model('Enrollment', enrollmentSchema)
    };
}
module.exports = { createModels };
