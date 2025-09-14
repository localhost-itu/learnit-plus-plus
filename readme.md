# <img src="assets/icon.png" alt="LearnIT++ logo" width="100" style="vertical-align:middle;"/> LearnIT++

_Improved UI and features for LearnIT at ITU_

| ![learnit++ light mode](assets/images/preview-images/plus-light.png) | ![learnit++ dark mode](assets/images/preview-images/plus-dark.png) |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ![hacker mode](assets/images/preview-images/hacker.png)              | ![retro light mode](assets/images/preview-images/retro.png)        |

## Description

LearnIT++ is a lightweight browser extension that refreshes the LearnIT platform  with a cleaner interface, smarter layouts and a growing set of productivity enhancements.

What you get out of the box:

- Multiple handcrafted themes (Light, Dark, Hacker, Retro) you can switch between instantly
- Polished spacing & layout tweaks for a calmer, denser, more scannable dashboard
- Calendar integration for quicker planning without leaving LearnIT
- Accessibility & usability refinements (clearer icons, improved drawers, better external‑link indicators)
- A steady stream of quality‑of‑life improvements driven by student feedback

Install it, pick a theme, and enjoy a smoother day-to-day LearnIT experience.

## Installation

There is currently no web store download, but adding local extensions is pretty easy.

**Chrome/chromium guide:**

Install via [Chrome Web Store](https://chrome.google.com/webstore/detail/learnit%2B%2B/dgljcacndcbaedcglhlibdhohipphojk/)

_Manual install:_
To install LearnIt++, follow these simple steps:

1. Download the latest zip from the [releases](https://github.com/localhost-itu/learnit-plus-plus/releases) on GitHub.
2. Unpack the zip
3. Go to `chrome://extensions` in your browser
4. Enable developer mode in the top right
5. Press `Load unpacked` and select the unpacked zip
6. Enjoy!

**Firefox guide:**

You can now install LearnIT++ for Firefox directly from the Mozilla Add-ons store:

1. Visit [LearnIT++ on Mozilla Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/learnitplusplus/)
2. Click "Add to Firefox" and follow the prompts to install.
3. Enjoy!

_Manual install:_

1. Download the latest `xpi` file from the [releases](https://github.com/localhost-itu/learnit-plus-plus/releases) on GitHub.
2. Go to `about:addons` in your browser
3. Press the gear icon next to "Customize Firefox"
4. Press `Install add-on from file...`
5. Select the downloaded `xpi` file
6. Accept the popup to install the add-on.
7. Enjoy!

**Safari:**

There is currently no plan for safari support since you need an Apple dev license for this.

## Contributing

For contributing please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## How to build

## Development

> [!NOTE]
> We use Bun instead of Node. If you prefer using Node we don't guarantee that building will work, but just replace `bun` with `npm` in the commands.

1. Run `bun i` if it is the first time building
2. Run `bun dev` to start the development server
3. Open [https://learnit.itu.dk/my/](https://learnit.itu.dk/my/) and start making cool stuff 🪄

## Production

1. Use `bun build` to build the extension and make a local build in the `build/` folder
2. Use `bun package:chrome` to generate a zip in the `build/` folder for chrome
3. Use `bun package:firefox` for a Firefox zip package
4. **Done**, time to distribute 🎉

## Support

If you have any questions or issues, please use the issues page on GitHub to report issues and discussions for questions and ideas.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
