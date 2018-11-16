# dat dotfiles

## Installation

For macOS (supported exclusively for now), XCode is required. Please sure PROJECT_HOME and MACOS_CONFIG_HOME are set, then run:

```bash
sh -c "`curl -fsSL https://raw.githubusercontent.com/ewilliam/dotfiles/master/bootstrap.sh`"
```

or clone the project and run:

```bash
cd ${PROJECT_HOME}/dotfiles
sh bootstrap.sh
```

## Upgrading

```bash
cd ${PROJECT_HOME}/dotfiles
git pull
sh bootstrap.sh
```
