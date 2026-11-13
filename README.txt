BUDGET CYCLE CHALLENGE - LIVE GAME (Windows)
=============================================

ONE-TIME SETUP (about 10 minutes)
1. Install Node.js (LTS): https://nodejs.org  (click the LTS button, install with defaults)
2. Install ngrok: https://ngrok.com/download (Windows) and create a free account.
   - Unzip ngrok.exe into a folder, e.g. C:\ngrok
   - Open Command Prompt there and paste the command from your ngrok dashboard:
       ngrok config add-authtoken YOUR_TOKEN
   - Easiest: copy ngrok.exe into this game folder so start-ngrok.bat can find it.
3. Unzip this game folder somewhere (e.g. C:\budget-game).

RUNNING THE TRAINING
1. Double-click start.bat. A window opens and shows your GM PIN. KEEP IT OPEN.
   (If Windows Firewall asks, click "Allow access".)
2. Double-click start-ngrok.bat. A second window shows a line like:
       Forwarding   https://abcd-12-34.ngrok-free.app -> http://localhost:3000
   KEEP IT OPEN too.
3. On your laptop browser open:
       https://abcd-12-34.ngrok-free.app/gm?pin=YOUR_PIN
   (use YOUR ngrok address and the PIN from the first window).
   If an ngrok warning page appears, click "Visit Site".
4. Tick the question sources you want (Barangay Budgeting Manual 2026, RA 12009 IRR,
   COA Manual, Local Government Code 1991), choose the number of questions and seconds,
   then click "Open registration". Questions are drawn evenly from the selected sources.
   A QR code appears - project it. The QR must show your ngrok address, not
   "localhost". If it does not, edit the address box under the QR.
5. Participants scan the QR and enter name / barangay / position.
6. Click "Close registration & start game". Questions reveal automatically when
   time is up or everyone has answered; you can also click "Reveal answer now"
   and "Next question".
7. The final ranking appears at the end. Click "Download CSV". A copy is also
   saved automatically in this folder as results-XXXX.csv.

NOTES
- Participants do NOT need accounts. They just scan and play.
- Free ngrok gives a NEW address every time, so always open the /gm link from the new address.
- Keep the laptop awake and online. Closing the server window ends the game.
- Test with one phone for 5 minutes before the training.
- Edit questions in questions.json. Each has: src (BBM, IRR, COA or LGC), c (topic), q (question),
  o (4 options; the FIRST option is the correct one - the game shuffles them), e (explanation), s (reference).
- Only the Game Master page needs internet for the QR code image (loaded from a CDN).
