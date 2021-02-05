let g:lightline = {
  \ 'colorscheme': 'gruvbox',
  \ 'active': {
  \   'left': [ [ 'mode', 'paste' ],
  \             [ 'gina', 'signify', 'readonly', 'relativepath', 'modified' ] ],
  \   'right': [ [ 'lineinfo' ], [ 'percent' ],
  \             [ 'fileformat', 'fileencoding', 'filetype' ] ],
  \ },
  \ 'inactive': {
  \   'left': [
  \     ['relativepath'],
  \   ],
  \ },
  \ 'component_function': {
  \   'gina': 'gina#component#repo#branch',
  \   'readonly': 'MyReadonly',
  \   'filename': 'MyFilename',
  \   'modified': 'MyModified',
  \   'fileformat': 'MyFileformat',
  \   'fileencoding': 'MyFileencoding',
  \   'mode': 'MyMode',
  \   'filetype': 'MyFiletype',
  \ },
  \ 'separator': { 'left': "\ue0b0", 'right': "\ue0b2" },
  \ 'subseparator': { 'left': "\ue0b1", 'right': "\ue0b3" }
  \ }

function! MyReadonly()
  return &ft !~? 'help' && &readonly ? "\ue0a2" : ''
endfunction

function! MyModified()
  return &ft =~ 'help\|gitcommit' ? '' : &modified ? '+' : &modifiable ? '' : '-'
endfunction

function! MyFugitive()
  try
    if expand('%:t') !~? 'Mundo\|Tagbar' && &ft != "denite" && exists('*fugitive#head')
      let mark = "\ue0a0 "
      let branch = fugitive#head()
      return branch !=# '' ? mark.branch : ''
    endif
  catch
  endtry
  return ''
endfunction

" function! MyStarify()
"   let symbols = ['+', '-', '~']
"   let [added, modified, removed] = sy#repo#get_stats()
"   let stats = [added, removed, modified]  " reorder
"   let hunkline = ''

"   for i in range(3)
"     if stats[i] > 0
"       let hunkline .= printf('%s%s ', symbols[i], stats[i])
"     endif
"   endfor

"   if !empty(hunkline)
"     let hunkline = printf('[%s]', hunkline[:-2])
"   endif

"   return hunkline
" endfunction

function! MyFilename()
  let fname = expand('%:t')
  return fname == '__Tagbar__' ? g:lightline.fname :
        \ fname =~ '__Mundo' ? '' :
        \ &ft == 'gitcommit' ? "" :
        \ ('' != MyReadonly() ? MyReadonly() . ' ' : '') .
        \ ('' != fname ? fname : '[No Name]') .
        \ ('' != MyModified() ? ' ' . MyModified() : '')
endfunction

function! MyMode()
  let fname = expand('%:t')
  return fname == '__Tagbar__' ? 'Tagbar' :
        \ fname == '__Mundo__' ? 'Mundo' :
        \ fname == '__Mundo_Preview__' ? 'Mundo Preview' :
        \ &ft == 'denite' ? 'Denite' :
        \ winwidth(0) > 60 ? lightline#mode() : ''
endfunction

function! MyFileformat()
  return winwidth(0) > 70 ? &fileformat : ''
endfunction

function! MyFiletype()
  return winwidth(0) > 70 ? (&filetype !=# '' ? &filetype : 'no ft') : ''
endfunction

function! MyFileencoding()
  return winwidth(0) > 70 ? (&fenc !=# '' ? &fenc : &enc) : ''
endfunction

set laststatus=2
" let g:tagbar_status_func = 'TagbarStatusFunc'
