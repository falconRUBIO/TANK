# Tako Tank for iPhone (TestFlight)

The iPhone app is the same game as the website, carried inside a thin iPhone app (Capacitor). It talks to the same server, so tanks, friends,
the journal and Daily Discovery are shared between the app and the website. GitHub builds it on a Mac and uploads it to TestFlight; nothing
needs to be built on your own computer.

## One-time setup

**1. Make the app in App Store Connect** (appstoreconnect.apple.com → Apps → + → New App)
- Platform: iOS. Name: Tako Tank (or any free name). Language: English.
- Bundle ID: register `com.falconrubio.takotank` first if it is not in the list (developer.apple.com → Certificates, IDs & Profiles →
  Identifiers → +, App IDs, App). A different ID is fine: put it in the `IOS_BUNDLE_ID` variable below.
- SKU: anything, e.g. `takotank`.

**2. Make an App Store Connect API key** (App Store Connect → Users and Access → Integrations → App Store Connect API → +)
- Name: GitHub. Access: **Admin** (the build needs to make its own signing certificate and profile).
- Download the `.p8` file (Apple lets you download it only once). Note the **Key ID** and, at the top of the page, the **Issuer ID**.

**3. Find your Team ID**: developer.apple.com → Account → Membership details → Team ID (10 characters).

**4. Put them in GitHub** (github.com/falconRUBIO/TANK → Settings → Secrets and variables → Actions)
- Variables tab → New repository variable:
  - `TANK_SERVER_URL`: the server's address, the one the website is on, starting with https:// (for example `https://our-tank.onrender.com`).
  - `IOS_BUNDLE_ID`: only if you used a bundle ID other than `com.falconrubio.takotank`.
- Secrets tab → New repository secret:
  - `APPLE_TEAM_ID`: the Team ID.
  - `ASC_KEY_ID`: the Key ID.
  - `ASC_ISSUER_ID`: the Issuer ID.
  - `ASC_KEY_P8`: open the `.p8` file in a text editor and paste all of it, including the BEGIN and END lines.

Never paste the key into a chat or a file in the repository; only into the GitHub secret.

## Making a build

GitHub → Actions → **iPhone app to TestFlight** → Run workflow. It takes about 10 to 20 minutes. When it finishes, the build appears in App
Store Connect → your app → TestFlight once Apple has processed it (usually 5 to 30 minutes more).

- **You and your team (internal testers)**: TestFlight → Internal Testing → add yourself. Install the TestFlight app on the iPhone and accept.
  No review needed.
- **Friends (external testers)**: TestFlight → External Testing → a group → add their emails or make a public link. The first build for
  external testers goes through Apple's beta review (usually a day).

## Good to know

- **Getting into an existing tank from the app**: the app keeps its own sign-in, separate from Safari's. On the first screen choose
  "I have a recovery key" and type your four words, and you are back in your tank as yourself (not as a new caretaker taking a seat).
- **Notifications**: the website's notifications use web push, which works only for the website added to the home screen. The app does not
  get them yet; that needs Apple push notifications in the app and the server (a later step).
- **The server still has to be running.** The app carries the game's files, so opening it costs the server almost nothing, but shared tanks
  need the server, as the website does. With the server down, the app can still be played offline ("Play offline").
- Each build uses the GitHub run number as its build number, so every upload is new. The version shown (1.0) is `MARKETING_VERSION` in
  `ios/App/App.xcodeproj/project.pbxproj`.

## For developers

```
cd ios-app && npm install
TANK_SERVER_URL=https://your-server node prepare.mjs   # copies ../web into www/ and names the server
npx cap sync ios                                        # copies www/ into the Xcode project
npx cap open ios                                        # on a Mac: opens Xcode
```
