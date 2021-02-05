"
" File
"

nnoremap <leader>ff <cmd>lua require('telescope.builtin').find_files()<cr>
nnoremap <leader>fg <cmd>lua require('telescope.builtin').live_grep()<cr>
nnoremap <leader>fr <cmd>lua require('telescope.builtin').oldfiles()<cr>
nnoremap <leader>fh <cmd>lua require('telescope.builtin').help_tags()<cr>
nnoremap <leader>ft <cmd>lua require('telescope.builtin').tags()<cr>

nnoremap <leader>fb :Ranger<CR>
nnoremap <leader>fe :RangerWorkingDirectory<CR>
nnoremap <leader>fc :OpenChangedFiles<CR>
