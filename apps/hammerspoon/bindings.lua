--
-- Window management
--
-- Hyper
local cmd = {"cmd"}
local ctrl = {"ctrl"}
local cmdalt = {"cmd", "alt"}

-- Select window
hs.hotkey.bind(cmd, "return", function() hs.hints.windowHints() end)

-- Toggle full screen
hs.hotkey.bind(cmdalt, "f", function() hs.window.focusedWindow():toggleFullScreen() end)

-- Move window
hs.hotkey.bind(cmdalt, "h", hs.grid.pushWindowLeft)
hs.hotkey.bind(cmdalt, "j", hs.grid.pushWindowDown)
hs.hotkey.bind(cmdalt, "k", hs.grid.pushWindowUp)
hs.hotkey.bind(cmdalt, "l", hs.grid.pushWindowRight)

-- Smart resize window
hs.hotkey.bind(cmdalt, "u", smartResizeWindowDown)
hs.hotkey.bind(cmdalt, "i", smartResizeWindowUp)
hs.hotkey.bind(cmdalt, "o", smartResizeWindowRight)
hs.hotkey.bind(cmdalt, "y", smartResizeWindowLeft)

-- Change grid size
hs.hotkey.bind(cmdalt, "[", decreaseGrid)
hs.hotkey.bind(cmdalt, "]", increaseGrid)

-- Maximize window
hs.hotkey.bind(cmdalt, "m", hs.grid.maximizeWindow)

--
-- Application management
--
-- Hyper
local cmdreturn = hs.hotkey.modal.new(ctrl, "space")
cmdreturn:bind({}, "escape", function() b:exit() end)

-- Launch or focus application
local key2app = {
  a = "Atom",
  d = "Dash",
  c = "Google Chrome",
  g = "GitKraken",
  i = "iTerm",
  m = "Messages",
  s = "Slack",
  t = "Todoist"
}

for key, app in pairs(key2app) do
  cmdreturn:bind({}, key, function() hs.application.launchOrFocus(app) cmdreturn:exit() end)
end
