# dat dotfiles

```
    # my dotfiles

    $ sh -c "`curl -fsSL https://raw.github.com/ewilliam/dot/master/install.sh`"
```

# Installation

To run:

```bash
sh -c "`curl -fsSL https://raw.github.com/ewilliam/dot/master/install.sh`"
```

**Note:** All subcomponents are installed by default. To be asked about each subcomponent, type:

```bash
sh -c "`curl -fsSL https://raw.github.com/ewilliam/dot/master/install.sh`" -s ask
```

# Upgrading

Upgrading is easy.

```bash
cd ~/.dotfiles
git pull --rebase
rake update
```

**Always be sure to run `rake update` after pulling to ensure plugins are updated**

# Toolbox

A mix of modern and old school tools, each personally considered as the best tool for the job.

## Fish

Command line shell for the 90s.

* Vim mode
* Fuzzy matching - smarter tab completions
* [fasd](https://github.com/clvv/fasd) integration
* [Fisherman](https://github.com/fisherman/fisherman) - Fast plugin manager for Fish shell
* Shellder theme - beautiful shell prompt with Git info

## Aliases

Save time with mnemonic aliases.

    fr  # fish reload
    ae	# alias edit
    cl  # clear
    l   # list
    psp # ps aux peco

## Vim

### Buffers

* `,bh` - Buffer help
* `,bs` - Buffer explore
* `,bn` - Buffer next
* `,bp` - Buffer previous
* `,bd` - Buffer delete

### Cursor

* `,ch` - Cursor help
* `,cg` - Cursor grep word

### File

* `,ff` - File find
* `,fs` - File search git
* `,fe` - File explore
* `,fc` - Files changed
* `,fg` - File grep

### Git

* `,gh` - Git help
* `,ga` - Git add
* `,gb` - Git branch
* `,gB` - Git blame
* `,gc` - Git commit
* `,gco` - Git checkout
* `,gd` - Git diff
* `,gp` - Git pull
* `,gP` - Git push
* `,gs` - Git status

### Google

* `,ig` - Google

### History

* `,hh` - History help
* `,hy` - History yank
* `,hu` - History undo
* `,hs` - History search

### Surround

* `,sh` - Surround help
* `,s#` - Surround with #{ruby interpolation}
* `,s"` - Surround with "quotes"
* `,s'` - Surround with 'single quotes'
* `,s(` - Surround with (parens)
* `,s[` - Surround with [brackets]
* `,s{` - Surround with {braces}
* `,s`\` - Surround with \`backticks\`

### Terminal

* `,th` - Terminal help
* `,td` - Terminal dispatch
* `,tc` - Terminal console
