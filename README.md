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
    cl  # clear
    l   # detailed colored list
    psp # ps aux with peco

## Vim

### Buffers

* `<leader>bh` - Buffer help
* `<leader>bs` - Buffer explore
* `<leader>bn` - Buffer next
* `<leader>bp` - Buffer previous
* `<leader>bd` - Buffer delete

### Cursor

* `<leader>ch` - Cursor help
* `<leader>cg` - Cursor grep word

### File

* `<leader>ff` - File find
* `<leader>fs` - File search git
* `<leader>fe` - File explore
* `<leader>fc` - Files changed
* `<leader>fg` - File grep

### Git

* `<leader>gh` - Git help
* `<leader>ga` - Git add
* `<leader>gb` - Git branch
* `<leader>gB` - Git blame
* `<leader>gc` - Git commit
* `<leader>gco` - Git checkout
* `<leader>gd` - Git diff
* `<leader>gp` - Git pull
* `<leader>gP` - Git push
* `<leader>gs` - Git status

### Google

* `<leader>ig` - Google

### History

* `<leader>hh` - History help
* `<leader>hy` - History yank
* `<leader>hu` - History undo
* `<leader>hs` - History search

### REPL

* `<leader>rs` - Start terminal

### Surround

* `<leader>sh` - Surround help
* `<leader>s#` - Surround with #{ruby interpolation}
* `<leader>s"` - Surround with "quotes"
* `<leader>s'` - Surround with 'single quotes'
* `<leader>s(` - Surround with (parens)
* `<leader>s[` - Surround with [brakcets]
* `<leader>s{` - Surround with {braces}
* `<leader>s`\` - Surround with \`backticks\`

### Terminal

* `<leader>th` - Terminal help
* `<leader>td` - Terminal dispatch
* `<leader>tc` - Terminal console







