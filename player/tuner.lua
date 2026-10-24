-- Tuner's glue inside mpv: Back returns to Tuner, and live TV gets channel zapping and number entry.
local mode = mp.get_opt("tuner-mode") or "vod"

local function quit() mp.command("quit") end

mp.add_forced_key_binding("ESC", "tuner-back", function()
  if mp.get_property_native("fullscreen") then
    mp.set_property_native("fullscreen", false)
  else
    quit()
  end
end)
mp.add_forced_key_binding("BS", "tuner-close", quit)

if mode == "live" then
  local function prev() mp.command("playlist-prev force") end
  local function next() mp.command("playlist-next force") end
  for _, k in ipairs({ "UP", "PGUP" }) do mp.add_forced_key_binding(k, "tuner-prev-" .. k, prev, { repeatable = true }) end
  for _, k in ipairs({ "DOWN", "PGDWN" }) do mp.add_forced_key_binding(k, "tuner-next-" .. k, next, { repeatable = true }) end
  mp.add_forced_key_binding("LEFT", "tuner-vol-down", function() mp.commandv("add", "volume", "-5") end, { repeatable = true })
  mp.add_forced_key_binding("RIGHT", "tuner-vol-up", function() mp.commandv("add", "volume", "5") end, { repeatable = true })

  -- Typing a number jumps to that channel. Playlist titles start with the channel number.
  local digits, timer = "", nil
  local function jump()
    local want = digits
    digits = ""
    for i, item in ipairs(mp.get_property_native("playlist") or {}) do
      if item.title and item.title:match("^(%d+) ") == want then
        mp.set_property_number("playlist-pos", i - 1)
        return
      end
    end
    mp.osd_message("No channel " .. want, 2)
  end
  for d = 0, 9 do
    mp.add_forced_key_binding(tostring(d), "tuner-digit-" .. d, function()
      digits = (digits .. d):sub(-5)
      mp.osd_message("Channel " .. digits .. "_", 2)
      if timer then timer:kill() end
      timer = mp.add_timeout(1.2, jump)
    end)
  end

  -- G shows the score of the NBA game on this channel; Tuner answers with show-text.
  mp.add_forced_key_binding("g", "tuner-game", function() mp.commandv("script-message", "tuner-game") end)

  mp.register_event("file-loaded", function() mp.osd_message(mp.get_property("media-title", ""), 3) end)
  mp.register_event("end-file", function(e)
    if e.reason == "error" then mp.osd_message("Channel not available, skipping", 3) end
  end)
else
  mp.add_forced_key_binding("LEFT", "tuner-back10", function() mp.commandv("seek", "-10") end, { repeatable = true })
  mp.add_forced_key_binding("RIGHT", "tuner-fwd10", function() mp.commandv("seek", "10") end, { repeatable = true })
  mp.add_forced_key_binding("UP", "tuner-vol-up", function() mp.commandv("add", "volume", "5") end, { repeatable = true })
  mp.add_forced_key_binding("DOWN", "tuner-vol-down", function() mp.commandv("add", "volume", "-5") end, { repeatable = true })
  mp.add_forced_key_binding("n", "tuner-next", function() mp.command("playlist-next") end)
  mp.register_event("file-loaded", function() mp.osd_message(mp.get_property("media-title", ""), 2.5) end)
end
