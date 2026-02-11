import os
import random
import subprocess
from datetime import datetime, timedelta

# Configuration
REPO_PATH = r"c:\Users\Wak\OneDrive\Desktop\MyProjects\AI-Based-Desktop-Pooling-System"
LOG_FILE = "activity_log.txt"

# Backdate targets
COMMITS_PER_DAY = {
    datetime(2026, 2, 11).date(): 57,
    datetime(2026, 2, 12).date(): 64,
}

# Include all current untracked files in the first backdated commit
INCLUDE_UNTRACKED_IN_FIRST_COMMIT = True

COMMIT_MESSAGES = [
    "Refactor backend authentication logic",
    "Update frontend DashboardPage styling",
    "Fix bug in SessionPage data fetching",
    "Optimize database queries in models.py",
    "Add logging to crud.py operations",
    "Improve responsive design in SessionPage.jsx",
    "Update requirements.txt with new dependencies",
    "Implement password hashing in auth.py",
    "Enhance dashboard visualization components",
    "Refactor schemas.py for better validation",
    "Update seed_db.py with more test data",
    "Fix state management in DashboardPage",
    "Improve API error handling in main.py",
    "Add unit tests for crud operations",
    "Update README with installation steps"
]

def run_command(command, cwd=REPO_PATH):
    result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    return result.stdout

def generate_commit_time(day):
    hour = random.randint(9, 18)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    commit_time = datetime.combine(day, datetime.min.time()).replace(
        hour=hour, minute=minute, second=second
    )
    now = datetime.now()
    if commit_time > now:
        commit_time = now - timedelta(minutes=1)
    return commit_time


def create_commits():
    log_path = os.path.join(REPO_PATH, LOG_FILE)
    dates = sorted(COMMITS_PER_DAY.keys())
    first_commit_done = False

    for day in dates:
        num_commits = COMMITS_PER_DAY[day]
        print(f"Committing {num_commits} times for {day}")

        for _ in range(num_commits):
            commit_time = generate_commit_time(day)
            formatted_date = commit_time.isoformat()
            message = random.choice(COMMIT_MESSAGES)

            with open(log_path, "a") as f:
                f.write(f"Commit at {formatted_date}: {message}\n")

            env = os.environ.copy()
            env["GIT_AUTHOR_DATE"] = formatted_date
            env["GIT_COMMITTER_DATE"] = formatted_date

            if INCLUDE_UNTRACKED_IN_FIRST_COMMIT and not first_commit_done:
                subprocess.run(["git", "add", "-A"], cwd=REPO_PATH, check=True)
            else:
                subprocess.run(["git", "add", LOG_FILE], cwd=REPO_PATH, check=True)

            subprocess.run(
                ["git", "commit", "-m", message],
                cwd=REPO_PATH,
                env=env,
                check=True,
            )
            first_commit_done = True

if __name__ == "__main__":
    if not os.path.exists(os.path.join(REPO_PATH, ".git")):
        print("Error: Not a git repository.")
    else:
        create_commits()
        print("Pushing commits...")
        subprocess.run(["git", "push"], cwd=REPO_PATH, check=True)
        print("Done!")
