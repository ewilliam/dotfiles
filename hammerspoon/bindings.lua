--
-- Window management
--
-- Hyper
local cmd = { "cmd" }
local ctrl = { "ctrl" }
local cmdalt = { "cmd", "alt" }

-- Select window
hs.hotkey.bind(ctrl, "a", function() hs.hints.windowHints() end)

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
local ctrlspace = hs.hotkey.modal.new(ctrl, "space")
ctrlspace:bind({}, "escape", function() ctrlspace:exit() end)

-- Launch or focus application
local key2app = {
    a = "Arc",
    c = "Google Chrome",
    d = "Dash",
    e = "Zed",
    f = "Finder",
    g = "Tower",
    m = "Messages",
    s = "Safari",
    t = "Ghostty",
}

for key, app in pairs(key2app) do
    ctrlspace:bind({}, key, function()
        hs.application.launchOrFocus(app)
        ctrlspace:exit()
    end)
end
