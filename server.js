const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

const Student = require("./models/Student");
const Attendance = require("./models/Attendance");

dotenv.config();

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================================
// 1. REGISTER STUDENT
// =====================================

app.post("/api/students", async (req, res) => {
    try {
        const { name, rollNumber, department, year, section } = req.body;

        if (!name || !rollNumber || !department || !year || !section) {
            return res.status(400).json({
                message: "Please fill all student details"
            });
        }

        const student = await Student.create({
            name: name.trim(),
            rollNumber: rollNumber.trim(),
            department,
            year,
            section
        });

        res.status(201).json({
            message: "Student registered successfully",
            student
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This roll number already exists"
            });
        }

        console.error("Student registration error:", error);

        res.status(500).json({
            message: "Unable to register student"
        });
    }
});

// =====================================
// 2. GET ALL STUDENTS
// =====================================

app.get("/api/students", async (req, res) => {
    try {
        const students = await Student.find()
            .select("-faceDescriptor")
            .sort({ name: 1 });

        res.json(students);

    } catch (error) {
        console.error("Get students error:", error);

        res.status(500).json({
            message: "Unable to get students"
        });
    }
});

// =====================================
// 3. DELETE STUDENT
// =====================================

app.delete("/api/students/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const student = await Student.findByIdAndDelete(req.params.id);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        await Attendance.deleteMany({
            student: student._id
        });

        res.json({
            message: "Student deleted successfully"
        });

    } catch (error) {
        console.error("Delete student error:", error);

        res.status(500).json({
            message: "Unable to delete student"
        });
    }
});

// =====================================
// 4. REGISTER STUDENT FACE
// =====================================

app.put("/api/students/:id/face", async (req, res) => {
    try {
        const { faceDescriptor } = req.body;

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        if (
            !Array.isArray(faceDescriptor) ||
            faceDescriptor.length !== 128 ||
            !faceDescriptor.every(
                value => typeof value === "number" && Number.isFinite(value)
            )
        ) {
            return res.status(400).json({
                message: "Valid 128-number face descriptor required"
            });
        }

        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { $set: { faceDescriptor } },
            {
                new: true,
                runValidators: true
            }
        );

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json({
            message: "Face registered successfully"
        });

    } catch (error) {
        console.error("Face registration error:", error);

        res.status(500).json({
            message: "Unable to register face"
        });
    }
});

// =====================================
// 5. GET REGISTERED FACES
// =====================================

// Face descriptors are sensitive biometric data.
// Protect this endpoint with authentication before public deployment.
app.get("/api/students/faces", async (req, res) => {
    try {
        const students = await Student.find({
            faceDescriptor: {
                $exists: true,
                $type: "array"
            }
        }).select("name rollNumber faceDescriptor");

        const validStudents = students.filter(student =>
            Array.isArray(student.faceDescriptor) &&
            student.faceDescriptor.length === 128 &&
            student.faceDescriptor.every(
                value => Number.isFinite(value)
            )
        );

        res.json(validStudents);

    } catch (error) {
        console.error("Get registered faces error:", error);

        res.status(500).json({
            message: "Unable to load registered faces"
        });
    }
});

// =====================================
// 6. MARK ATTENDANCE USING STUDENT ID
// =====================================

app.post("/api/attendance", async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId || !mongoose.isValidObjectId(studentId)) {
            return res.status(400).json({
                message: "Valid student ID required"
            });
        }

        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        // Indian date and time
        const now = new Date();

        const date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(now);

        const time = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }).format(now);

        const attendance = await Attendance.create({
            student: student._id,
            rollNumber: student.rollNumber,
            date,
            time,
            status: "Present"
        });

        res.status(201).json({
            message: "Attendance marked successfully",
            student: student.name,
            rollNumber: student.rollNumber,
            attendance
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Attendance already marked today"
            });
        }

        console.error("Mark attendance error:", error);

        res.status(500).json({
            message: "Unable to mark attendance"
        });
    }
});

// =====================================
// 7. GET ATTENDANCE REPORT
// =====================================

app.get("/api/attendance", async (req, res) => {
    try {
        const records = await Attendance.find()
            .populate("student", "name department year section")
            .sort({ date: -1, time: -1 });

        res.json(records);

    } catch (error) {
        console.error("Attendance report error:", error);

        res.status(500).json({
            message: "Unable to get attendance report"
        });
    }
});

// =====================================
// 8. START SERVER AFTER DATABASE CONNECTS
// =====================================

const PORT = process.env.PORT || 3000;

if (!process.env.MONGO_URL) {
    console.error(
        "MONGO_URL missing. Please check your .env file."
    );
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("MongoDB Connected Successfully");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    });