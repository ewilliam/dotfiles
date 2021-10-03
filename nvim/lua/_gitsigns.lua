require('gitsigns').setup()
require('focus').setup()
require'colorizer'.setup()
local npairs = require('nvim-autopairs')
npairs.setup()
npairs.add_rules(require('nvim-autopairs.rules.endwise-elixir'))
npairs.add_rules(require('nvim-autopairs.rules.endwise-lua'))
npairs.add_rules(require('nvim-autopairs.rules.endwise-ruby'))

require("winshift").setup({
  highlight_moving_win = true,  -- Highlight the window being moved
  focused_hl_group = "Visual",  -- The highlight group used for the moving window
  moving_win_options = {
    -- These are local options applied to the moving window while it's
    -- being moved. They are unset when you leave Win-Move mode.
    wrap = false,
    cursorline = false,
    cursorcolumn = false,
    colorcolumn = "",
  }
})

require('indent_guides').setup({
    even_colors = { fg ='#2a3834',bg='#332b36' };
    odd_colors = {fg='#332b36',bg='#2a3834'};
})

require('nvim-treesitter.configs').setup {
  autotag = {
    enable = true,
  },
  rainbow = {
    enable = true,
    extended_mode = true, -- Also highlight non-bracket delimiters like html tags, boolean or table: lang -> boolean
    max_file_lines = nil, -- Do not enable for files with more than n lines, int
    -- colors = {}, -- table of hex strings
    -- termcolors = {} -- table of colour name strings
  },
  matchup = {
    enable = true,              -- mandatory, false will disable the whole extension
  },
  context_commentstring = {
    enable = true
  },
}

vim.g.glow_binary_path = vim.env.HOME .. "/bin"

local opts = {
  auto_session_enable_last_session = true,
  auto_session_enabled = true,
  auto_save_enabled = true,
  auto_restore_enabled = true,
}

require('auto-session').setup(opts)
