--
-- Window management
--

-- Hyper
local cmd = {"cmd"}
local cmdalt = {"cmd", "alt"}

-- Select window
hs.hotkey.bind(cmd, "s", function() hs.hints.windowHints() end)

-- Change window
-- hs.hotkey.bind(cmd, "h", function() hs.window.focusedWindow():focusWindowWest() end)
-- hs.hotkey.bind(cmd, "l", function() hs.window.focusedWindow():focusWindowEast() end)
-- hs.hotkey.bind(cmd, "k", function() hs.window.focusedWindow():focusWindowNorth() end)
-- hs.hotkey.bind(cmd, "j", function() hs.window.focusedWindow():focusWindowSouth() end)

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

-- Push window to next/previous screen
hs.hotkey.bind(cmdalt, "n", function() hs.grid.pushWindowNextScreen() end)
-- hs.hotkey.bind(cmdalt, "p", function() hs.grid.pushWindowPreviousScreen() end)

-- Maximize window
hs.hotkey.bind(cmdalt, "m", hs.grid.maximizeWindow)

-- Kill window
hs.hotkey.bind(cmd, "delete", function() hs.window.focusedWindow():close() end)
hs.hotkey.bind(cmdalt, "delete", function() hs.window.focusedWindow():application():kill() end)


--
-- Application management
--

-- Hyper
b = hs.hotkey.modal.new({"cmd"}, "return")
b:bind({"cmd"}, "return", function() end)
b:bind({}, "escape", function() b:exit() end)

-- Launch or focus application
local key2app = {
  c = "Google Chrome",
  t = "iTerm",
  s = "Slack",
  a = "Atom",
  m = "Messages"
}

for key, app in pairs(key2app) do
  b:bind({}, key, function() hs.application.launchOrFocus(app) b:exit() end)
end
