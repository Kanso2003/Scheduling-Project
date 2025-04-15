import mysql.connector

# Establish MySQL connection
db = mysql.connector.connect(
    host="localhost",
    user="root",  # Replace with your MySQL username
    port=3306,
    password="cynthia123456",  # Replace with your MySQL password
    database="scheduling_system"  # Replace with your database name
)

# Create a cursor for executing SQL queries
cursor = db.cursor()

# Create Users table if it doesn't exist
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
    )
""")

# Create Schedule table if it doesn't exist
cursor.execute("""
    CREATE TABLE IF NOT EXISTS schedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        professor_name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        day VARCHAR(50) NOT NULL,
        time_slot VARCHAR(50) NOT NULL
    )
""")

db.commit()
