return {
    {
        "catppuccin/nvim",
        name = "catppuccin",
        priority = 1000,
        opts = {
            flavour = "auto",
            background = {
                light = "latte",
                dark = "mocha",
            },
            integrations = {
                blink_cmp = true,
                copilot_vim = true,
                gitsigns = true,
                leap = true,
                lsp_trouble = true,
                mason = true,
                mini = { enabled = true },
                native_lsp = {
                    enabled = true,
                    underlines = {
                        errors = { "undercurl" },
                        hints = { "undercurl" },
                        warnings = { "undercurl" },
                        information = { "undercurl" },
                    },
                },
                noice = true,
                notify = true,
                nvimtree = false,
                neotree = true,
                treesitter = true,
                which_key = true,
            },
        },
    },
    {
        "LazyVim/LazyVim",
        opts = {
            colorscheme = "catppuccin",
        },
    },
}
