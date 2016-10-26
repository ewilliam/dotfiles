fun! StripTrailingWhitespace()
  if exists('b:noStripWhitespace')
    return
  endif

  :StripWhitespace
endfun

autocmd FileWritePre    * call StripTrailingWhitespace()
autocmd FileAppendPre   * call StripTrailingWhitespace()
autocmd FilterWritePre  * call StripTrailingWhitespace()
autocmd BufWritePre     * call StripTrailingWhitespace()

autocmd FileType mail let b:noStripWhitespace=1
