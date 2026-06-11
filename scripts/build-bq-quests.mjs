#!/usr/bin/env node
/**
 * Voidcraft quest tree generator for BetterQuesting 3.5.x (1.12.2).
 *
 * Each quest entry: ['Name', 'Description', 'icon-itemid', count]
 *   - count > 0  => bq_standard:retrieval task (collect N of icon-itemid)
 *   - count === 0 => bq_standard:checkbox     (manual check — for modded items
 *                                              whose exact id might shift)
 *
 * Layout: each chapter is a list of `sections`. Sections are arranged in a
 * vertical "column" — first quest at the top, each next quest below + offset.
 * Multiple sections sit side-by-side, so the book reads as a tree of parallel
 * progression lanes (start → mid → endgame) instead of one long line.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'pack', 'config', 'betterquesting', 'DefaultQuests.json')

// ---- low-level NBT-JSON builders -----------------------------------------

function item(id, count = 1, dmg = 0) {
  return { 'id:8': id, 'Count:3': count, 'Damage:2': dmg, 'OreDict:8': '' }
}
function retrievalTask(itemId, count) {
  return {
    'taskID:8': 'bq_standard:retrieval',
    'index:3': 0,
    'partialMatch:1': 1,
    'ignoreNBT:1': 1,
    'consume:1': 0,
    'groupDetect:1': 0,
    'autoConsume:1': 0,
    'requiredItems:9': { '0:10': { ...item(itemId, count, 32767) } }
  }
}
function checkTask() {
  return { 'taskID:8': 'bq_standard:checkbox', 'index:3': 0 }
}
function xpReward(amount) {
  return { 'rewardID:8': 'bq_standard:xp', 'index:3': 0, 'amount:3': amount, 'levels:1': 0 }
}
function itemReward(id, count = 1) {
  return {
    'rewardID:8': 'bq_standard:item', 'index:3': 0,
    'rewards:9': { '0:10': item(id, count) }
  }
}
function questProperties(name, desc, iconId) {
  return {
    'betterquesting:10': {
      'snd_complete:8': 'minecraft:entity.player.levelup',
      'snd_update:8': 'minecraft:entity.player.levelup',
      'icon:10': item(iconId),
      'name:8': name,
      'desc:8': desc,
      'ismain:1': 0, 'issilent:1': 0, 'lockedprogress:1': 0,
      'simultaneous:1': 0, 'globalshare:1': 0,
      'questlogic:8': 'AND', 'tasklogic:8': 'AND',
      'repeat_relative:1': 1, 'repeattime:3': -1,
      'partysinglereward:1': 0, 'autoclaim:1': 0,
      'visibility:8': 'NORMAL'
    }
  }
}
function lineProperties(name, desc) {
  return {
    'betterquesting:10': { 'name:8': name, 'desc:8': desc, 'visibility:8': 'NORMAL' }
  }
}

// ---- catalog -------------------------------------------------------------
// Quest tuple: [name, desc, iconId, count]
//   count > 0 → collect N of iconId
//   count === 0 → checkbox

// ICON shortcuts to avoid retyping "minecraft:"
const MC = (id) => `minecraft:${id}`

// Sections grouped by chapter.
const CHAPTERS = [
  {
    title: 'I · Старт',
    desc: 'Базовое выживание: дерево, шахта, броня, базовая магия и Незер.',
    icon: MC('log'),
    rewardItem: MC('iron_ingot'),
    sections: [
      {
        name: 'Лес и инструменты',
        quests: [
          ['Срубить дерево', 'Получи 16 брёвен.', MC('log'), 16],
          ['Доски', 'Скрафти 16 досок.', MC('planks'), 16],
          ['Палки', 'Скрафти 8 палок.', MC('stick'), 8],
          ['Верстак', 'Поставь верстак.', MC('crafting_table'), 1],
          ['Дерев. кирка', '', MC('wooden_pickaxe'), 1],
          ['Дерев. лопата', '', MC('wooden_shovel'), 1],
          ['Дерев. меч', '', MC('wooden_sword'), 1],
          ['Дерев. топор', '', MC('wooden_axe'), 1],
          ['Камень', 'Накопай 32 булыжника.', MC('cobblestone'), 32],
          ['Кам. кирка', '', MC('stone_pickaxe'), 1],
          ['Кам. меч', '', MC('stone_sword'), 1],
          ['Печь', '', MC('furnace'), 1],
          ['Уголь', '', MC('coal'), 16],
          ['Факелы', '', MC('torch'), 32],
          ['Сундук', '', MC('chest'), 2],
          ['Лестница', '', MC('ladder'), 8],
          ['Дерев. дверь', '', MC('wooden_door'), 1]
        ]
      },
      {
        name: 'Железо и алмазы',
        quests: [
          ['Железная руда', 'Добудь 8 железной руды.', MC('iron_ore'), 8],
          ['Железный слиток', '', MC('iron_ingot'), 16],
          ['Железная кирка', '', MC('iron_pickaxe'), 1],
          ['Железный меч', '', MC('iron_sword'), 1],
          ['Железная лопата', '', MC('iron_shovel'), 1],
          ['Железный топор', '', MC('iron_axe'), 1],
          ['Железный шлем', '', MC('iron_helmet'), 1],
          ['Железн. нагрудник', '', MC('iron_chestplate'), 1],
          ['Железн. поножи', '', MC('iron_leggings'), 1],
          ['Железн. ботинки', '', MC('iron_boots'), 1],
          ['Ведро', '', MC('bucket'), 1],
          ['Ведро воды', '', MC('water_bucket'), 1],
          ['Алмазная руда', 'Спустись на y=12.', MC('diamond_ore'), 2],
          ['Алмаз', '', MC('diamond'), 4],
          ['Алмазная кирка', '', MC('diamond_pickaxe'), 1],
          ['Алмазный меч', '', MC('diamond_sword'), 1],
          ['Алмазн. шлем', '', MC('diamond_helmet'), 1],
          ['Алмазн. нагрудник', '', MC('diamond_chestplate'), 1],
          ['Алмазн. поножи', '', MC('diamond_leggings'), 1],
          ['Алмазн. ботинки', '', MC('diamond_boots'), 1]
        ]
      },
      {
        name: 'Еда и сон',
        quests: [
          ['Пшеница', 'Собери 16.', MC('wheat'), 16],
          ['Хлеб', '', MC('bread'), 8],
          ['Морковь', '', MC('carrot'), 8],
          ['Картофель', '', MC('potato'), 8],
          ['Свёкла', '', MC('beetroot'), 4],
          ['Печёный картофель', '', MC('baked_potato'), 4],
          ['Тыква', '', MC('pumpkin'), 4],
          ['Арбуз', '', MC('melon_block'), 1],
          ['Яблоко', '', MC('apple'), 4],
          ['Золотое яблоко', '', MC('golden_apple'), 1],
          ['Шерсть', '', MC('wool'), 8],
          ['Кровать', '', MC('bed'), 1],
          ['Книга', '', MC('book'), 4],
          ['Книжная полка', '', MC('bookshelf'), 15],
          ['Стол зачаровани', '', MC('enchanting_table'), 1],
          ['Бутылочка опыта', '', MC('experience_bottle'), 1]
        ]
      },
      {
        name: 'Незер и Энд',
        quests: [
          ['Обсидиан', '', MC('obsidian'), 14],
          ['Кремень и сталь', '', MC('flint_and_steel'), 1],
          ['Адский камень', '', MC('netherrack'), 16],
          ['Адский кварц', '', MC('quartz'), 16],
          ['Светопыль', '', MC('glowstone'), 8],
          ['Магма-крем', '', MC('magma_cream'), 4],
          ['Огненный стержень', '', MC('blaze_rod'), 4],
          ['Огненный порошок', '', MC('blaze_powder'), 8],
          ['Незер-бородавка', '', MC('nether_wart'), 8],
          ['Варочная стойка', '', MC('brewing_stand'), 1],
          ['Слёзы гаста', '', MC('ghast_tear'), 1],
          ['Звезда Незера', 'Победи Иссушителя.', MC('nether_star'), 1],
          ['Эндер-жемчуг', '', MC('ender_pearl'), 12],
          ['Око Эндера', '', MC('ender_eye'), 12],
          ['Эндерит', 'В Энде.', MC('end_stone'), 16],
          ['Хорус-фрукт', '', MC('chorus_fruit'), 4],
          ['Шалкер-раковина', '', MC('shulker_shell'), 2],
          ['Дракон. яйцо', '', MC('dragon_egg'), 1],
          ['Элитра', '', MC('elytra'), 1]
        ]
      }
    ]
  },

  {
    title: 'II · Хозяйство',
    desc: 'Фермы растений и животных, готовка.',
    icon: MC('wheat'),
    rewardItem: MC('bread'),
    sections: [
      {
        name: 'Земледелие',
        quests: [
          ['Деревянная мотыга', '', MC('wooden_hoe'), 1],
          ['Каменная мотыга', '', MC('stone_hoe'), 1],
          ['Железная мотыга', '', MC('iron_hoe'), 1],
          ['Алмазная мотыга', '', MC('diamond_hoe'), 1],
          ['Семена пшеницы', '', MC('wheat_seeds'), 4],
          ['Пшеница ×64', '', MC('wheat'), 64],
          ['Семена арбуза', '', MC('melon_seeds'), 1],
          ['Семена тыквы', '', MC('pumpkin_seeds'), 1],
          ['Сахарный тростник', '', MC('reeds'), 16],
          ['Сахар', '', MC('sugar'), 16],
          ['Какао-бобы', '', MC('dye'), 16],
          ['Торт', '', MC('cake'), 1],
          ['Печенье', '', MC('cookie'), 16],
          ['Тыквенный пирог', '', MC('pumpkin_pie'), 4],
          ['Грибной суп', '', MC('mushroom_stew'), 4],
          ['Сено', '', MC('hay_block'), 4],
          ['Костная мука', '', MC('dye'), 32],
          ['Цветочный горшок', '', MC('flower_pot'), 1]
        ]
      },
      {
        name: 'Скотоводство',
        quests: [
          ['Сырое мясо', '', MC('porkchop'), 8],
          ['Жареная свинина', '', MC('cooked_porkchop'), 8],
          ['Сырая говядина', '', MC('beef'), 8],
          ['Стейк', '', MC('cooked_beef'), 8],
          ['Курица', '', MC('chicken'), 8],
          ['Жареная курица', '', MC('cooked_chicken'), 8],
          ['Сырой кролик', '', MC('rabbit'), 4],
          ['Тушёный кролик', '', MC('rabbit_stew'), 2],
          ['Сырая баранина', '', MC('mutton'), 8],
          ['Жареная баранина', '', MC('cooked_mutton'), 8],
          ['Яйцо', '', MC('egg'), 16],
          ['Ведро молока', '', MC('milk_bucket'), 1],
          ['Кожа', '', MC('leather'), 8],
          ['Перья', '', MC('feather'), 8],
          ['Шерсть ×16', '', MC('wool'), 16],
          ['Кость', '', MC('bone'), 16],
          ['Седло', '', MC('saddle'), 1],
          ['Бирка имени', '', MC('name_tag'), 1],
          ['Поводок', '', MC('lead'), 2]
        ]
      },
      {
        name: 'Рыбалка',
        quests: [
          ['Удочка', '', MC('fishing_rod'), 1],
          ['Сырая рыба', '', MC('fish'), 8],
          ['Жареная рыба', '', MC('cooked_fish'), 4],
          ['Сырой лосось', '', MC('fish'), 4],
          ['Зелье удачи рыбака', '', MC('experience_bottle'), 1]
        ]
      },
      {
        name: 'Строительство и декор',
        quests: [
          ['Стекло', '', MC('glass'), 16],
          ['Стеклянная панель', '', MC('glass_pane'), 16],
          ['Цвет. стекло', '', MC('stained_glass'), 4],
          ['Кирпич', '', MC('brick_block'), 8],
          ['Камн. кирпич', '', MC('stonebrick'), 16],
          ['Песчаник', '', MC('sandstone'), 16],
          ['Кварц. блок', '', MC('quartz_block'), 8],
          ['Глоустоун', '', MC('glowstone'), 4],
          ['Цвет. ковёр', '', MC('carpet'), 4],
          ['Цвет. бетон', '', MC('concrete'), 8],
          ['Цветной светильник', '', MC('redstone_lamp'), 4],
          ['Витражная книга', '', MC('book'), 1]
        ]
      }
    ]
  },

  {
    title: 'III · Технологии',
    desc: 'IC2, Mekanism, Thermal, BuildCraft, Forestry, Railcraft.',
    icon: MC('redstone'),
    rewardItem: MC('redstone_block'),
    sections: [
      {
        name: 'Базовая электрика',
        quests: [
          ['Редстоун', '', MC('redstone'), 32],
          ['Блок редстоуна', '', MC('redstone_block'), 4],
          ['Редстоун-факел', '', MC('redstone_torch'), 8],
          ['Повторитель', '', MC('repeater'), 4],
          ['Компаратор', '', MC('comparator'), 4],
          ['Поршень', '', MC('piston'), 4],
          ['Липкий поршень', '', MC('sticky_piston'), 4],
          ['Кнопка', '', MC('wooden_button'), 4],
          ['Рычаг', '', MC('lever'), 4],
          ['Воронка', '', MC('hopper'), 4],
          ['Раздатчик', '', MC('dispenser'), 1],
          ['Капельник', '', MC('dropper'), 1],
          ['Наблюдатель', '', MC('observer'), 2],
          ['Излучатель света', '', MC('redstone_lamp'), 4]
        ]
      },
      {
        name: 'IC2 — старт',
        quests: [
          ['Резиновое дерево', 'Найти и срубить.', MC('log'), 0],
          ['Treetap (IC2)', 'Скрафти treetap.', MC('stick'), 0],
          ['Резина', 'Получи резину.', MC('slime_ball'), 0],
          ['Изолированный кабель', '', MC('stick'), 0],
          ['RE Battery', '', MC('redstone'), 0],
          ['Электронная схема', '', MC('redstone'), 0],
          ['Генератор IC2', '', MC('furnace'), 0],
          ['BatBox', '', MC('redstone_block'), 0],
          ['Macerator', 'Дробитель руды.', MC('iron_pickaxe'), 0],
          ['Печь IC2', '', MC('furnace'), 0],
          ['Компрессор', '', MC('iron_block'), 0],
          ['Экстрактор', '', MC('bucket'), 0],
          ['Гаечный ключ', '', MC('iron_pickaxe'), 0],
          ['Резиновые сапоги', '', MC('leather_boots'), 0],
          ['Шахтёрский шлем', '', MC('iron_helmet'), 0],
          ['Соларная панель', '', MC('daylight_detector'), 0],
          ['Ветрогенератор', '', MC('iron_block'), 0],
          ['Геотермальный', '', MC('lava_bucket'), 0],
          ['Ядерный реактор', 'Опасно.', MC('nether_star'), 0]
        ]
      },
      {
        name: 'IC2 — продвинутый',
        quests: [
          ['Алмазная дрель', '', MC('diamond_pickaxe'), 0],
          ['Чейнсо', '', MC('diamond_axe'), 0],
          ['Электрический хор', '', MC('iron_hoe'), 0],
          ['Lap-Pack', '', MC('iron_chestplate'), 0],
          ['NanoSuit шлем', '', MC('iron_helmet'), 0],
          ['NanoSuit нагрудник', '', MC('iron_chestplate'), 0],
          ['NanoSuit поножи', '', MC('iron_leggings'), 0],
          ['NanoSuit ботинки', '', MC('iron_boots'), 0],
          ['Quantum шлем', '', MC('diamond_helmet'), 0],
          ['Quantum нагрудник', '', MC('diamond_chestplate'), 0],
          ['Quantum поножи', '', MC('diamond_leggings'), 0],
          ['Quantum ботинки', '', MC('diamond_boots'), 0],
          ['Иридиевая пластина', '', MC('iron_ingot'), 0],
          ['Магнитный жезл', '', MC('stick'), 0]
        ]
      },
      {
        name: 'Mekanism',
        quests: [
          ['Osmium Ingot', '', MC('iron_ingot'), 0],
          ['Energy Tablet', '', MC('redstone'), 0],
          ['Energy Cube Basic', '', MC('redstone_block'), 0],
          ['Universal Cable', '', MC('redstone'), 0],
          ['Configurator', '', MC('iron_pickaxe'), 0],
          ['Atomic Disassembler', '', MC('diamond_pickaxe'), 0],
          ['Enriched Alloy', '', MC('iron_ingot'), 0],
          ['Reinforced Alloy', '', MC('iron_block'), 0],
          ['Atomic Alloy', '', MC('diamond'), 0],
          ['Crusher', '', MC('furnace'), 0],
          ['Enrichment Chamber', '', MC('iron_block'), 0],
          ['Purification Chamber', '', MC('iron_block'), 0],
          ['Chemical Injection', '', MC('iron_block'), 0],
          ['Digital Miner', 'Полу-автокарьер.', MC('iron_pickaxe'), 0],
          ['Mekasuit Helmet', '', MC('iron_helmet'), 0],
          ['Mekasuit Chest', '', MC('iron_chestplate'), 0],
          ['Mekasuit Legs', '', MC('iron_leggings'), 0],
          ['Mekasuit Boots', '', MC('iron_boots'), 0],
          ['Polonium Ingot', '', MC('iron_ingot'), 0],
          ['Robit', 'Питомец-помощник.', MC('emerald'), 0]
        ]
      },
      {
        name: 'Thermal Series',
        quests: [
          ['Tin Ingot', '', MC('iron_ingot'), 0],
          ['Copper Ingot', '', MC('iron_ingot'), 0],
          ['Lead Ingot', '', MC('iron_ingot'), 0],
          ['Silver Ingot', '', MC('iron_ingot'), 0],
          ['Bronze', '', MC('iron_ingot'), 0],
          ['Electrum', '', MC('gold_ingot'), 0],
          ['Invar', '', MC('iron_ingot'), 0],
          ['Steel Casing', '', MC('iron_block'), 0],
          ['Steam Dynamo', '', MC('furnace'), 0],
          ['Magmatic Dynamo', '', MC('lava_bucket'), 0],
          ['Compression Dynamo', '', MC('iron_block'), 0],
          ['Redstone Furnace', '', MC('furnace'), 0],
          ['Pulverizer', '', MC('iron_pickaxe'), 0],
          ['Induction Smelter', '', MC('iron_ingot'), 0],
          ['Sawmill', '', MC('iron_axe'), 0],
          ['Energy Cell Basic', '', MC('redstone_block'), 0],
          ['Energy Cell Hardened', '', MC('redstone_block'), 0],
          ['Energy Cell Resonant', '', MC('emerald_block'), 0],
          ['Energy Duct', '', MC('redstone'), 0],
          ['Fluid Duct', '', MC('water_bucket'), 0],
          ['Item Duct', '', MC('hopper'), 0],
          ['Tesseract', '', MC('ender_eye'), 0]
        ]
      },
      {
        name: 'BuildCraft & Forestry',
        quests: [
          ['Redstone Engine', '', MC('redstone'), 0],
          ['Stirling Engine', '', MC('coal_block'), 0],
          ['Combustion Engine', '', MC('lava_bucket'), 0],
          ['Quarry', '', MC('iron_pickaxe'), 0],
          ['Filler', '', MC('iron_block'), 0],
          ['Pump', '', MC('water_bucket'), 0],
          ['Wooden Pipe', '', MC('planks'), 0],
          ['Iron Pipe', '', MC('iron_ingot'), 0],
          ['Gold Pipe', '', MC('gold_ingot'), 0],
          ['Diamond Pipe', '', MC('diamond'), 0],
          ['Forestry Apiary', '', MC('honeycomb'), 0],
          ['Tree Analyzer', '', MC('sapling'), 0],
          ['Common Bee', '', MC('sugar'), 0],
          ['Cultivated Bee', '', MC('wheat'), 0],
          ['Noble Bee', '', MC('emerald'), 0],
          ['Imperial Bee', '', MC('gold_ingot'), 0],
          ['Industrious Bee', '', MC('iron_ingot'), 0],
          ['Bronze Pickaxe (F)', '', MC('iron_pickaxe'), 0],
          ['Carpenter', '', MC('crafting_table'), 0],
          ['Centrifuge', '', MC('honeycomb'), 0]
        ]
      },
      {
        name: 'Railcraft',
        quests: [
          ['Стальной слиток (RC)', '', MC('iron_ingot'), 0],
          ['Стальная кирка', '', MC('iron_pickaxe'), 0],
          ['Литейная печь', '', MC('furnace'), 0],
          ['Локомотив паровой', '', MC('minecart'), 0],
          ['Локомотив электр.', '', MC('minecart'), 0],
          ['Усиленный рельс', '', MC('rail'), 0],
          ['Скоростной рельс', '', MC('golden_rail'), 0],
          ['Сигнал-блок', '', MC('redstone'), 0],
          ['Тележка-сундук', '', MC('chest_minecart'), 0],
          ['Тележка-печь', '', MC('furnace_minecart'), 0],
          ['Большой котёл', '', MC('cauldron'), 0],
          ['Стрелка автомат', '', MC('rail'), 0],
          ['Полная ж/д сеть', '', MC('rail'), 0]
        ]
      },
      {
        name: 'Gravisuite & Solar',
        quests: [
          ['Adv Solar Basic', '', MC('daylight_detector'), 0],
          ['Adv Solar Improved', '', MC('daylight_detector'), 0],
          ['Adv Solar Hybrid', '', MC('daylight_detector'), 0],
          ['Adv Solar Ultimate', '', MC('daylight_detector'), 0],
          ['Adv Solar Quantum', '', MC('nether_star'), 0],
          ['GraviTool', '', MC('iron_pickaxe'), 0],
          ['Gravichestplate', '', MC('diamond_chestplate'), 0],
          ['Advanced Diamond Drill', '', MC('diamond_pickaxe'), 0],
          ['Compact Solar Lv1', '', MC('daylight_detector'), 0],
          ['Compact Solar Lv4', '', MC('daylight_detector'), 0]
        ]
      }
    ]
  },

  {
    title: 'IV · Applied Energistics',
    desc: 'Цифровое хранение, автокрафт, беспроводная сеть.',
    icon: MC('diamond'),
    rewardItem: MC('diamond'),
    sections: [
      {
        name: 'AE2 — старт',
        quests: [
          ['Сертус-кварц', '', MC('quartz'), 0],
          ['Чистый сертус', '', MC('quartz'), 0],
          ['Очищенный алмаз', '', MC('diamond'), 0],
          ['Очищенный кварц', '', MC('quartz'), 0],
          ['Сертус-пыль', '', MC('redstone'), 0],
          ['Сертусовая печать', '', MC('paper'), 0],
          ['Алмазная печать', '', MC('paper'), 0],
          ['Силикон-печать', '', MC('paper'), 0],
          ['Печатный процессор', '', MC('iron_ingot'), 0],
          ['Логический процессор', '', MC('redstone'), 0],
          ['Калькуляц. процессор', '', MC('quartz'), 0],
          ['Инжиниринг-процессор', '', MC('diamond'), 0],
          ['ME Контроллер', '', MC('iron_block'), 0],
          ['ME Drive', '', MC('chest'), 0],
          ['ME Накопитель 1k', '', MC('redstone'), 0],
          ['ME Накопитель 4k', '', MC('redstone_block'), 0],
          ['ME Накопитель 16k', '', MC('gold_block'), 0],
          ['ME Накопитель 64k', '', MC('diamond_block'), 0]
        ]
      },
      {
        name: 'AE2 — автокрафт',
        quests: [
          ['ME Терминал', '', MC('crafting_table'), 0],
          ['ME Терминал крафта', '', MC('crafting_table'), 0],
          ['ME Терминал паттернов', '', MC('paper'), 0],
          ['ME Авто-крафт CPU', '', MC('iron_block'), 0],
          ['ME 16-CPU', '', MC('iron_block'), 0],
          ['ME Кодировщик паттернов', '', MC('crafting_table'), 0],
          ['Молекул. соединитель', '', MC('ender_pearl'), 0],
          ['ME Интерфейс', '', MC('iron_block'), 0],
          ['Pattern Provider', '', MC('paper'), 0],
          ['Level Emitter', '', MC('redstone_torch'), 0],
          ['Importer', '', MC('hopper'), 0],
          ['Exporter', '', MC('dropper'), 0],
          ['Storage Bus', '', MC('chest'), 0]
        ]
      },
      {
        name: 'AE2 — беспроводной',
        quests: [
          ['Wireless Terminal', '', MC('ender_eye'), 0],
          ['Wireless Crafting (WTLib)', '', MC('crafting_table'), 0],
          ['Wireless Pattern', '', MC('paper'), 0],
          ['Magnet Card', '', MC('iron_ingot'), 0],
          ['Booster Card', '', MC('redstone'), 0],
          ['Wireless Beacon', '', MC('beacon'), 0],
          ['ME Quantum Ring', '', MC('ender_eye'), 0],
          ['ME Quantum Link', '', MC('nether_star'), 0]
        ]
      }
    ]
  },

  {
    title: 'V · Магия',
    desc: 'Thaumcraft, Botania, Blood Magic, Mystcraft.',
    icon: MC('nether_star'),
    rewardItem: MC('experience_bottle'),
    sections: [
      {
        name: 'Thaumcraft — старт',
        quests: [
          ['Salis Mundus', 'Бросить вещи в воду рядом с травой.', 'thaumcraft:salis_mundus', 1],
          ['Thaumonomicon', 'Использовать Salis Mundus на книжной полке.', 'thaumcraft:thaumonomicon', 1],
          ['Аркан-верстак', '', 'thaumcraft:arcane_workbench', 1],
          ['Thaumometer', '', 'thaumcraft:thaumometer', 1],
          ['Жезл базовый', '', MC('stick'), 0],
          ['Phial — флакон', '', 'thaumcraft:phial', 1],
          ['Goggles of Revealing', '', 'thaumcraft:goggles', 1],
          ['Research Table', '', 'thaumcraft:research_table', 1],
          ['Scribing Tools', '', 'thaumcraft:scribing_tools', 1],
          ['Чернила Таумкрафта', '', 'thaumcraft:ink', 4],
          ['Crucible', '', 'thaumcraft:crucible', 1],
          ['Сканировать камень', 'Используй тауметр.', MC('cobblestone'), 0],
          ['Сканировать живот.', '', MC('porkchop'), 0],
          ['Salis Mundus ×8', '', 'thaumcraft:salis_mundus', 8],
          ['Plate Таумкрафта', '', 'thaumcraft:plate', 4]
        ]
      },
      {
        name: 'Thaumcraft — продвинутый',
        quests: [
          ['Infusion Matrix', '', 'thaumcraft:infusion_matrix', 1],
          ['Расстановка 4 столбов', '', MC('stone_pressure_plate'), 0],
          ['Расстановка 8 столбов', '', MC('stone_pressure_plate'), 0],
          ['Первая инфузия', '', MC('paper'), 0],
          ['Робе Аркан', '', MC('iron_chestplate'), 0],
          ['Голем — соломенный', '', MC('hay_block'), 0],
          ['Голем — каменный', '', MC('stone'), 0],
          ['Голем — железный', '', MC('iron_block'), 0],
          ['Голем — алмазный', '', MC('diamond_block'), 0],
          ['Стержень Greatwood', '', MC('stick'), 0],
          ['Стержень Silverwood', '', MC('stick'), 0],
          ['Стержень Primal', '', MC('nether_star'), 0],
          ['Wand of Equal Trade', '', MC('stick'), 0],
          ['Aspect Counter', '', MC('compass'), 0],
          ['Pure Node — найти', '', MC('beacon'), 0]
        ]
      },
      {
        name: 'Botania — старт',
        quests: [
          ['Botania Lexicon', '', 'botania:lexicon', 1],
          ['Mystical Flowers', '', MC('poppy'), 16],
          ['Pure Daisy', '', MC('poppy'), 0],
          ['Livingwood', '', MC('log'), 0],
          ['Livingrock', '', MC('stone'), 0],
          ['Apothecary', '', MC('flower_pot'), 0],
          ['Mana Spreader', '', MC('stick'), 0],
          ['Mana Pool', '', MC('stone_slab'), 0],
          ['Endoflame', 'Цветок мана из угля.', MC('coal'), 0],
          ['Daybloom', '', MC('yellow_flower'), 0],
          ['Hydroangeas', '', MC('water_bucket'), 0],
          ['Munchdew', '', MC('vine'), 0],
          ['Kekimurus', '', MC('cake'), 0],
          ['Gourmaryllis', '', MC('cooked_beef'), 0],
          ['Thermalily', '', MC('lava_bucket'), 0],
          ['Rosa Arcana', '', MC('experience_bottle'), 0],
          ['Diluted Mana Pool', '', MC('stone_slab'), 0]
        ]
      },
      {
        name: 'Botania — продвинутый',
        quests: [
          ['Terra Steel', '', MC('iron_ingot'), 0],
          ['Terra Pickaxe', '', MC('diamond_pickaxe'), 0],
          ['Terra Sword', '', MC('diamond_sword'), 0],
          ['Terra Helm', '', MC('diamond_helmet'), 0],
          ['Terra Chest', '', MC('diamond_chestplate'), 0],
          ['Terra Legs', '', MC('diamond_leggings'), 0],
          ['Terra Boots', '', MC('diamond_boots'), 0],
          ['Elven Portal', '', MC('end_portal_frame'), 0],
          ['Elven Quartz', '', MC('quartz'), 0],
          ['Dragonstone', '', MC('emerald'), 0],
          ['Gaia Ritual', '', MC('beacon'), 0],
          ['Gaia Spirit ×4', '', MC('nether_star'), 0],
          ['Gaia Hardmode', '', MC('nether_star'), 0],
          ['Ring of Loki', '', MC('gold_ingot'), 0],
          ['Ring of Magnetization', '', MC('iron_ingot'), 0],
          ['Crown of Gaia', '', MC('golden_helmet'), 0]
        ]
      },
      {
        name: 'Blood Magic',
        quests: [
          ['Жертвенный кинжал', '', MC('iron_sword'), 0],
          ['Blood Altar T1', '', MC('stone_slab'), 0],
          ['Кровь — 1000 LP', '', MC('redstone'), 0],
          ['Кровь — 5000 LP', '', MC('redstone_block'), 0],
          ['Кровь — 10000 LP', '', MC('redstone_block'), 0],
          ['Blood Altar T2', '', MC('iron_block'), 0],
          ['Blood Altar T3', '', MC('gold_block'), 0],
          ['Blood Altar T4', '', MC('diamond_block'), 0],
          ['Blood Altar T5', '', MC('emerald_block'), 0],
          ['Weak Blood Orb', '', MC('redstone'), 0],
          ['Apprentice Orb', '', MC('redstone'), 0],
          ['Magician Orb', '', MC('redstone'), 0],
          ['Master Orb', '', MC('redstone'), 0],
          ['Archmage Orb', '', MC('redstone'), 0],
          ['Transcendent Orb', '', MC('nether_star'), 0],
          ['Sigil of Holding', '', MC('iron_ingot'), 0],
          ['Sigil of Water', '', MC('water_bucket'), 0],
          ['Sigil of Air', '', MC('feather'), 0],
          ['Sigil of Fire', '', MC('blaze_powder'), 0],
          ['Ritual Diviner', '', MC('stick'), 0],
          ['Ritual: Crystals', '', MC('quartz'), 0],
          ['Ritual: Water', '', MC('water_bucket'), 0],
          ['Ritual: Lava', '', MC('lava_bucket'), 0],
          ['Demonic Will', '', MC('ghast_tear'), 0],
          ['Sentient Sword', '', MC('iron_sword'), 0],
          ['Sentient Bow', '', MC('bow'), 0],
          ['Sanguine Armor (set)', '', MC('iron_chestplate'), 0]
        ]
      },
      {
        name: 'Mystcraft',
        quests: [
          ['Notebook', '', MC('book'), 0],
          ['Ink Vial', '', MC('glass_bottle'), 0],
          ['Writing Desk', '', MC('crafting_table'), 0],
          ['Descriptive Book', '', MC('book'), 0],
          ['Linking Book', '', MC('book'), 0],
          ['Forest Biome', '', MC('sapling'), 0],
          ['Desert Biome', '', MC('sand'), 0],
          ['Ocean Biome', '', MC('water_bucket'), 0],
          ['Stable World 100%', '', MC('emerald'), 0],
          ['Возврат через книгу', '', MC('book'), 0]
        ]
      }
    ]
  },

  {
    title: 'VI · Приключения',
    desc: 'Twilight Forest, Aether, Betweenlands, Atum, DivineRPG.',
    icon: MC('diamond_sword'),
    rewardItem: MC('emerald'),
    sections: [
      {
        name: 'Twilight Forest',
        quests: [
          ['Цветы 2×2', '', MC('poppy'), 4],
          ['Бриллиант для портала', '', MC('diamond'), 1],
          ['Войти в Twilight Forest', '', MC('vine'), 0],
          ['Naga Court', '', MC('mossy_cobblestone'), 0],
          ['Победить Naga', '', MC('emerald'), 0],
          ['Naga Scale ×4', '', MC('quartz'), 0],
          ['Lich Tower', '', MC('iron_block'), 0],
          ['Победить Twilight Lich', '', MC('emerald'), 0],
          ['Minoshroom', '', MC('mob_spawner'), 0],
          ['Победить Minoshroom', '', MC('emerald'), 0],
          ['Hydra Lair', '', MC('lava_bucket'), 0],
          ['Победить Hydra', '', MC('emerald'), 0],
          ['Knight Phantom', '', MC('iron_helmet'), 0],
          ['Победить Phantom', '', MC('emerald'), 0],
          ['Ur-Ghast', '', MC('ghast_tear'), 0],
          ['Победить Ur-Ghast', '', MC('emerald'), 0],
          ['Alpha Yeti', '', MC('snowball'), 0],
          ['Победить Alpha Yeti', '', MC('emerald'), 0],
          ['Snow Queen', '', MC('snow_block'), 0],
          ['Победить Snow Queen', '', MC('emerald'), 0],
          ['Final Castle', '', MC('beacon'), 0]
        ]
      },
      {
        name: 'Aether',
        quests: [
          ['Glinted Portal', '', MC('glowstone_dust'), 0],
          ['Войти в Aether', '', MC('experience_bottle'), 0],
          ['Blue Aercloud', '', MC('snow_block'), 0],
          ['Cold Aercloud', '', MC('ice'), 0],
          ['Holystone', '', MC('stone'), 0],
          ['Sentry — найти', '', MC('redstone'), 0],
          ['Slider — победить', '', MC('emerald'), 0],
          ['Bronze Dungeon', '', MC('iron_block'), 0],
          ['Silver Dungeon', '', MC('iron_block'), 0],
          ['Gold Dungeon', '', MC('gold_block'), 0],
          ['Valkyrie', '', MC('iron_sword'), 0],
          ['Valkyrie Queen', '', MC('diamond_sword'), 0],
          ['Sun Spirit', '', MC('blaze_powder'), 0],
          ['Moa — приручить', '', MC('saddle'), 0]
        ]
      },
      {
        name: 'Betweenlands',
        quests: [
          ['Swamp Talisman', '', MC('emerald'), 0],
          ['Активировать портал', '', MC('vine'), 0],
          ['Войти в Betweenlands', '', MC('vine'), 0],
          ['Sludgey Heart', '', MC('slime_ball'), 0],
          ['Wisp — поймать', '', MC('glass_bottle'), 0],
          ['Anadia (рыба)', '', MC('fish'), 0],
          ['Spirit Tree', '', MC('sapling'), 0],
          ['Spirit Tree Heart', '', MC('emerald'), 0],
          ['Resin Boots', '', MC('leather_boots'), 0],
          ['Tar Beast', '', MC('coal'), 0],
          ['Dread Lord', '', MC('emerald'), 0]
        ]
      },
      {
        name: 'Atum 2',
        quests: [
          ['Скарабей', '', MC('emerald'), 0],
          ['Песчаниковый портал', '', MC('sandstone'), 0],
          ['Войти в Atum', '', MC('sand'), 0],
          ['Пирамида', '', MC('sandstone'), 0],
          ['Мумия', '', MC('rotten_flesh'), 0],
          ['Шакал-страж', '', MC('iron_sword'), 0],
          ['Скорпион', '', MC('spider_eye'), 0],
          ['Фараон', '', MC('gold_ingot'), 0],
          ['Анхский крест', '', MC('gold_ingot'), 0],
          ['Атум-алмаз', '', MC('diamond'), 0],
          ['Полное прохождение', '', MC('emerald'), 0]
        ]
      },
      {
        name: 'DivineRPG',
        quests: [
          ['Eden', 'Стартовый мир.', MC('sapling'), 0],
          ['Wildwood', '', MC('log'), 0],
          ['Apalachia', '', MC('experience_bottle'), 0],
          ['Skythern', '', MC('end_stone'), 0],
          ['Mortum', '', MC('soul_sand'), 0],
          ['Iceika', '', MC('snow_block'), 0],
          ['Vethea', '', MC('nether_star'), 0],
          ['Eden Boss: Madivel', '', MC('emerald'), 0],
          ['Hive Queen', '', MC('emerald'), 0],
          ['Densos', '', MC('emerald'), 0],
          ['King of Scorchers', '', MC('blaze_rod'), 0],
          ['Vamacheron', '', MC('emerald'), 0],
          ['Reyvor', '', MC('iron_block'), 0],
          ['The Twins', '', MC('emerald'), 0],
          ['Eternal Archer', '', MC('bow'), 0],
          ['Karot', '', MC('emerald'), 0],
          ['Soul Fiend', '', MC('soul_sand'), 0]
        ]
      },
      {
        name: 'MoCreatures',
        quests: [
          ['Львица', '', MC('porkchop'), 0],
          ['Тигр', '', MC('porkchop'), 0],
          ['Кабан', '', MC('porkchop'), 0],
          ['Лама', '', MC('wool'), 0],
          ['Чёрная пантера', '', MC('porkchop'), 0],
          ['Конь — приручить', '', MC('saddle'), 0],
          ['Пегасос', '', MC('feather'), 0],
          ['Единорог', '', MC('emerald'), 0],
          ['Огненный конь', '', MC('blaze_powder'), 0],
          ['Ночной конь', '', MC('coal_block'), 0],
          ['Дельфин', '', MC('water_bucket'), 0]
        ]
      },
      {
        name: 'Roguelike Dungeons',
        quests: [
          ['Найти подземелье', '', MC('iron_block'), 0],
          ['Уровень 1', '', MC('emerald'), 0],
          ['Уровень 2', '', MC('emerald'), 0],
          ['Уровень 3', '', MC('emerald'), 0],
          ['Уровень 4 — Босс', '', MC('diamond'), 0],
          ['Сундук Босса', '', MC('chest'), 0],
          ['Пройти 5 подземелий', '', MC('diamond_block'), 0],
          ['Пройти 10', '', MC('diamond_block'), 0],
          ['Пройти 20', '', MC('emerald_block'), 0],
          ['DungeonTactics артефакт', '', MC('nether_star'), 0]
        ]
      }
    ]
  },

  {
    title: 'VII · Финал',
    desc: 'QoL команды и эндгейм-цели.',
    icon: MC('dragon_egg'),
    rewardItem: MC('nether_star'),
    sections: [
      {
        name: 'QoL команды',
        quests: [
          ['/sethome', '', MC('bed'), 0],
          ['/home', '', MC('compass'), 0],
          ['/spawn', '', MC('compass'), 0],
          ['/rtp', '', MC('ender_pearl'), 0],
          ['/tpa', '', MC('ender_eye'), 0],
          ['/back', '', MC('compass'), 0],
          ['JEI — поиск', '', MC('book'), 0],
          ['JourneyMap', '', MC('map'), 0],
          ['Waila', '', MC('paper'), 0],
          ['Inventory Tweaks', '', MC('chest'), 0]
        ]
      },
      {
        name: 'Эндгейм-цели',
        quests: [
          ['Победа над Драконом', '', MC('dragon_egg'), 0],
          ['Победа над Иссушителем', '', MC('nether_star'), 0],
          ['Полный сет Naga (TF)', '', MC('emerald'), 0],
          ['Все боссы TF', '', MC('emerald_block'), 0],
          ['Sun Spirit Sword', '', MC('diamond_sword'), 0],
          ['Dread Lord — победа', '', MC('emerald_block'), 0],
          ['Все боссы DivineRPG', '', MC('nether_star'), 0],
          ['Гайя Hardmode (Botania)', '', MC('nether_star'), 0],
          ['Полный Mekasuit', '', MC('diamond_chestplate'), 0],
          ['Полная Terra-броня', '', MC('diamond_chestplate'), 0],
          ['Полная Sanguine', '', MC('diamond_chestplate'), 0],
          ['Полный аркан-сет', '', MC('diamond_chestplate'), 0],
          ['Quantum Suit', '', MC('diamond_chestplate'), 0],
          ['ME-сеть автокрафт', '', MC('diamond_block'), 0],
          ['Бесконечная энергия', '', MC('beacon'), 0],
          ['Все измерения', '', MC('ender_eye'), 0],
          ['Voidwalker — победитель', '', MC('nether_star'), 0]
        ]
      }
    ]
  }
]

// ---- layout --------------------------------------------------------------
// Each section is a vertical column. Within a column, quests stack downward
// in groups of 4 with slight horizontal jitter so it looks like a tree, not
// a list. Sections sit side by side horizontally with a gap.

const GRID = 28
const SIZE = 22
const SECTION_W = 5    // grid cells per section
const ROW_GAP = 1.3    // vertical spacing
const HEADER_OFFSET = 1.5 // pad at top of each section

function layoutSection(count, baseX) {
  // 3 quests per row inside a section, wrap downward.
  const COLS = 3
  return Array.from({ length: count }, (_, i) => ({
    x: baseX + (i % COLS) * 1.4,
    y: HEADER_OFFSET + Math.floor(i / COLS) * ROW_GAP
  }))
}

// ---- assembly ------------------------------------------------------------

const questDatabase = {}
const questLines = {}
let globalId = 0
let totalQuests = 0

CHAPTERS.forEach((chapter, chapterIdx) => {
  let sectionBaseX = 0
  const layout = {}
  let layoutIdx = 0

  chapter.sections.forEach((section, secIdx) => {
    const positions = layoutSection(section.quests.length, sectionBaseX)
    const localToGlobal = section.quests.map(() => globalId++)

    section.quests.forEach((q, qIdx) => {
      const [name, descMaybe, iconId, count] = q
      const desc = descMaybe || `${section.name} — этап раздела «${chapter.title}».`
      const finalIcon = iconId || chapter.icon
      const gid = localToGlobal[qIdx]
      const preReqs = qIdx > 0 ? [localToGlobal[qIdx - 1]] : []
      const task = count > 0
        ? { ...retrievalTask(iconId, count), 'index:3': 0 }
        : { ...checkTask(), 'index:3': 0 }
      const reward = (qIdx + 1) % 10 === 0
        ? itemReward(chapter.rewardItem, 4)
        : xpReward(40 + qIdx * 4)

      questDatabase[`${gid}:10`] = {
        'preRequisites:11': preReqs,
        'properties:10': questProperties(`[${section.name}] ${name}`, desc, finalIcon),
        'questID:3': gid,
        'tasks:9': { '0:10': task },
        'rewards:9': { '0:10': { ...reward, 'index:3': 0 } }
      }

      layout[`${layoutIdx}:10`] = {
        'id:3': gid,
        'x:3': Math.round(positions[qIdx].x * GRID),
        'y:3': Math.round(positions[qIdx].y * GRID),
        'sizeX:3': SIZE,
        'sizeY:3': SIZE
      }
      layoutIdx++
    })

    totalQuests += section.quests.length
    sectionBaseX += SECTION_W
  })

  questLines[`${chapterIdx}:10`] = {
    'lineID:3': chapterIdx,
    'order:3': chapterIdx,
    'properties:10': lineProperties(chapter.title, chapter.desc),
    'quests:9': layout
  }

  console.log(`  ${chapter.title}: ${chapter.sections.reduce((a, s) => a + s.quests.length, 0)} quests in ${chapter.sections.length} sections`)
})

const doc = {
  'format:8': '2.0.0',
  'build:8': '3.5.329',
  'questDatabase:9': questDatabase,
  'questLines:9': questLines,
  'questSettings:10': {
    'betterquesting:10': {
      'livesMax:3': 10,
      'livesDef:3': 3,
      'pack_name:8': 'Voidcraft',
      'pack_version:3': 1,
      'editmode:1': 0,
      'hardcore:1': 0,
      'party_enable:1': 1
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(doc, null, 2))
console.log(`Wrote ${OUT}`)
console.log(`Total: ${totalQuests} quests across ${CHAPTERS.length} chapters`)
