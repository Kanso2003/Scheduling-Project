import json
import hashlib
import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = "your_secret_key"
CORS(app)

USERS_FILE = "users.json"
SCHEDULE_FILE = "schedule.json"

# Ensure users.json exists
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, "w") as f:
        json.dump({"admin": {"password_hash": hashlib.sha256("admin123".encode()).hexdigest(), "role": "admin"}}, f, indent=4)

# Ensure schedule.json exists
if not os.path.exists(SCHEDULE_FILE):
    with open(SCHEDULE_FILE, "w") as f:
        json.dump([], f, indent=4)

def load_users():
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)

def load_schedule():
    with open(SCHEDULE_FILE, "r") as f:
        return json.load(f)

def save_schedule(schedule):
    with open(SCHEDULE_FILE, "w") as f:
        json.dump(schedule, f, indent=4)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing required fields."}), 400

    users = load_users()

    if username in users:
        return jsonify({"error": "Username already exists."}), 409

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    users[username] = {"password_hash": password_hash, "role": "teacher"}
    save_users(users)

    return jsonify({"message": "Registration successful"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing required fields."}), 400

    users = load_users()

    if username in users and users[username]["password_hash"] == hashlib.sha256(password.encode()).hexdigest():
        session["user"] = username
        session["role"] = users[username]["role"]
        return jsonify({"message": "Login successful", "role": users[username]["role"]}), 200

    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/logout", methods=["GET"])
def logout():
    session.pop("user", None)
    session.pop("role", None)
    return redirect(url_for("home"))

@app.route("/get_pending_schedules", methods=["GET"])
def get_pending_schedules():
    if "user" not in session or session.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    schedules = load_schedule()
    pending_schedules = [entry for entry in schedules if entry["status"] == "pending"]
    return jsonify(pending_schedules), 200

@app.route("/update_schedule_status", methods=["POST"])
def update_schedule_status():
    if "user" not in session or session.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    data = request.json
    professor_name = data.get("professor_name")
    day = data.get("day")
    time_slot = data.get("time_slot")
    status = data.get("status")

    if not professor_name or not day or not time_slot or status not in ["approved", "rejected"]:
        return jsonify({"error": "Missing required fields or invalid status"}), 400

    schedule = load_schedule()
    updated_schedule = []

    for entry in schedule:
        if entry["professor_name"] == professor_name and entry["day"] == day and entry["time_slot"] == time_slot:
            if status == "approved":
                entry["status"] = "approved"
                updated_schedule.append(entry)
        else:
            updated_schedule.append(entry)

    # Remove **all other pending** requests for the same day/time slot once approved
    if status == "approved":
        updated_schedule = [s for s in updated_schedule if not (s["day"] == day and s["time_slot"] == time_slot and s["status"] == "pending")]

    # If **rejected**, remove the entry so it can be resubmitted
    if status == "rejected":
        updated_schedule = [s for s in updated_schedule if not (s["professor_name"] == professor_name and s["day"] == day and s["time_slot"] == time_slot)]

    save_schedule(updated_schedule)
    
    return jsonify({"message": f"Schedule {status} successfully"}), 200

@app.route("/schedule", methods=["POST"])
def schedule():
    if "user" not in session or session.get("role") != "teacher":
        return jsonify({"error": "Unauthorized access"}), 403

    data = request.json
    professor_name = session["user"]
    subject = data.get("subject")
    day = data.get("day")
    time_slot = data.get("time_slot")

    if not subject or not day or not time_slot:
        return jsonify({"error": "Missing required fields."}), 400

    schedule = load_schedule()

    # **Ensure time slot isn't already approved**
    if any(entry["day"] == day and entry["time_slot"] == time_slot and entry["status"] == "approved" for entry in schedule):
        return jsonify({"error": "This time slot is already booked."}), 409

    schedule.append({
        "professor_name": professor_name,
        "subject": subject,
        "day": day,
        "time_slot": time_slot,
        "status": "pending"
    })
    save_schedule(schedule)

    return jsonify({"message": "Schedule request submitted, awaiting admin approval"}), 201

@app.route("/get_approved_schedule", methods=["GET"])
def get_approved_schedule():
    schedules = load_schedule()
    approved_schedules = [entry for entry in schedules if entry["status"] == "approved"]
    return jsonify(approved_schedules), 200

@app.route("/check_time_slot", methods=["POST"])
def check_time_slot():
    """ ✅ Ensure that only **approved** schedules prevent slot reuse """
    data = request.json
    day = data.get("day")
    time_slot = data.get("time_slot")

    schedules = load_schedule()

    # Only block if an **approved** entry exists (not pending/rejected ones)
    exists = any(entry["day"] == day and entry["time_slot"] == time_slot and entry["status"] == "approved" for entry in schedules)

    return jsonify({"exists": exists}), 200

@app.route("/check_login", methods=["GET"])
def check_login():
    if "user" in session:
        return jsonify({"logged_in": True, "username": session["user"], "role": session.get("role")}), 200
    return jsonify({"logged_in": False}), 200

if __name__ == "__main__":
    app.run(debug=True)
