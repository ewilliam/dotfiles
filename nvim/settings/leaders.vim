let leaders = '~/.config/nvim/settings/leaders'
let g:menus = {}

for fpath in split(globpath(leaders, '*.vim'), '\n')
  exe 'source' fpath
endfor
