# Is It Nice Out?

A weather app that tells you what the weather *means*, not just what it is.
210 different comments, rotating weekly.

The **What to take** list suggests an umbrella, coat, sweater, hooded waterproof,
gloves, sun cream/sunglasses or water when the forecast calls for them. Each suggestion
includes a reason. These are automatic suggestions, with no checkboxes to manage.
The app uses Celsius internally for clothing thresholds even when displaying Fahrenheit.
In strong wind or thunderstorms, it suggests a hooded waterproof instead of an umbrella.

The list covers today's conditions, including the coolest temperature and current
feels-like temperature. Refresh the forecast before planning an outing.

Every day in the forecast shows its rain chance, including 0% and low percentages.
If the weather service has no probability for a day, the app shows a dash rather than
making up a zero.

For automated interaction checks for both apps, run `npm ci`, `npm run build` and
`npm test` from the sibling `Study Desk` folder. Browser layout, real GPS and install
behaviour still need a browser check.

No API key. No account. No tracking. Nothing to pay for, ever.

## Publishing the current version on Netlify

Run `npm run build` from this directory. The build copies the complete app to `dist/`,
including the current What to take list, styles, service worker, manifest and icons.
No dependencies need to be downloaded for this build.

For Git-connected Netlify deploys, use build command `npm run build` and publish directory
`dist`; the included `netlify.toml` sets these. If the repository is this project alone,
leave the base directory blank. If it contains the entire workspace, set the base to
`nice-out/nice-out`. For Netlify Drop, upload the generated `dist` folder.

The build automatically versions the offline cache using the app contents. `_headers`
asks browsers to revalidate app files and the worker. Subsequent worker updates reload
an already controlled page once so it displays the new app. If you previously opened an
older deployed version, close and reopen it after the first updated deployment, or reload
again after its worker has updated. Local weather settings and saved places are retained.

An old "Big coat" chip without a separate "What to take" card indicates older app code
is still being served, either by the deployment or by its old service worker.

---

## The files

| File | What it does |
|---|---|
| `index.html` | The page itself |
| `style.css` | All the colours and layout |
| `jokes.js` | **The 210 sentences — edit these first** |
| `app.js` | The logic: fetching weather, working things out, drawing it |
| `manifest.webmanifest` | Tells Android it's an app (name, icon, colours) |
| `sw.js` | Service worker — makes it installable and work offline |
| `icon-*.png` | App icons |

---

## Running it on your phone right now

Put all these files in one folder on your phone and open `index.html`.
Everything works except installing — that needs a real web address (below).

## Installing it as a proper app on your Samsung

For the "Install app" option to appear, the files have to be on a real
website with `https`. That's what the free hosting below is for.

1. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)** on a computer
2. Drag this whole folder onto the page
3. Wait about 20 seconds — you get a live web address
4. Open that address on your phone in **Chrome** or **Samsung Internet**
5. Use the browser menu → *Install app* / *Add to Home screen*

Or skip the hosting entirely: `APKs/Daily Sky.apk` is a ready-made Android app (see `apk-build/`).

You now have an icon on your home screen. It opens fullscreen with no
browser bars, works offline, and looks like any other app on the phone.

**Netlify Drop needs an account to keep the site permanently.** Cloudflare
Pages and Vercel work the same way. Accounts usually need you to be 13+,
so this is the bit to do with a parent.

---

## Making it yours

**The jokes.** Open `jokes.js`. Fifteen lists, one per weather type. Add as
many lines as you like — the app counts them automatically. This is the
fastest way to make the app feel like yours.

**The colours.** Open `app.js` and find `TONE`. Each weather type has two
colours: the main one and a darker one for the circle behind it. Change
`rain` to purple and every rainy day looks different.

**Anything you change:** open `sw.js` and change `nice-out-v1` to
`nice-out-v2`. Otherwise phones keep showing the old cached version and
you'll go slightly mad wondering why your edits did nothing.

---

## If you publish it

Two things worth doing, because they're just decent:

- Keep the "Weather from Open-Meteo" line at the bottom. They give this
  data away for free; a credit is the least they're owed.
- Don't add tracking. The app currently sends nothing anywhere except the
  coordinates needed to look up a forecast. That's a genuinely rare and
  good thing — keep it that way.

## Where the data comes from

- Forecast + air quality: [open-meteo.com](https://open-meteo.com) (free, no key)
- Place name lookup: bigdatacloud.net (free, no key)
- Moon phase: calculated on your phone, no internet needed at all
