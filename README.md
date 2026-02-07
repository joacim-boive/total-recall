# Total Recall

**Total Recall** is a VSCode extension that helps you recall which files you had open when you changed Git branches. This extension aims to improve your workflow by preserving your working context across branch switches and workspaces.

## Demo

### Default behavior

no changes are made your open files

[![Total Recall Demo](https://img.youtube.com/vi/iNPp7o6qepI/0.jpg)](https://youtu.be/iNPp7o6qepI)

### With Total Recall enabled

the extension will save your open files and restore them when you switch branches

[![Total Recall Demo](https://img.youtube.com/vi/MUT8jQaq-sY/0.jpg)](https://youtu.be/MUT8jQaq-sY)

## Features

- Automatically saves the state of your open files when switching Git branches
- Quickly restores your previous working context when returning to a branch
- Full support for multi-root workspaces with per-repository tab tracking

## Usage

You don't need to do anything! The extension will automatically save and restore your open files when you switch branches.

### Restore behavior option

You can configure `Total Recall: Restore Behavior` in VS Code settings:

- `preserveTabOrder` (default): opens tabs in saved order, then focuses the previously active tab.
- `focusActiveTabFirst`: opens the previously active tab first, then opens remaining tabs in the background.
  Warning: this mode does not preserve the saved tab order.

## Multi-root Workspaces

Total Recall fully supports multi-root workspaces. Each Git repository in your workspace is tracked independently:

- When you switch branches in one repository, only the tabs belonging to that repository are closed and restored
- Tabs from other repositories in the workspace remain unaffected
- Each repository maintains its own branch-to-files mapping

## Roadmap

- Add AI that scans your commits and recaps what you've been working on lately to help you get back up to speed.

## Limitations

- It wont keep track of split views.
- Only text files are currently supported.

## Requirements

- Visual Studio Code version 1.91.0 or higher
- Git installed and initialized in your workspace
