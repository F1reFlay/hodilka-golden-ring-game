local WORKER_URL = "https://misty-wildflower-a4f2.dszonovdaniil.workers.dev/warehouse"
local TOKEN = "cc-warehouse-9f8x2k1"

local chest = peripheral.find("inventory")
if not chest then
  print("Сундук/бочка не найдены рядом")
  return
end

local counts = {}
for slot, item in pairs(chest.list()) do
  counts[item.name] = (counts[item.name] or 0) + item.count
end

local json = textutils.serialiseJSON(counts)

local response, err = http.post(WORKER_URL, json, {
  ["Authorization"] = "Bearer " .. TOKEN,
  ["Content-Type"] = "application/json"
})

if response then
  print("Отправлено, ответ сервера: " .. response.readAll())
  response.close()
else
  print("Ошибка: " .. tostring(err))
end
