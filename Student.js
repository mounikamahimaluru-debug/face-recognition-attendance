const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    rollNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    department: {
        type: String,
        required: true
    },

    year: {
        type: String,
        required: true
    },

    section: {
        type: String,
        required: true
    },

    faceDescriptor: {
        type: [Number],
        default: undefined,
        validate: {
            validator: function (value) {
                return value == null ||
                    value.length === 128;
            },
            message: "Face descriptor must contain 128 numbers"
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", studentSchema);