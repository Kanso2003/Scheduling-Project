document.addEventListener("DOMContentLoaded", function () {
    // Check login status and role
    fetch("/check_login")
    .then(response => response.json())
    .then(data => {
        if (data.logged_in) {
            document.getElementById("auth").style.display = "none";
            document.getElementById("logoutButton").style.display = "block";

            if (data.role === "admin") {
                document.getElementById("adminSection").style.display = "block";
                loadPendingSchedules();
                loadApprovedSchedule();  // ✅ Admin now sees approved schedule
            } else {
                document.getElementById("scheduleSection").style.display = "block";
                loadApprovedSchedule();
            }
        }
    });

    // Switch to Register Form
    document.getElementById("showRegister").addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("loginSection").style.display = "none"; // Hide login form
        document.getElementById("registerSection").style.display = "block"; // Show register form
    });

    // Switch Back to Login Form
    document.getElementById("showLogin").addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("registerSection").style.display = "none"; // Hide register form
        document.getElementById("loginSection").style.display = "block"; // Show login form
    });

    // Login Form Submission
    document.getElementById("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();
        fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: document.getElementById("username").value,
                password: document.getElementById("password").value
            })
        }).then(response => response.json()).then(data => {
            if (data.message) {
                document.getElementById("auth").style.display = "none";
                document.getElementById("logoutButton").style.display = "block";

                if (data.role === "admin") {
                    document.getElementById("adminSection").style.display = "block";
                    loadPendingSchedules();
                    loadApprovedSchedule();
                } else {
                    document.getElementById("scheduleSection").style.display = "block";
                    loadApprovedSchedule();
                }
            } else {
                alert(data.error);
            }
        }).catch(error => console.error("Error:", error));
    });

    // Register Form Submission
    document.getElementById("registerForm").addEventListener("submit", function (e) {
        e.preventDefault();
        fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: document.getElementById("reg_username").value,
                password: document.getElementById("reg_password").value
            })
        }).then(response => response.json()).then(data => {
            alert(data.message || data.error);
            if (data.message) {
                document.getElementById("registerSection").style.display = "none";
                document.getElementById("loginSection").style.display = "block";
            }
        }).catch(error => console.error("Error:", error));
    });

    // Submit Schedule Request (Teachers Only)
    document.getElementById("scheduleForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const data = {
            subject: document.getElementById("subject").value,
            day: document.getElementById("day").value,
            time_slot: document.getElementById("time_slot").value
        };

        // Check if this slot is already approved
        fetch("/check_time_slot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.exists) {
                alert("This time slot is already approved. Choose a different time.");
            } else {
                // Proceed with submitting availability
                fetch("/schedule", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message || data.error);
                    if (!data.error) {
                        loadPendingSchedules();  
                        loadApprovedSchedule();
                    }
                })
                .catch(error => console.error("Error:", error));
            }
        });
    });

    // Admin: Load Pending Schedule Requests
    function loadPendingSchedules() {
        fetch("/get_pending_schedules")
            .then(response => response.json())
            .then(data => {
                const tableBody = document.querySelector("#pendingSchedules tbody");
                tableBody.innerHTML = ""; // Clear table

                data.forEach(entry => {
                    const rowId = `row-${entry.professor_name}-${entry.day}-${entry.time_slot}`.replace(/\s+/g, '');
                    tableBody.innerHTML += `
                        <tr id="${rowId}">
                            <td>${entry.professor_name}</td>
                            <td>${entry.subject}</td>
                            <td>${entry.day}</td>
                            <td>${entry.time_slot}</td>
                            <td>
                                <button class="approve-btn" data-id="${rowId}" data-professor="${entry.professor_name}" data-day="${entry.day}" data-time="${entry.time_slot}">Approve</button>
                                <button class="reject-btn" data-id="${rowId}" data-professor="${entry.professor_name}" data-day="${entry.day}" data-time="${entry.time_slot}">Reject</button>
                            </td>
                        </tr>
                    `;
                });

                document.querySelectorAll(".approve-btn").forEach(button => {
                    button.addEventListener("click", function () {
                        updateScheduleStatus(this.dataset.professor, this.dataset.day, this.dataset.time, "approved", this.dataset.id);
                    });
                });

                document.querySelectorAll(".reject-btn").forEach(button => {
                    button.addEventListener("click", function () {
                        updateScheduleStatus(this.dataset.professor, this.dataset.day, this.dataset.time, "rejected", this.dataset.id);
                    });
                });
            })
            .catch(error => console.error("Error loading pending schedules:", error));
    }

    // Update Schedule Status (Approve/Reject)
    function updateScheduleStatus(professor_name, day, time_slot, status, rowId) {
        fetch("/update_schedule_status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ professor_name, day, time_slot, status })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || data.error);
            document.getElementById(rowId)?.remove();
            loadApprovedSchedule();
        })
        .catch(error => console.error("Error updating schedule status:", error));
    }

    // Load Approved Schedule (For both Admin and Teachers)
    function loadApprovedSchedule() {
        fetch("/get_approved_schedule")
            .then(response => response.json())
            .then(schedule => {
                // Load for Teachers
                const teacherTableBody = document.querySelector("#approvedSchedule tbody");
                if (teacherTableBody) {
                    teacherTableBody.innerHTML = ""; // Clear table
                    schedule.forEach(entry => {
                        teacherTableBody.innerHTML += `
                            <tr>
                                <td>${entry.professor_name}</td>
                                <td>${entry.subject}</td>
                                <td>${entry.day}</td>
                                <td>${entry.time_slot}</td>
                            </tr>
                        `;
                    });
                }
    
                // Load for Admins
                const adminTableBody = document.querySelector("#adminApprovedSchedule tbody");
                if (adminTableBody) {
                    adminTableBody.innerHTML = ""; // Clear table
                    schedule.forEach(entry => {
                        adminTableBody.innerHTML += `
                            <tr>
                                <td>${entry.professor_name}</td>
                                <td>${entry.subject}</td>
                                <td>${entry.day}</td>
                                <td>${entry.time_slot}</td>
                            </tr>
                        `;
                    });
                }
            })
            .catch(error => console.error("Error loading approved schedule:", error));
    }    
    
    // Logout Function
    function logout() {
        fetch("/logout")
            .then(() => {
                window.location.href = "/"; // Redirect to login page
            })
            .catch(error => console.error("Error logging out:", error));
    }

    document.getElementById("logoutButton").addEventListener("click", logout);

    fetch("/check_login")
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                document.getElementById("logoutButton").style.display = "block";
            }
        });
});
