require "settings"
require "smart_grid"
require "application_watcher"
require "caffeine"
require "bindings"

-- Watch files and auto-reload config
hs.pathwatcher.new(os.getenv("HOME") .. "/.hammerspoon/", hs.reload):start()
hs.alert("Config loaded")
