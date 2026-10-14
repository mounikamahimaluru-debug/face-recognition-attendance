const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    rollNumber: {
        type: String,
        required: true
    },

    date: {
        type: String,
        required: true
    },

    time: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["Present"],
        default: "Present"
    }
}, {
    timestamps: true
});

// One attendance record per student per day
attendanceSchema.index(
    { student: 1, date: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "Attendance",
    attendanceSchema
);