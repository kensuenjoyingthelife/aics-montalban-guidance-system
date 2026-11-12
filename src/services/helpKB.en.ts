// English version of the Help Assistant answers (same ids and the same number of steps as helpKB.ts).
// Button names are written as they appear when the app is in English.

export interface HelpTextEn {
  q: string;
  a: string;
  steps?: string[];
  tip?: string;
}

export const HELP_EN: Record<string, HelpTextEn> = {
  // ───────────── GETTING STARTED ─────────────
  'daily-flow': {
    q: 'What do I do every day? (step by step)',
    a: 'This is the simple daily routine:',
    steps: [
      'Open the Dashboard. Check "Needs attention" (overdue cases, sanctions waiting).',
      'Check today’s conferences. Press "Attended" or "Did not attend".',
      'Call or text the parents listed in Follow-ups.',
      'When there is a new incident, press "+ New Case".',
      'Open each open case and follow its "Next step".',
      'Before going home, check Concerns for new reports from students.',
    ],
  },
  login: {
    q: 'How do I sign in?',
    a: 'Signing in has two steps to keep the records safe:',
    steps: [
      'Type the 6-digit app PIN.',
      'Type your staff email, then press Enter.',
      'Open your email. There is a 6-character code (letters and numbers).',
      'Type the code in the app. It works only once and expires after a few minutes.',
    ],
    tip: 'If no code arrives, check your Spam folder and the internet.',
  },
  'pin-forgot': {
    q: 'I forgot the PIN. What do I do?',
    a: 'For safety there is no "forgot PIN" button. Do this:',
    steps: [
      'If it is locked because of wrong PINs, wait first (5 minutes by default) before trying again.',
      'If you really cannot remember it, contact IT or whoever set up the system to reset the PIN.',
      'After signing in, change the PIN right away in Settings › Accounts & security.',
    ],
    tip: 'Never write the PIN on paper stuck to the computer.',
  },
  'pin-change': {
    q: 'How do I change the PIN?',
    a: 'You change the PIN in Settings:',
    steps: [
      'Press Settings on the left and type the current PIN.',
      'Choose "Accounts & security".',
      'Type the old PIN, the new PIN, and the new PIN again.',
      'Press change. Use the new PIN the next time you sign in.',
    ],
  },
  'auto-lock': {
    q: 'Why did the app suddenly lock or sign out?',
    a: 'The app locks itself when nothing is done for a few minutes (15 minutes by default). This protects the records when you leave the computer.',
    steps: ['Sign in again with the PIN and the email code.', 'You can change the number of minutes in Settings › Accounts & security.'],
    tip: 'One minute before it locks, a warning appears at the bottom. Just move the mouse to keep it open.',
  },
  'lock-now': {
    q: 'How do I lock the app when I step away?',
    a: 'Press "Lock Session" at the bottom of the left menu. The PIN and the email code are needed to come back.',
  },
  language: {
    q: 'How do I switch the app to Filipino or English?',
    a: 'At the bottom of the left menu, press the language button (English / Filipino). The words change across the whole app right away.',
  },
  'dark-text': {
    q: 'How do I make the letters bigger or use dark mode?',
    a: 'At the bottom of the left menu there are buttons for Dark/Light mode and for the text size (A, A+, A++). Just press the one you want.',
  },
  'quick-guide': {
    q: 'Is there a guide for new users?',
    a: 'Yes. Press "❓ Quick Guide" at the top. It shows the 6 steps of daily work. Press a step to open that page right away.',
  },
  colors: {
    q: 'What do the colours mean?',
    a: 'The colours mean the same thing everywhere in the app:',
    steps: [
      '🔴 Red: serious or major offense, or waiting 7+ days.',
      '🟡 Yellow: 2nd minor (watch), or waiting 3–6 days.',
      '🟢 Green: done, or the parent attended.',
    ],
    tip: 'Every list has a legend (colour key) under it.',
  },
  numbers: {
    q: 'What are the numbers next to the menu?',
    a: 'The number shows how many are waiting: open cases (Cases), conferences today (Parents), concerns not yet reviewed (Concerns), and students waiting for the counselor (Counselor). Point the mouse at it to see what it counts.',
  },
  undo: {
    q: 'I pressed the wrong button. How do I undo?',
    a: 'After most actions, a message appears at the bottom with an "Undo" button. Press it right away to put things back.',
    tip: 'If Undo is gone, open the record again and correct it. Every change is kept in the Audit Trail.',
  },
  internet: {
    q: 'Does the system work without internet?',
    a: 'No. It needs the internet because the records are in the cloud, so the data is the same on every computer. When the internet drops, "Not saved. Check the internet" appears. Wait for the internet, then try again.',
  },

  // ───────────── CASES ─────────────
  'new-case': {
    q: 'How do I record a new case?',
    a: 'To record a new case:',
    steps: [
      'Press "+ New Case" at the top.',
      'Find and pick the student. The grade, section and parent come from the master list.',
      'Pick the offense. The system counts which offense this is and suggests the sanction from the handbook.',
      'Add the date, place and witnesses (if any).',
      'Press Save. The case appears in the case list.',
    ],
    tip: 'One incident can include several students. Add them one by one.',
  },
  'student-missing': {
    q: 'The student is not in the list. What now?',
    a: 'When picking the student there is "Not in the list? + Add student". Press it, fill in the form and save. The student can be used in the case right away.',
  },
  'case-steps': {
    q: 'What are the 7 steps of a case? (step by step)',
    a: 'Every case goes through 7 steps. Inside the case, the "Next step" box always tells you what to do, with one button for it:',
    steps: [
      'Reported: the case is recorded.',
      'Student Called: press "✓ Student was called".',
      'Explanation: write the student’s explanation, or let the student type it at the Statement Station.',
      'Parent Notified: choose how the parent learned about it (conference, call, SMS, letter, email).',
      'Decision: write the decision and the sanction (suggested from the handbook).',
      'Follow-Up: press "✓ Started" when the sanction has begun.',
      'Closed: press "✓ Close the case" when everything is done.',
    ],
    tip: 'There is an "Undo" after every step.',
  },
  'open-case': {
    q: 'How do I open a case and see all its details?',
    a: 'In the case list, press the case card, or press "⋯" then "Open full case". You will see the 7 steps, the history, the evidence and the forms.',
  },
  'statement-station': {
    q: 'How do I let the student type their own statement?',
    a: 'Use the Statement Station. The student types it, and the screen is locked:',
    steps: [
      'Open the case. It must be at the "Explanation" step.',
      'Press "🖥 Let the student type it".',
      'Give the computer to the student. Only their own name and grade are shown, no other record.',
      'The student answers 4 questions, ticks that the statement is true, then presses "Submit my statement".',
      'Take the computer back and type the staff PIN to unlock it.',
    ],
    tip: 'To stop early, press "Staff: stop without saving" and type the PIN. Nothing is saved.',
  },
  'station-stuck': {
    q: 'How do I leave the Statement Station?',
    a: 'Press "Staff: unlock" (or "Staff: stop without saving") and type the 6-digit app PIN. Esc and closing the window do not work while it is locked, so the student cannot leave it.',
    tip: 'After 5 wrong PINs it locks for 1 minute.',
  },
  'print-form': {
    q: 'How do I print a call slip or another form?',
    a: 'To print a form:',
    steps: [
      'In the case list, press the case’s "⋯", or open the case.',
      'Choose "🖨️ Print a form…".',
      'Choose the form: Call Slip, Parent Conference Form, Behavioral Contract, Kasunduan or Suspension Letter.',
      'Fill in what is needed (e.g. date and time), then press Print.',
    ],
    tip: 'The name, grade, case number and the student’s statement are filled in for you.',
  },
  evidence: {
    q: 'How do I add evidence (photo or PDF)?',
    a: 'Inside the case, in the Evidence part:',
    steps: [
      'Choose a file. JPG, PNG or PDF only, up to 10 MB.',
      'Add a short note (e.g. "Photo at the gate").',
      'Press "Upload". The file appears in the evidence list.',
    ],
    tip: 'Evidence is private. It opens only inside the app.',
  },
  sanction: {
    q: 'How do I know the right sanction?',
    a: 'The system suggests the sanction from the handbook, based on the offense and whether it is the 1st, 2nd or 3rd time. It appears in the "Decision" step. You can change it before saving.',
    tip: 'The list of offenses and sanctions is in Settings › Offenses & rules.',
  },
  'sanction-waiting': {
    q: 'Why is the sanction "waiting"?',
    a: 'By the rules, a sanction cannot start until the parent knows. Once you record the "Parent Notified" step, the sanction starts by itself.',
  },
  escalation: {
    q: 'Why did a minor offense become Serious?',
    a: 'By the handbook, 2 minor offenses in a row count as Serious. The system counts this for you. Before it happens, an early intervention alert appears so the student can be talked to early.',
    tip: 'This number (2) can be changed in Settings › Offenses & rules.',
  },
  'close-case': {
    q: 'How do I close a case?',
    a: 'Inside the case, at the last step, press "✓ Close the case". It asks you to confirm first. You can also use "⋯" › "Mark as done" in the list.',
    tip: 'There is an Undo if you make a mistake.',
  },
  'find-case': {
    q: 'How do I find a student’s cases?',
    a: 'Type the name or student number in the search box at the top (on the Dashboard or Cases). In Cases you can also filter by grade, period and status (overdue or waiting).',
  },
  'edit-case': {
    q: 'How do I correct a mistake in a case?',
    a: 'Open the case and press "Edit". Correct the date, place or details, then save. Every change is kept in the Audit Trail.',
  },
  overdue: {
    q: 'What does an "overdue" case mean?',
    a: 'An overdue case has been open longer than the set number of days (14 by default). It appears in "Needs attention" on the Dashboard. Press it to see the list.',
  },

  // ───────────── PARENTS & CONFERENCES ─────────────
  'call-parent': {
    q: 'How do I summon a parent? (step by step)',
    a: 'To call a parent to a conference:',
    steps: [
      'Go to Parents › "To schedule". Cases without a conference are listed here.',
      'Press "Schedule" on the case. The system suggests a free date and time based on office hours and the counselor’s days.',
      'Pick the date and time, then save.',
      'Send the notice to the parent (SMS and/or email). You can also print a Call Slip for the student.',
      'Call the parent before the day to confirm.',
    ],
    tip: 'The offense is never included in the text or email. Only the date, time and place.',
  },
  'after-text': {
    q: 'What do I do after sending a text?',
    a: 'After sending the notice:',
    steps: [
      'Check Parents › "Messages" to see if it was "Sent" or "Not sent".',
      'If it was not sent, call the parent and log the call.',
      'Call the parent one day before the conference to confirm.',
      'On the day itself, press "Attended" or "Did not attend" on the Dashboard.',
      'When the parent attends, the "Parent Notified" step of the case is done by itself.',
    ],
    tip: 'For now SMS is not set up yet, so SMS shows "Not sent". Use a call or email for now.',
  },
  'send-text': {
    q: 'How do I text or email a parent?',
    a: 'To send a notice:',
    steps: [
      'In the case list, press "⋯" › "Text parent", or "Text" in Follow-ups.',
      'Choose SMS, email, or both.',
      'Read the message. It is ready from the SMS template. You can edit it.',
      'Press send. The result shows in Parents › "Messages".',
    ],
    tip: 'If the message mentions an offense or private words, the system warns you before sending.',
  },
  attendance: {
    q: 'How do I mark whether the parent attended?',
    a: 'On the Dashboard, in today’s conferences:',
    steps: [
      'Press "Attended" when the parent arrives.',
      'Press "Did not attend" when they do not come. Pick a reason (e.g. work).',
      'When the parent does not attend, the system makes a follow-up to call them.',
    ],
    tip: 'There is an Undo if you press the wrong one.',
  },
  'no-show': {
    q: 'The parent did not come. What do I do?',
    a: 'When the parent did not attend:',
    steps: [
      'Press "Did not attend" and pick the reason.',
      'Go to Parents › Follow-ups. The task to call the parent is already there.',
      'Call or text the parent, and log the call.',
      'Schedule a new date.',
    ],
    tip: 'A parent who missed before is marked for "priority follow-up" so they are called earlier. Only staff can see this.',
  },
  'log-call': {
    q: 'How do I log a call to a parent?',
    a: 'On the Dashboard or in Parents › Follow-ups, press "Log Call" next to the parent. Choose the result (e.g. answered, no answer) and add a short note. Save.',
    tip: 'Every call is kept, so you can see how many times the parent was contacted.',
  },
  reschedule: {
    q: 'How do I move a conference to another date?',
    a: 'In Parents › "Conferences", find the conference and press Schedule (or change the date). Pick a new date and time, then save. Send the parent a new notice.',
  },
  'walk-in': {
    q: 'A parent came without a schedule. What now?',
    a: 'Press "Walk-In Parent" at the top of the Dashboard. Pick the student and record the conference. The "Parent Notified" step of the case is done by itself.',
  },
  'smart-schedule': {
    q: 'How does the system choose a date?',
    a: 'The system suggests free times based on the office days and hours, closed days (holidays), and the counselor’s schedule. It never double-books. You can still pick another date.',
    tip: 'Office hours and holidays are in Settings › Office days & hours.',
  },
  reminder: {
    q: 'Is there a reminder for the parent before the conference?',
    a: 'Yes. The system sends an SMS reminder one day before the conference once SMS is set up. For now, call the parent one day before.',
  },
  'sms-not-sent': {
    q: 'Why does the SMS say "Not sent"?',
    a: 'The SMS service (PhilSMS) is not set up in the system yet, so it honestly says "Not sent". Until then, call the parent or use email. Once it is set up, SMS will be sent automatically.',
  },
  'parent-number': {
    q: 'How do I change a parent’s number?',
    a: 'Go to Cases › Students, find the student and edit. Change the parent’s mobile number (09 + 9 digits, 11 in all), then save.',
    tip: 'The form tells you right away if the number format is wrong.',
  },

  // ───────────── STUDENTS & MASTER LIST ─────────────
  'import-masterlist': {
    q: 'How do I upload the student master list?',
    a: 'Do this at the start of each school year:',
    steps: [
      'Go to Cases › Master list.',
      'Choose the Excel (.xlsx) or CSV file of the enrollment list.',
      'The system checks every row. Rows with missing details or a repeated student number are marked.',
      'Fix or remove the rows with problems, then press import.',
    ],
    tip: 'Students already in the system are just updated, never doubled.',
  },
  'add-student': {
    q: 'How do I add or edit a student?',
    a: 'In Cases › Students, press "Add student" for a new one, or press a student to edit. Fill in the form and save. The form tells you right away if something is missing or wrong.',
  },
  'move-up': {
    q: 'How do I move students up to the new school year?',
    a: 'Use "Move up a school year…" in Cases › Students:',
    steps: [
      'Press "Move up a school year…".',
      'Read the summary: how many move up to Grade 12 and how many graduate.',
      'Confirm. Grade 11 moves to Grade 12, and Grade 12 becomes "Not enrolled (Graduated)".',
    ],
    tip: 'There is an Undo if you make a mistake. The cases of graduates are kept.',
  },
  'not-enrolled': {
    q: 'How do I mark a student who is no longer enrolled?',
    a: 'In Cases › Students, open the student and choose "Not enrolled anymore". Pick the reason (graduated, transferred, or stopped). Their records are kept.',
  },
  'student-history': {
    q: 'How do I see all the offenses of one student?',
    a: 'In Cases › Students, press the student. You will see all their cases and the number of offenses. You can also type the name in the search box.',
  },
  'student-fields': {
    q: 'How do I add or change a field in the student form?',
    a: 'In Settings › "Student fields" you can add, remove or rename the fields that "Add student" asks for.',
  },

  // ───────────── CONCERNS ─────────────
  'review-concern': {
    q: 'How do I review a concern sent by a student?',
    a: 'To review a concern:',
    steps: [
      'Go to Concerns. New and urgent ones are at the top.',
      'Open the concern and read the statement.',
      'Press "Approve" if it is true and needs action. This opens a chat with the student.',
      'Press "Reject" if it is not accepted, and write the reason. The student can see the reason.',
    ],
    tip: 'If the concern is serious, record a case for the student involved.',
  },
  'concern-chat': {
    q: 'How do I chat with a student about a concern?',
    a: 'The chat opens only after the concern is approved. In Concerns › Chats, open the chat, type your reply and send. Press "Close chat" when done.',
    tip: 'The chat is not for counseling or emergencies. It is answered during office days and hours only.',
  },
  'urgent-concern': {
    q: 'What do I do with an urgent concern?',
    a: 'Urgent concerns are at the very top of Concerns. Read it right away and act following the school’s procedure. "Urgent" is only a mark: there is no alarm, and only staff see it while signed in.',
  },
  confidential: {
    q: 'What is a "confidential" concern?',
    a: 'In a confidential concern, only the Guidance Office knows who sent it. There are no anonymous concerns: the student must be registered.',
  },
  'fake-account': {
    q: 'How do I block a fake student account?',
    a: 'In Concerns, find the account and deactivate it. It can no longer sign in or send concerns. Accounts that match the master list are marked "in masterlist".',
  },

  // ───────────── COUNSELOR ─────────────
  'counselor-queue': {
    q: 'How do I refer a student to the counselor?',
    a: 'The system puts severe or repeated cases on the counselor’s list by itself. To schedule:',
    steps: [
      'Go to Counselor.',
      'In "Students the counselor should see", press "Schedule with counselor" on the student.',
      'Pick a date on a counselor day, then save.',
      'When done, mark it as "Seen by the counselor".',
    ],
    tip: 'You can also add one by hand with "Add a student for the counselor".',
  },
  'counselor-days': {
    q: 'How do I set the counselor’s days?',
    a: 'In Counselor, press "Set the counselor days", or go to Settings › People’s schedules. Pick the days and save. These days are used when suggesting dates.',
  },
  'counselor-remove': {
    q: 'How do I remove a student from the counselor’s list?',
    a: 'In Counselor, press "Remove" on the student and write why. There is an Undo if you make a mistake.',
  },

  // ───────────── REPORTS & AUDIT ─────────────
  'monthly-report': {
    q: 'How do I make the monthly report?',
    a: 'The system makes the summary for each month by itself:',
    steps: ['Go to Reports.', 'Choose the month in the monthly report.', 'Press "Print" for paper, or CSV to open it in Excel.'],
  },
  graphs: {
    q: 'How do I see if cases are going up or down?',
    a: 'In Reports › Overview there are graphs of cases per month, closed cases, and parent attendance. ▲ means up and ▼ means down compared with the month before.',
  },
  recidivism: {
    q: 'How do I see students who repeat an offense?',
    a: 'In Reports you can see the students who repeated the same offense after a sanction was given.',
  },
  handover: {
    q: 'How do I leave a handover note for other staff?',
    a: 'In Reports › Case summary & handover, find the case and write the note (e.g. "Called the mother, she will come on Friday"). Save. The next staff member can read it and continue the case.',
  },
  audit: {
    q: 'How do I see who changed a record?',
    a: 'Go to Audit Trail. Every change is listed: what changed, the old and new values, who, and when. Use Search. It cannot be edited or deleted.',
  },

  // ───────────── SETTINGS ─────────────
  'settings-open': {
    q: 'How do I open and use Settings? (step by step)',
    a: 'Settings is protected by the PIN so others cannot change it:',
    steps: [
      'Press Settings on the left and type the 6-digit PIN.',
      'Pick a part: Office days & hours, People’s schedules, Offenses & rules, Student fields, SMS templates, Accounts & security, or Backup & retention.',
      'Change what you need and press Save.',
      'Read the "Before → After" check, then press Yes.',
    ],
    tip: 'There is an Undo after saving. Every change is kept in the Audit Trail.',
  },
  'office-hours': {
    q: 'How do I change the office days and hours?',
    a: 'In Settings › "Office days & hours", choose the days, the start and end time, the lunch break, and the length of each slot. Save. The system uses these when suggesting dates.',
  },
  holiday: {
    q: 'How do I add a holiday or a no-class day?',
    a: 'In Settings › "Office days & hours", under Closed days, enter the date and the reason (e.g. "Holiday"), then add it. The system will not suggest conferences on that day.',
  },
  'people-schedule': {
    q: 'How do I add the schedule of the principal or someone else?',
    a: 'In Settings › "People’s schedules", press add, type the name, and pick the days they are available. Save.',
  },
  'offense-list': {
    q: 'How do I add or change an offense in the handbook?',
    a: 'In Settings › "Offenses & rules", press add offense. Enter the name, the level, and the sanction for the 1st, 2nd and 3rd time. Save. A removed offense can no longer be picked, but old cases are kept.',
  },
  'sms-template': {
    q: 'How do I change the message sent to parents?',
    a: 'In Settings › "SMS templates", edit the message. Use {student} for the student’s name and {when} for the date and time. Offenses are not allowed; the system warns you if there is one.',
    tip: '1 SMS is up to 160 letters. The count shows while you type.',
  },
  'add-staff': {
    q: 'How do I add an account for another staff member?',
    a: 'In Settings › "Accounts & security", press add staff. Enter their name and email, then save. They sign in with that email.',
  },
  backup: {
    q: 'How do I back up the data?',
    a: 'In Settings › "Backup & retention", press Backup. A file with all records is downloaded. Keep it somewhere safe (e.g. a locked USB drive).',
    tip: 'Never share the backup file. It contains private student data.',
  },

  // ───────────── PROBLEMS ─────────────
  'not-saved': {
    q: '"Not saved" appeared. What do I do?',
    a: 'Usually the internet is the cause:',
    steps: [
      'Check that the computer has internet.',
      'Press Save again. What you typed is still there.',
      'If it still fails, restart the app and try again.',
      'If it keeps happening, tell IT what message appeared.',
    ],
  },
  'no-code': {
    q: 'No code arrived in my email. What do I do?',
    a: 'Try this:',
    steps: ['Check the Spam or Promotions folder of your email.', 'Check that you typed the right email.', 'Wait 1 minute, then ask for a new code.', 'Check the internet.'],
  },
  slow: {
    q: 'The app is slow. What do I do?',
    a: 'Try this:',
    steps: ['Close other programs you are not using (e.g. games or many browser tabs).', 'Check the internet speed.', 'Restart the app.'],
    tip: 'The system is built to run even on a Core i3 with 4 GB RAM.',
  },
  'print-problem': {
    q: 'Printing does not work. What do I do?',
    a: 'Check that the printer is on and has paper, and that it is the one chosen in the print window. Try "Print a form…" again. If it still fails, restart the printer.',
  },
  'wrong-student': {
    q: 'I recorded the case on the wrong student. What now?',
    a: 'If you just did it, press "Undo". If not, open the case, press "Edit", and correct it. The correction is kept in the Audit Trail.',
  },
  privacy: {
    q: 'Who can see the records?',
    a: 'Only Guidance staff with an account can see the cases. Students, parents, teachers and the principal cannot see any case record. Students see only their own concerns in the portal. The offense is never included in texts or emails to parents.',
  },
  'not-in-system': {
    q: 'The feature I need is not in the system. What do I do?',
    a: 'Some things are left out on purpose, like counseling notes, psychological testing, and access for teachers or parents. For anything else you need, tell IT or whoever set up the system.',
  },
};

export const HELP_CATEGORIES_EN: Record<string, string> = {
  start: '🚀 Getting started',
  cases: '📁 Cases',
  parents: '👪 Parents & conferences',
  students: '🎓 Students & master list',
  concerns: '💬 Student concerns',
  counselor: '🧑‍⚕️ Counselor',
  reports: '📊 Reports & Audit',
  settings: '⚙️ Settings',
  problems: '🛠 Something is wrong',
};

export const GO_LABEL_EN: Record<string, string> = {
  dashboard: 'Open the Dashboard',
  'new-case': 'Start a New Case',
  cases: 'Open Cases',
  students: 'Open Students',
  masterlist: 'Open the Master List import',
  'parents-schedule': 'Open: To schedule',
  'parents-conferences': 'Open Conferences',
  'parents-followups': 'Open Follow-ups',
  'parents-messages': 'Open Messages',
  concerns: 'Open Concerns',
  counselor: 'Open Counselor',
  reports: 'Open Reports',
  audit: 'Open the Audit Trail',
  settings: 'Open Settings',
  guide: 'Open the Quick Guide',
};
