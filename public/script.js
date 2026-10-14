// ==================================================
// FACE RECOGNITION ATTENDANCE SYSTEM
// COMPLETE FRONTEND JAVASCRIPT
// ==================================================

document.addEventListener("DOMContentLoaded", function () {

    // --------------------------------------------------
    // 1. HTML ELEMENTS
    // --------------------------------------------------

    const studentForm = document.getElementById("studentForm");
    const studentMessage = document.getElementById("studentMessage");
    const studentsTable = document.getElementById("studentsTable");

    const totalStudents = document.getElementById("totalStudents");
    const totalAttendance = document.getElementById("totalAttendance");

    const faceStudentSelect = document.getElementById("faceStudent");
    const video = document.getElementById("video");
    const cameraMessage = document.getElementById("cameraMessage");

    const startCameraButton = document.getElementById("startCamera");
    const stopCameraButton = document.getElementById("stopCamera");
    const registerFaceButton = document.getElementById("registerFace");
    const recognizeFaceButton = document.getElementById("recognizeFace");

    const attendanceDate = document.getElementById("attendanceDate");
    const loadAttendanceButton = document.getElementById("loadAttendance");
    const downloadCSVButton = document.getElementById("downloadCSV");
    const attendanceTable = document.getElementById("attendanceTable");

    // --------------------------------------------------
    // 2. VARIABLES
    // --------------------------------------------------

    let cameraStream = null;
    let faceModelsLoaded = false;
    let modelLoadingPromise = null;
    let studentsCache = [];

    // --------------------------------------------------
    // 3. DEFAULT ATTENDANCE DATE
    // --------------------------------------------------

    if (attendanceDate) {
        const today = new Date();

        attendanceDate.value =
            today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, "0") + "-" +
            String(today.getDate()).padStart(2, "0");
    }

    // --------------------------------------------------
    // 4. API REQUEST
    // --------------------------------------------------

    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            ...options,

            headers: {
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),

                ...(options.headers || {})
            }
        });

        const text = await response.text();

        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(
                    "Server response invalid ga undi. server.js check cheyyi."
                );
            }
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Request failed: " + response.status
            );
        }

        return data;
    }

    // --------------------------------------------------
    // 5. MESSAGE DISPLAY
    // --------------------------------------------------

    function showMessage(element, message, isError = false) {

        if (!element) return;

        element.textContent = message;
        element.style.color = isError ? "red" : "green";
    }

    // --------------------------------------------------
    // 6. NAVIGATION
    // --------------------------------------------------

    window.showSection = async function (id) {

        document.querySelectorAll("main .section").forEach(
            function (section) {
                section.classList.add("hidden");
            }
        );

        const selectedSection = document.getElementById(id);

        if (!selectedSection) {
            console.error("Section not found:", id);
            return;
        }

        selectedSection.classList.remove("hidden");

        if (id === "students") {
            await loadStudents();
        }

        if (id === "attendance") {
            await loadAttendance();
        }

        if (id === "dashboard") {
            await loadDashboard();
        }
    };

    // --------------------------------------------------
    // 7. DASHBOARD
    // --------------------------------------------------

    async function loadDashboard() {

        try {
            const students = await apiRequest("/api/students");
            const attendance = await apiRequest("/api/attendance");

            if (totalStudents) {
                totalStudents.textContent = students.length;
            }

            if (totalAttendance) {
                totalAttendance.textContent = attendance.length;
            }

        } catch (error) {
            console.error("Dashboard Error:", error);
        }
    }

    window.loadDashboard = loadDashboard;

    // --------------------------------------------------
    // 8. LOAD STUDENTS
    // --------------------------------------------------

    async function loadStudents() {

        try {
            const students = await apiRequest("/api/students");

            studentsCache = students;

            if (studentsTable) {
                studentsTable.replaceChildren();
            }

            if (faceStudentSelect) {

                faceStudentSelect.replaceChildren();

                const defaultOption = document.createElement("option");

                defaultOption.value = "";
                defaultOption.textContent = "Select Student";

                faceStudentSelect.appendChild(defaultOption);
            }

            students.forEach(function (student) {

                // Student table

                if (studentsTable) {

                    const row = document.createElement("tr");

                    [
                        student.name,
                        student.rollNumber,
                        student.department,
                        student.year,
                        student.section
                    ].forEach(function (value) {

                        const cell = document.createElement("td");

                        cell.textContent = value || "";

                        row.appendChild(cell);
                    });

                    const actionCell = document.createElement("td");
                    const deleteButton = document.createElement("button");

                    deleteButton.type = "button";
                    deleteButton.textContent = "Delete";

                    deleteButton.addEventListener(
                        "click",
                        async function () {

                            if (!confirm(
                                "Delete student " + student.name + "?"
                            )) {
                                return;
                            }

                            try {

                                await apiRequest(
                                    "/api/students/" +
                                    encodeURIComponent(student._id),
                                    {
                                        method: "DELETE"
                                    }
                                );

                                alert("Student deleted successfully.");

                                await loadStudents();
                                await loadDashboard();

                            } catch (error) {

                                alert("Delete Error: " + error.message);
                            }
                        }
                    );

                    actionCell.appendChild(deleteButton);
                    row.appendChild(actionCell);

                    studentsTable.appendChild(row);
                }

                // Face registration dropdown

                if (faceStudentSelect) {

                    const option = document.createElement("option");

                    option.value = student._id;

                    option.textContent =
                        student.name + " (" + student.rollNumber + ")";

                    faceStudentSelect.appendChild(option);
                }
            });

            if (totalStudents) {
                totalStudents.textContent = students.length;
            }

        } catch (error) {

            console.error("Load Students Error:", error);

            showMessage(
                studentMessage,
                "Unable to load students: " + error.message,
                true
            );
        }
    }

    window.loadStudents = loadStudents;

    // --------------------------------------------------
    // 9. REGISTER STUDENT DETAILS
    // --------------------------------------------------

    if (studentForm) {

        studentForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const nameElement = document.getElementById("name");
                const rollElement = document.getElementById("rollNumber");
                const departmentElement = document.getElementById("department");
                const yearElement = document.getElementById("year");
                const sectionElement = document.getElementById("section");

                if (
                    !nameElement ||
                    !rollElement ||
                    !departmentElement ||
                    !yearElement ||
                    !sectionElement
                ) {
                    showMessage(
                        studentMessage,
                        "Student form HTML IDs check cheyyi.",
                        true
                    );
                    return;
                }

                const student = {

                    name: nameElement.value.trim(),

                    rollNumber: rollElement.value.trim(),

                    department: departmentElement.value,

                    year: yearElement.value,

                    section: sectionElement.value
                };

                if (
                    !student.name ||
                    !student.rollNumber ||
                    !student.department ||
                    !student.year ||
                    !student.section
                ) {

                    showMessage(
                        studentMessage,
                        "Please fill in all student details.",
                        true
                    );

                    return;
                }

                try {

                    showMessage(
                        studentMessage,
                        "Saving student..."
                    );

                    await apiRequest("/api/students", {

                        method: "POST",

                        body: JSON.stringify(student)
                    });

                    showMessage(
                        studentMessage,
                        "Student registered successfully!"
                    );

                    studentForm.reset();

                    await loadStudents();
                    await loadDashboard();

                } catch (error) {

                    console.error(
                        "Student Registration Error:",
                        error
                    );

                    showMessage(
                        studentMessage,
                        "Registration failed: " + error.message,
                        true
                    );
                }
            }
        );
    }

    // --------------------------------------------------
    // 10. LOAD FACE RECOGNITION MODELS
    // --------------------------------------------------

    async function loadFaceModels() {

        if (faceModelsLoaded) {
            return;
        }

        if (modelLoadingPromise) {
            return modelLoadingPromise;
        }

        modelLoadingPromise = (async function () {

            try {

                if (typeof faceapi === "undefined") {

                    throw new Error(
                        "face-api.js library load avvaledu."
                    );
                }

                const modelPath = "/models";

                // Tiny Face Detector

                showMessage(
                    cameraMessage,
                    "Loading Tiny Face Detector..."
                );

                console.log("Loading Tiny Face Detector...");

                await faceapi.nets.tinyFaceDetector.loadFromUri(
                    modelPath
                );

                console.log(
                    "Tiny Face Detector loaded successfully."
                );

                // Face Landmark

                showMessage(
                    cameraMessage,
                    "Loading Face Landmark Model..."
                );

                console.log("Loading Face Landmark Model...");

                await faceapi.nets.faceLandmark68Net.loadFromUri(
                    modelPath
                );

                console.log(
                    "Face Landmark Model loaded successfully."
                );

                // Face Recognition

                showMessage(
                    cameraMessage,
                    "Loading Face Recognition Model..."
                );

                console.log("Loading Face Recognition Model...");

                await faceapi.nets.faceRecognitionNet.loadFromUri(
                    modelPath
                );

                console.log(
                    "Face Recognition Model loaded successfully."
                );

                faceModelsLoaded = true;

                showMessage(
                    cameraMessage,
                    "All face models loaded successfully!"
                );

            } catch (error) {

                faceModelsLoaded = false;

                console.error(
                    "Face Model Loading Error:",
                    error
                );

                showMessage(
                    cameraMessage,
                    "Face model error: " + error.message,
                    true
                );

                throw error;

            } finally {

                modelLoadingPromise = null;
            }

        })();

        return modelLoadingPromise;
    }

    window.loadFaceModels = loadFaceModels;

    // --------------------------------------------------
    // 11. START CAMERA
    // --------------------------------------------------

    async function startCamera() {

        try {

            if (!navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia) {

                throw new Error(
                    "Camera kosam HTTPS leda localhost use cheyyi."
                );
            }

            if (!video) {

                throw new Error(
                    'HTML lo id="video" unna video element ledu.'
                );
            }

            if (cameraStream) {

                showMessage(
                    cameraMessage,
                    "Camera is already running."
                );

                return;
            }

            showMessage(
                cameraMessage,
                "Loading face models..."
            );

            // Models must load before face recognition

            await loadFaceModels();

            showMessage(
                cameraMessage,
                "Requesting camera permission..."
            );

            cameraStream = await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "user"
                },

                audio: false
            });

            video.srcObject = cameraStream;

            await new Promise(function (resolve, reject) {

                if (video.readyState >= 2) {
                    resolve();
                    return;
                }

                video.onloadedmetadata = function () {
                    resolve();
                };

                video.onerror = function () {
                    reject(
                        new Error("Camera video load avvaledu.")
                    );
                };
            });

            await video.play();

            showMessage(
                cameraMessage,
                "Camera started! Look at the camera."
            );

            console.log("Camera started successfully.");

        } catch (error) {

            stopCamera();

            console.error("Camera Error:", error);

            showMessage(
                cameraMessage,
                "Camera Error: " + error.message,
                true
            );

            alert(
                "Camera could not start.\n\n" +
                error.message
            );
        }
    }

    // --------------------------------------------------
    // 12. STOP CAMERA
    // --------------------------------------------------

    function stopCamera() {

        if (cameraStream) {

            cameraStream.getTracks().forEach(function (track) {
                track.stop();
            });
        }

        cameraStream = null;

        if (video) {

            video.pause();

            video.srcObject = null;
        }

        showMessage(
            cameraMessage,
            "Camera stopped."
        );
    }

    window.startCamera = startCamera;
    window.stopCamera = stopCamera;

    if (startCameraButton) {

        startCameraButton.addEventListener(
            "click",
            startCamera
        );
    }

    if (stopCameraButton) {

        stopCameraButton.addEventListener(
            "click",
            stopCamera
        );
    }

    // Stop camera when page is hidden

    document.addEventListener(
        "visibilitychange",
        function () {

            if (document.hidden) {
                stopCamera();
            }
        }
    );

    // --------------------------------------------------
    // 13. GET FACE DESCRIPTOR
    // --------------------------------------------------

    async function getFaceDescriptor() {

        await loadFaceModels();

        if (!cameraStream || !video || !video.srcObject) {

            throw new Error(
                "First Start Camera click cheyyi."
            );
        }

        if (video.readyState < 2) {

            throw new Error(
                "Camera video ready ga ledu."
            );
        }

        const result = await faceapi
            .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!result) {

            throw new Error(
                "Face detect avvaledu. Camera vaipu choodu."
            );
        }

        return Array.from(result.descriptor);
    }

    // --------------------------------------------------
    // 14. REGISTER STUDENT FACE
    // --------------------------------------------------

    if (registerFaceButton) {

        registerFaceButton.addEventListener(
            "click",
            async function () {

                try {

                    const studentId = faceStudentSelect
                        ? faceStudentSelect.value
                        : "";

                    if (!studentId) {

                        throw new Error(
                            "First registered student ni select cheyyi."
                        );
                    }

                    if (!cameraStream) {

                        throw new Error(
                            "First Start Camera click cheyyi."
                        );
                    }

                    showMessage(
                        cameraMessage,
                        "Detecting face..."
                    );

                    const descriptor = await getFaceDescriptor();

                    const result = await apiRequest(

                        "/api/students/" +
                        encodeURIComponent(studentId) +
                        "/face",

                        {
                            method: "PUT",

                            body: JSON.stringify({

                                faceDescriptor: descriptor
                            })
                        }
                    );

                    showMessage(
                        cameraMessage,
                        result.message ||
                        "Face registered successfully!"
                    );

                    alert(
                        result.message ||
                        "Face registration successful!"
                    );

                } catch (error) {

                    console.error(
                        "Face Registration Error:",
                        error
                    );

                    showMessage(
                        cameraMessage,
                        "Face registration failed: " +
                        error.message,
                        true
                    );

                    alert(
                        "Face registration failed: " +
                        error.message
                    );
                }
            }
        );
    }

    // --------------------------------------------------
    // 15. RECOGNIZE FACE AND MARK ATTENDANCE
    // --------------------------------------------------

    if (recognizeFaceButton) {

        recognizeFaceButton.addEventListener(
            "click",
            async function () {

                try {

                    if (!cameraStream) {

                        throw new Error(
                            "First Start Camera click cheyyi."
                        );
                    }

                    showMessage(
                        cameraMessage,
                        "Recognizing face..."
                    );

                    const descriptor = await getFaceDescriptor();

                    const students = await apiRequest(
                        "/api/students/faces"
                    );

                    let matchedStudent = null;

                    let bestDistance = 0.50;

                    for (const student of students) {

                        if (
                            !Array.isArray(student.faceDescriptor) ||
                            student.faceDescriptor.length !== 128
                        ) {
                            continue;
                        }

                        const distance = faceapi.euclideanDistance(

                            new Float32Array(descriptor),

                            new Float32Array(
                                student.faceDescriptor
                            )
                        );

                        if (distance < bestDistance) {

                            bestDistance = distance;

                            matchedStudent = student;
                        }
                    }

                    if (!matchedStudent) {

                        throw new Error(
                            "Face match avvaledu. First face register cheyyi."
                        );
                    }

                    showMessage(
                        cameraMessage,
                        "Matched: " +
                        matchedStudent.name +
                        ". Marking attendance..."
                    );

                    const result = await apiRequest(

                        "/api/attendance",

                        {
                            method: "POST",

                            body: JSON.stringify({

                                studentId: matchedStudent._id
                            })
                        }
                    );

                    showMessage(
                        cameraMessage,
                        result.message ||
                        "Attendance marked for " +
                        matchedStudent.name
                    );

                    alert(
                        result.message ||
                        "Attendance marked successfully for " +
                        matchedStudent.name
                    );

                    await loadDashboard();
                    await loadAttendance();

                } catch (error) {

                    console.error(
                        "Face Recognition Error:",
                        error
                    );

                    showMessage(
                        cameraMessage,
                        "Face recognition failed: " +
                        error.message,
                        true
                    );

                    alert(
                        "Face recognition failed: " +
                        error.message
                    );
                }
            }
        );
    }

    // --------------------------------------------------
    // 16. LOAD ATTENDANCE
    // --------------------------------------------------

    async function loadAttendance() {

        try {

            let url = "/api/attendance";

            if (attendanceDate && attendanceDate.value) {

                url += "?date=" +
                    encodeURIComponent(attendanceDate.value);
            }

            const attendance = await apiRequest(url);

            if (!attendanceTable) {
                return;
            }

            attendanceTable.replaceChildren();

            attendance.forEach(function (record) {

                const row = document.createElement("tr");

                const student = record.studentId || record.student || {};

                const values = [

                    student.name || record.name || "",

                    student.rollNumber || record.rollNumber || "",

                    record.date
                        ? new Date(record.date).toLocaleDateString()
                        : "",

                    record.time
                        ? record.time
                        : record.createdAt
                            ? new Date(record.createdAt).toLocaleTimeString()
                            : "",

                    record.status || "Present"
                ];

                values.forEach(function (value) {

                    const cell = document.createElement("td");

                    cell.textContent = value;

                    row.appendChild(cell);
                });

                attendanceTable.appendChild(row);
            });

        } catch (error) {

            console.error("Load Attendance Error:", error);

            showMessage(
                cameraMessage,
                "Attendance load failed: " + error.message,
                true
            );
        }
    }

    window.loadAttendance = loadAttendance;

    if (loadAttendanceButton) {

        loadAttendanceButton.addEventListener(
            "click",
            loadAttendance
        );
    }

    // --------------------------------------------------
    // 17. DOWNLOAD ATTENDANCE CSV
    // --------------------------------------------------

    if (downloadCSVButton) {

        downloadCSVButton.addEventListener(
            "click",
            async function () {

                try {

                    let url = "/api/attendance";

                    if (attendanceDate && attendanceDate.value) {

                        url += "?date=" +
                            encodeURIComponent(attendanceDate.value);
                    }

                    const attendance = await apiRequest(url);

                    const rows = [

                        [
                            "Student Name",
                            "Roll Number",
                            "Date",
                            "Time",
                            "Status"
                        ]
                    ];

                    attendance.forEach(function (record) {

                        const student =
                            record.studentId ||
                            record.student ||
                            {};

                        rows.push([

                            student.name || record.name || "",

                            student.rollNumber ||
                            record.rollNumber ||
                            "",

                            record.date
                                ? new Date(record.date).toLocaleDateString()
                                : "",

                            record.time ||
                            (record.createdAt
                                ? new Date(
                                    record.createdAt
                                ).toLocaleTimeString()
                                : ""),

                            record.status || "Present"
                        ]);
                    });

                    const csvContent = rows.map(function (row) {

                        return row.map(function (value) {

                            return '"' +
                                String(value).replace(/"/g, '""') +
                                '"';

                        }).join(",");

                    }).join("\r\n");

                    const blob = new Blob(
                        ["\uFEFF" + csvContent],
                        {
                            type: "text/csv;charset=utf-8;"
                        }
                    );

                    const downloadUrl =
                        URL.createObjectURL(blob);

                    const link = document.createElement("a");

                    link.href = downloadUrl;

                    link.download = "attendance.csv";

                    document.body.appendChild(link);

                    link.click();

                    link.remove();

                    URL.revokeObjectURL(downloadUrl);

                } catch (error) {

                    console.error("CSV Download Error:", error);

                    alert(
                        "CSV download failed: " + error.message
                    );
                }
            }
        );
    }

    // --------------------------------------------------
    // 18. INITIAL PAGE LOAD
    // --------------------------------------------------

    loadStudents();
    loadDashboard();

    console.log(
        "Face Recognition Attendance System initialized."
    );

});