import csv
import re

db_emails = set()
with open('/home/coding/.gemini/antigravity/brain/cbfe0bc3-8ee2-4aa3-aded-0f3dec266957/.system_generated/steps/122/output.txt', 'r') as f:
    text = f.read()
    emails = re.findall(r'"email":"([^"]+)"', text)
    for e in emails:
        db_emails.add(e.lower().strip())

csv_emails = set()
with open('/home/coding/Desktop/CSVMERGER/merged_batch_3.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Email'):
            csv_emails.add(row['Email'].strip().lower())

missing = csv_emails - db_emails
print("Missing emails:", missing)
