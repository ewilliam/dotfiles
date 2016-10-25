require "settings"
require "smart_grid"
require "application_watcher"
require "reload_config"
require "caffeine"
require "bindings"

local myWatcher = hs.pathwatcher.new(os.getenv("HOME") .. "/.hammerspoon/", reloadConfig):start()
hs.alert.show("Config loaded")
