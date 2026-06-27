import csv

emails = []
with open('/home/coding/Desktop/CSVMERGER/merged_batch_3.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('Email'):
            emails.append(row['Email'].strip().lower())

print("Total emails:", len(emails))
print("Unique emails:", len(set(emails)))

from collections import Counter
counts = Counter(emails)
for email, count in counts.items():
    if count > 1:
        print("Duplicate in CSV:", email)
