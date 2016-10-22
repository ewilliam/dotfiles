" Unite
" Unite and create user interfaces

let g:unite_source_history_yank_enable = 1
let g:unite_source_history_yank_file=$HOME.'/.vim/yankring.txt'
let g:unite_force_overwrite_statusline = 0
let g:unite_source_rec_max_cache_files = 0

call unite#filters#matcher_default#use(['matcher_fuzzy'])

if executable('sift')
  let g:unite_source_rec_async_command = 'sift --no-color'
  let g:unite_source_grep_command = 'sift'
  let g:unite_source_grep_default_opts = '--line-number --no-color'
  let g:unite_source_grep_recursive_opt = '--recursive'
endif

" Custom mappings for the unite buffer
function! s:unite_settings()
  " Play nice with supertab
  let b:SuperTabDisabled=1
  " Enable navigation with control-j and control-k in insert mode
  imap <buffer> <C-j>   <Plug>(unite_select_next_line)
  imap <buffer> <C-k>   <Plug>(unite_select_previous_line)

  " Mimic NERDtree split behavior
  nnoremap <silent><buffer><expr> <C-s> unite#do_action('split')
  nnoremap <silent><buffer><expr> <C-v> unite#do_action('vsplit')
  nnoremap <silent><buffer><expr> <C-t> unite#do_action('tabopen')
  inoremap <silent><buffer><expr> <C-s> unite#do_action('split')
  inoremap <silent><buffer><expr> <C-v> unite#do_action('vsplit')
  inoremap <silent><buffer><expr> <C-t> unite#do_action('tabopen')
endfunction

autocmd FileType unite call s:unite_settings()
