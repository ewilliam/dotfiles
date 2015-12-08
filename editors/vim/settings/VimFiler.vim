" VimFiler
" Powerful file explorer

let g:vimfiler_as_default_explorer = 1
let g:vimfiler_tree_leaf_icon = '⁞'
let g:vimfiler_tree_opened_icon = '▿'
let g:vimfiler_tree_closed_icon = '▸'
let g:vimfiler_file_icon = ''
let g:vimfiler_readonly_file_icon = '⭤'
let g:vimfiler_marked_file_icon = '✑'
let g:vimfiler_time_format = ""

" Allow to create and remove files
call vimfiler#custom#profile('default', 'context', {'safe' : 0})

" function! s:vimfiler_settings()
"   " Mimic NERDtree split behavior
"   nnoremap <leader>t :<C-u>Unite -no-split -buffer-name=files   -start-insert file_rec/async:!<cr>
"   nnoremap <silent><buffer><expr> <C-x> vimfiler#do_switch_action('split')
"   nnoremap <silent><buffer><expr> <C-v> vimfiler#do_switch_action('vsplit')
"   nnoremap <silent><buffer><expr> <C-t> vimfiler#do_switch_action('tabopen')
"   inoremap <silent><buffer><expr> <C-x> vimfiler#do_switch_action('split')
"   inoremap <silent><buffer><expr> <C-v> vimfiler#do_switch_action('vsplit')
"   inoremap <sileet><buffer><expr> <C-t> vimfiler#do_switch_action('tabopen')
" endfunction

" autocmd FileType vimfiler call s:vimfiler_settings()


nmap <leader>t :<C-u>VimFilerExplorer -split -simple -parent -winwidth=35 -toggle -no-quit<CR>

function! s:vimfiler_settings()
  nmap     <buffer><expr><CR>  vimfiler#smart_cursor_map("\<PLUG>(vimfiler_expand_tree)", "e")
  nmap     <buffer><TAB>       <PLUG>(vimfiler_choose_action)
  nmap     <buffer>c           <PLUG>(vimfiler_clipboard_copy_file)
  nmap     <buffer>m           <PLUG>(vimfiler_clipboard_move_file)
  nmap     <buffer>p           <PLUG>(vimfiler_clipboard_paste)
  nmap     <buffer>@           <PLUG>(vimfiler_toggle_mark_current_line)
  nmap     <buffer>j           j<PLUG>(vimfiler_print_filename)
  nmap     <buffer>k           k<PLUG>(vimfiler_print_filename)
  nnoremap <buffer>b           :<C-u>Unite -buffer-name=bookmark-vimfiler_history -default-action=cd -no-start-insert bookmark directory_mru<CR>
  nnoremap <buffer>e           :<C-u>call vimfiler#mappings#do_action('choosewin/open')<CR>
  nnoremap <buffer>s           :<C-u>call vimfiler#mappings#do_action('choosewin/split')<CR>
  nnoremap <buffer>v           :<C-u>call vimfiler#mappings#do_action('choosewin/vsplit')<CR>
  nnoremap <buffer><F8>        :<C-u>VimFilerTab -double<CR>
endfunction
autocmd! FileType vimfiler call s:vimfiler_settings()
