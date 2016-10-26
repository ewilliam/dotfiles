let g:lightline = {
  \ 'colorscheme': 'solarized',
  \ 'active': {
  \   'left': [ [ 'mode', 'paste' ],
  \             [ 'fugitive', 'gitgutter', 'readonly', 'filename', 'modified' ] ],
  \   'right': [ [ 'lineinfo' ], [ 'percent' ],
  \             [ 'fileformat', 'fileencoding', 'filetype' ] ],
  \ },
  \ 'component_function': {
  \   'fugitive': 'MyFugitive',
  \   'gitgutter': 'MyGitGutter',
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
    if expand('%:t') !~? 'vimfiler\|Mundo\|Tagbar' && &ft != "unite" && exists('*fugitive#head')
      let mark = "\ue0a0 "
      let branch = fugitive#head()
      return branch !=# '' ? mark.branch : ''
    endif
  catch
  endtry
  return ''
endfunction

function! MyGitGutter()
  if expand('%:t') !~? 'vimfiler\|Mundo\|Tagbar' && &ft !~ 'unite\|gitcommit' && exists('*GitGutterGetHunkSummary')
    let [ added, modified, removed ] = GitGutterGetHunkSummary()
    return printf("+%d ~%d -%d", added, modified, removed)
  endif
  return ''
endfunction

function! TagbarStatusFunc(current, sort, fname, ...) abort
    let g:lightline.fname = a:fname
  return lightline#statusline(0)
endfunction

function! MyFilename()
  let fname = expand('%:t')
  return fname == '__Tagbar__' ? g:lightline.fname :
        \ fname =~ '__Mundo' ? '' :
        \ &ft == 'vimfiler' ? vimfiler#get_status_string() :
        \ &ft == 'unite' ? unite#get_status_string() :
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
let g:unite_force_overwrite_statusline = 0
let g:vimfiler_force_overwrite_statusline = 0
let g:tagbar_status_func = 'TagbarStatusFunc'
