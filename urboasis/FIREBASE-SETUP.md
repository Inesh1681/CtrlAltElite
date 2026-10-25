# Switching on the community board (about 10 minutes)

The community board stores public issues and votes in Firebase (free Spark plan). Until you finish
these steps, the board shows a clearly labelled preview with example issues and voting switched off.

## 1. Create the project
1. Go to https://console.firebase.google.com and click **Add project**. Name it e.g. `urboasis`.
   Google Analytics isn't needed.
2. **Build → Firestore Database → Create database.** Pick the location closest to India
   (e.g. `asia-south1`, Mumbai) and start in **production mode**.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Choose a support
   email and **Save**.
4. **Authentication → Settings → Authorized domains → Add domain:** `inesh1681.github.io`
   (`localhost` is already there).

## 2. Add the security rules
**Firestore Database → Rules**, replace everything with the contents of
[`firestore.rules`](firestore.rules), then **Publish**.

The rules make the board public to read and allow one vote per Google account. Only the person who
posted an issue can mark it fixed, and nothing can be deleted from the browser.

## 3. Connect the site
1. **Project settings (gear icon) → General → Your apps → Web (`</>`)**, register an app (no
   hosting needed), and copy the `firebaseConfig` object.
2. In `index.html`, find `const FIREBASE=null;` near the top of the script and replace `null` with
   the object, for example:
   ```js
   const FIREBASE={apiKey:'AIza...',authDomain:'urboasis.firebaseapp.com',projectId:'urboasis',appId:'1:...:web:...'};
   ```
   These values identify the project and are safe to publish. The rules above control access.
3. Commit and push. GitHub Pages redeploys in a minute or two.

## 4. Check it
Open the site, go to **Community board**, sign in with Google, and vote on an issue. Then report a
problem with **Post it on the community board** ticked and confirm it appears on the board.

## Testing without Firebase
Add `?mockboard` to the URL (e.g. `http://localhost:5191/?mockboard#board`) to use a local
stand-in. Sign-in is simulated and votes are stored only in that browser. Use it for testing only.

## Things to keep an eye on
- **Moderation:** anyone signed in can post. Check the Firestore console regularly and delete
  abusive or personal posts there. The rules block deleting from the browser.
- **Free-tier limits:** the board reads up to 200 issues per visit, plus one small read per issue to
  check your own votes. That's fine for a pilot. Add pagination before large-scale use.
- **Fairness:** one vote per Google account. People with several accounts can still vote more than
  once, so present vote counts as "residents who voted", not as a verified count.
