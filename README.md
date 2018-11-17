# dat dotfiles

## Installation

For macOS (supported exclusively for now), XCode is required. Please be sure PROJECT_HOME, XDG_CONFIG_HOME, and MACOS_CONFIG_HOME are set, then run:

```bash
cd ${PROJECT_HOME}
git clone https://github.com/ewilliam/dotfiles.git; cd dotfiles
sh bootstrap.sh
```

## Upgrading

```bash
cd ${PROJECT_HOME}/dotfiles
git pull
sh bootstrap.sh
```
