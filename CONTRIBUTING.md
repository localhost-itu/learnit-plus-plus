<!-- omit in toc -->
# Contributing to LearnIT++ Extension

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

<!-- omit in toc -->
## Table of Contents

- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Getting Started](#getting-started)
- [Fork the Repository](#fork-the-repository)
- [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Making Changes](#making-changes)
- [Style guides](#style-guides)

## I Have a Question

Before you ask a question, it is best to search for existing [Issues](https://github.com/localhost-itu/learnit-plus-plus/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/localhost-itu/learnit-plus-plus/issues/new).
- Provide as much context as you can about what you're running into.
- Provide the extension version

We will then take care of the issue as soon as possible.

## I Want To Contribute

> ### Legal Notice <!-- omit in toc -->
>
> When contributing to this project, you must agree that you have authored 100% of the content, that you have the necessary rights to the content, and that the content you contribute may be provided under the project license.

### Reporting Bugs

<!-- omit in toc -->
#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions (Make sure that you have read the [documentation](). If you are looking for support, you might want to check [this section](#i-have-a-question)).
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](https://github.com/localhost-itu/learnit-plus-plus/issues?q=label%3Abug).
- Also make sure to search the internet (including Stack Overflow) to see if users outside of the GitHub community have discussed the issue.
- Collect information about the bug:
- Stack trace (Traceback)
- Browser and Version (Chrome, Firefox, Safari)
- Can you reliably reproduce the issue? And can you also reproduce it with older versions?

<!-- omit in toc -->
#### How Do I Submit a Good Bug Report?

> You must never report security-related issues, vulnerabilities, or bugs including sensitive information to the issue tracker, or elsewhere in public. Instead sensitive bugs must be sent by email to <patr7500@gmail.com>.

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [Issue](https://github.com/localhost-itu/learnit-plus-plus/issues/new). (Since we can't be sure at this point whether it is a bug or not, we ask you not to talk about a bug yet and not to label the issue.)
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the *reproduction steps* that someone else can follow to recreate the issue on their own. This usually includes your code. For good bug reports you should isolate the problem and create a reduced test case.
- Provide the information you collected in the previous section.

Once it's filed:

- The project team will label the issue accordingly.
- A team member will try to reproduce the issue with your provided steps. If there are no reproduction steps or no obvious way to reproduce the issue, the team will ask you for those steps and mark the issue as `needs-repro`. Bugs with the `needs-repro` tag will not be addressed until they are reproduced.
- If the team is able to reproduce the issue, it will be marked `needs-fix`, as well as possibly other tags (such as `critical`), and the issue will be left to be [implemented by someone](#your-first-code-contribution).

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for LearnIT++, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestions and find related suggestions.

<!-- omit in toc -->
#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the [documentation]() carefully and find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search](https://github.com/localhost-itu/learnit-plus-plus/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. It's up to you to make a strong case to convince the project's developers of the merits of this feature. Keep in mind that we want features that will be useful to the majority of our users and not just a small subset. If you're just targeting a minority of users, consider writing an add-on/plugin library.

<!-- omit in toc -->
#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/localhost-itu/learnit-plus-plus/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots and animated GIFs** which help you demonstrate the steps or point out the part which the suggestion is related to. You can use [this tool](https://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux. <!-- this should only be included if the project has a GUI -->
- **Explain why this enhancement would be useful** to most LearnIT++ users. You may also want to point out the other projects that solved it better and which could serve as inspiration.

### Your First Code Contribution

## Getting Started

Before you start contributing, make sure you have the necessary tools and dependencies installed:

- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/) (we use Bun instead of Node for package management and running scripts)
- A code editor like [Visual Studio Code](https://code.visualstudio.com/) or any other of your choice.

## Fork the Repository

To contribute to LearnIT++ Extension, fork the [GitHub repository](https://github.com/localhost-itu/learnit-plus-plus) to your own GitHub account. You can do this by clicking the "Fork" button on the top right of the repository page.

## Setting Up the Development Environment

1. Clone your forked repository:

```bash
git clone https://github.com/YourUsername/learnit-plus-plus.git
```

2. Change into the project directory:

```bash
cd learnit-plus-plus
```

3. Install dependencies:

```bash
bun install
```

4. Run the development server:

```bash
bun dev
```

5. This command will enable auto-reloading for the extension.

## Making Changes

Create a new branch for your changes:

```bash
git checkout -b <feature-branch>
```

Make your changes and test them locally.

Commit your changes with a clear and concise commit message:

```bash
git commit -m "Add feature or fix issue"
```

Push your changes to your fork:

```bash
git push origin feature-branch
```

Open a pull request on the GitHub repository with a detailed description of your changes.

Building the Extension
To build the extension for deployment, follow these steps:

Run the package command:

```bash
bun package
```

It builds for both Chrome and Firefox. If you only want to build for either Chrome or Firefox, you can use the following commands:

```bash
bun package:chrome

bun package:firefox
```

This will generate a zip file in the `build/` folder.

## Style guides

We use prettier to ensure the style guide

<!-- omit in toc -->
## Attribution

This guide is based on the **contributing-gen**. [Make your own](https://github.com/bttger/contributing-gen)!
